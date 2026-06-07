import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { get, getList } from "../lib/api.ts";
import { getCurrentUser, requireClientAuth, saveSession } from "../lib/auth.ts";
import {
  canCreateProject,
  canCreateTasks,
  getProjectRole,
} from "../lib/roles.ts";
import type {
  Activity,
  DashboardData,
  Project,
  Role,
  Task,
} from "../lib/types.ts";
import type { Priority, TaskStatus } from "../lib/types.ts";
import { isCompletedStatus } from "../lib/types.ts";
import Pagination from "../components/Pagination.tsx";
import { Avatar, fmtDate, Icon, Skeleton } from "../components/ui.tsx";
import ProjectCreateModal from "./ProjectCreateModal.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";
import DashboardAnalyticsSnapshot from "./DashboardAnalyticsSnapshot.tsx";
import ExecutiveDashboard from "./ExecutiveDashboard.tsx";
import ActivityHeatmap from "./ActivityHeatmap.tsx";
import WorkloadBalancer from "./WorkloadBalancer.tsx";
import InsightsAssistant from "./InsightsAssistant.tsx";

// ── Cache ──
const cache = {
  data: null as DashboardData | null,
  projects: null as Project[] | null,
  ts: 0,
};
const CACHE_TTL = 30_000;

// ── SVG Progress Ring ──
function ProgressRing({ value, size = 48 }: { value: number; size?: number }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  const color = value >= 100
    ? "var(--success)"
    : value >= 40
    ? "var(--primary)"
    : "var(--warning)";
  return (
    <div class="dash-project-ring-wrap">
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: '"JetBrains Mono", monospace',
          color: "var(--text)",
        }}
      >
        {Math.round(value)}%
      </span>
    </div>
  );
}

// ── Helpers ──
function getRisk(
  project: Project,
): "on_track" | "at_risk" | "delayed" | "completed" {
  if (project.status === "COMPLETED" || (project.progress ?? 0) >= 100) {
    return "completed";
  }
  const created = project.createdAt ? new Date(project.createdAt).getTime() : 0;
  const due = created ? created + 30 * 86400000 : Date.now() + 999 * 86400000;
  const days = Math.ceil((due - Date.now()) / 86400000);
  if (days < 0) return "delayed";
  if ((project.progress ?? 0) < 30 && days < 14) return "at_risk";
  return "on_track";
}

function actionClass(action: string) {
  if (action.includes("create") || action.includes("add")) return "create";
  if (action.includes("complete") || action.includes("done")) return "complete";
  if (action.includes("comment")) return "comment";
  if (action.includes("update") || action.includes("edit")) return "update";
  return "default";
}

const PRIORITY_RANK: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};
const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: "var(--danger)",
  MEDIUM: "var(--warning)",
  LOW: "var(--muted)",
};

// ── Main Component ──
export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<
    { id: string; name: string } | null
  >(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | undefined>(
    getCurrentUser()?.role,
  );
  const [sortField, setSortField] = useState("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  const mountedRef = useRef(true);

  async function load(force = false) {
    requireClientAuth();
    const cached = !force && cache.data && (Date.now() - cache.ts) < CACHE_TTL;
    if (cached) {
      setData(cache.data);
      setProjects(cache.projects ?? []);
      setTasks(cache.data!.myAssignedTasks ?? []);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [dashboard, projectList] = await Promise.all([
        get<DashboardData>("/dashboard").catch(() => null),
        getList<Project>("/projects", { limit: 100 }).catch(() => []),
      ]);
      if (!mountedRef.current) return;
      setData(dashboard);
      setProjects(projectList);
      setTasks(dashboard?.myAssignedTasks ?? []);
      cache.data = dashboard;
      cache.projects = projectList;
      cache.ts = Date.now();
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    const u = getCurrentUser();
    if (u) setCurrentUser({ id: u.id, name: u.name });
    if (!u?.role) {
      get<{ id: string; name: string; email: string; role: Role }>(
        "/auth/me",
      ).then((data) => {
        saveSession({ user: data });
        setCurrentUserRole(data.role);
      }).catch(() => null);
    }
  }, []);

  // ── Derived data ──
  const statusCounts: Record<TaskStatus, number> = data?.taskCountByStatus ??
    data?.tasks?.byStatus ?? { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  const priorityCounts: Record<Priority, number> = data?.taskCountByPriority ??
    data?.tasks?.byPriority ?? { LOW: 0, MEDIUM: 0, HIGH: 0 };
  const taskTotal = data?.tasks?.total ??
    Object.values(statusCounts).reduce((s, v) => s + Number(v || 0), 0);
  const done = Number(statusCounts.COMPLETED || 0);
  const velocity = taskTotal ? Math.round((done / taskTotal) * 100) : 0;
  const urgentCount = Number(priorityCounts.HIGH || 0);
  const actProjects = projects.filter((p) => p.status === "ACTIVE");
  const creatableProjects = projects.filter((p) =>
    canCreateTasks(
      getProjectRole(p, currentUser?.id ?? null),
      p,
      currentUser?.id ?? null,
    )
  );
  const recentActivity = data?.recentActivity ?? [];
  const workloadMax = Math.max(
    1,
    ...(data?.memberWorkload?.map((w) => w.count) ?? []),
  );

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? "Good Morning"
    : hour < 17
    ? "Good Afternoon"
    : "Good Evening";
  const name = currentUser?.name ?? "";
  const totalProjects = projects.length || data?.projects?.total || 0;
  const completionRate = taskTotal ? Math.round((done / taskTotal) * 100) : 0;
  const totalMembers = data?.memberWorkload?.length ?? 0;

  // Sorted + paginated tasks
  const sortedTasks = useMemo(() => {
    const list = (tasks.length ? tasks : data?.overdueTasks ?? []).slice(0, 20);
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "dueDate") {
        cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      } else if (sortField === "priority") {
        cmp = (PRIORITY_RANK[a.priority] ?? 0) -
          (PRIORITY_RANK[b.priority] ?? 0);
      } else if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [tasks, data, sortField, sortDir]);

  const paginated = sortedTasks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedTasks.length / PAGE_SIZE);

  function toggleSort(field: string) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) {
      return (
        <Icon
          name="unfold_more"
          size={14}
          style={{ color: "var(--muted)", verticalAlign: "middle" }}
        />
      );
    }
    return (
      <Icon
        name={sortDir === "asc" ? "expand_less" : "expand_more"}
        size={14}
        style={{ color: "var(--primary)", verticalAlign: "middle" }}
      />
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div class="dash-content">
        <div class="dash-grid">
          <div class="dash-col-3">
            <Skeleton height={110} />
          </div>
          <div class="dash-col-3">
            <Skeleton height={110} />
          </div>
          <div class="dash-col-3">
            <Skeleton height={110} />
          </div>
          <div class="dash-col-3">
            <Skeleton height={110} />
          </div>
          <div class="dash-col-6">
            <Skeleton height={320} />
          </div>
          <div class="dash-col-6">
            <Skeleton height={320} />
          </div>
          <div class="dash-col-6">
            <Skeleton height={280} />
          </div>
          <div class="dash-col-6">
            <Skeleton height={280} />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div class="dash-content">
      {/* ═══ HEADER ═══ */}
      <div class="dash-header">
        <div class="dash-header-left">
          <h1 class="dash-greeting">{greeting}{name ? `, ${name}` : ""}.</h1>
          <p class="dash-greeting-sub">
            Here&apos;s your workspace overview for today.
          </p>
          <div class="dash-summary">
            <span class="dash-summary-chip">
              <Icon name="folder" size={14} />
              <strong>{totalProjects}</strong> Projects
            </span>
            <span class="dash-summary-chip">
              <Icon name="task_alt" size={14} />
              <strong>{taskTotal}</strong> Tasks
            </span>
            <span class="dash-summary-chip">
              <Icon name="group" size={14} />
              <strong>{totalMembers}</strong> Members
            </span>
            <span class="dash-summary-chip">
              <Icon name="check_circle" size={14} />
              <strong>{completionRate}%</strong> Complete
            </span>
          </div>
        </div>
        <div class="dash-header-actions">
          {creatableProjects.length > 0 && (
            <button
              type="button"
              class="dash-btn"
              onClick={() => setTaskOpen(true)}
            >
              <Icon name="add_task" size={16} /> New Task
            </button>
          )}
          {canCreateProject(currentUserRole) && (
            <button
              type="button"
              class="dash-btn dash-btn-primary"
              onClick={() => setProjectOpen(true)}
            >
              <Icon name="add" size={16} /> New Project
            </button>
          )}
        </div>
      </div>

      {/* ═══ EXECUTIVE COMMAND CENTER ═══ */}
      <div class="ecc-hero">
        <div class="ecc-hero-bg" />
        <div class="ecc-hero-content">
          <div class="ecc-hero-primary">
            <div class="ecc-score-ring">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="5"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke={completionRate >= 70
                    ? "#10b981"
                    : completionRate >= 40
                    ? "#f59e0b"
                    : "#ef4444"}
                  strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 34 * (1 - completionRate / 100)
                  }`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  style="transition:stroke-dashoffset 0.8s ease"
                />
              </svg>
              <div
                class="ecc-score-value"
                style={`color:${
                  completionRate >= 70
                    ? "#10b981"
                    : completionRate >= 40
                    ? "#f59e0b"
                    : "#ef4444"
                }`}
              >
                {completionRate}%
              </div>
            </div>
            <div class="ecc-hero-info">
              <div class="ecc-hero-title">Workspace Health</div>
              <div
                class="ecc-hero-status"
                style={`color:${
                  completionRate >= 70
                    ? "#10b981"
                    : completionRate >= 40
                    ? "#f59e0b"
                    : "#ef4444"
                }`}
              >
                {completionRate >= 70
                  ? "On Track"
                  : completionRate >= 40
                  ? "At Risk"
                  : "Critical"}
              </div>
              <div class="ecc-hero-trend">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 10V6z" />
                </svg>
                <span>+12% vs last week</span>
              </div>
            </div>
          </div>
          <div class="ecc-hero-stats">
            <div class="ecc-stat">
              <div
                class="ecc-stat-icon"
                style="background:color-mix(in srgb,var(--primary),transparent 85%);color:var(--primary)"
              >
                <Icon name="folder" size={16} />
              </div>
              <div class="ecc-stat-body">
                <div class="ecc-stat-value">{totalProjects}</div>
                <div class="ecc-stat-label">Projects</div>
              </div>
            </div>
            <div class="ecc-stat">
              <div
                class="ecc-stat-icon"
                style="background:color-mix(in srgb,var(--info),transparent 85%);color:var(--info)"
              >
                <Icon name="task_alt" size={16} />
              </div>
              <div class="ecc-stat-body">
                <div class="ecc-stat-value">{taskTotal}</div>
                <div class="ecc-stat-label">Tasks</div>
              </div>
            </div>
            <div class="ecc-stat">
              <div
                class="ecc-stat-icon"
                style="background:color-mix(in srgb,var(--success),transparent 85%);color:var(--success)"
              >
                <Icon name="check_circle" size={16} />
              </div>
              <div class="ecc-stat-body">
                <div class="ecc-stat-value">{completionRate}%</div>
                <div class="ecc-stat-label">Completed</div>
              </div>
            </div>
            <div class="ecc-stat">
              <div
                class="ecc-stat-icon"
                style="background:color-mix(in srgb,var(--warning),transparent 85%);color:var(--warning)"
              >
                <Icon name="warning" size={16} />
              </div>
              <div class="ecc-stat-body">
                <div class="ecc-stat-value" style="color:var(--warning)">
                  {data?.tasks?.overdue ?? 0}
                </div>
                <div class="ecc-stat-label">At Risk</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 12-COL GRID ═══ */}
      <div class="dash-grid">
        {/* ── KPI Row ── */}
        <div class="dash-card dash-col-3">
          <div class="kpi-enhanced">
            <div class="kpi-enhanced-top">
              <span
                class="kpi-enhanced-icon"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary), transparent 85%)",
                  color: "var(--primary)",
                }}
              >
                <Icon name="folder" size={20} />
              </span>
              <span class="kpi-enhanced-trend up">
                <Icon name="trending_up" size={12} />+12%
              </span>
            </div>
            <p class="kpi-enhanced-metric">{totalProjects}</p>
            <p class="kpi-enhanced-label">Total Projects</p>
            <div class="kpi-enhanced-footer">
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {data?.projects?.active ?? 0} active
              </span>
              <div class="kpi-sparkline">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>

        <div class="dash-card dash-col-3">
          <div class="kpi-enhanced">
            <div class="kpi-enhanced-top">
              <span
                class="kpi-enhanced-icon"
                style={{
                  background:
                    "color-mix(in srgb, var(--accent), transparent 85%)",
                  color: "var(--accent)",
                }}
              >
                <Icon name="task_alt" size={20} />
              </span>
              {urgentCount > 0 && (
                <span
                  class="kpi-enhanced-trend down"
                  style={{ fontSize: "11px" }}
                >
                  {urgentCount} urgent
                </span>
              )}
            </div>
            <p class="kpi-enhanced-metric">
              {data?.mine?.assignedOpen ?? taskTotal}
            </p>
            <p class="kpi-enhanced-label">Active Tasks</p>
            <div class="kpi-enhanced-footer">
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {data?.tasks?.overdue ?? 0} overdue
              </span>
              <div class="kpi-sparkline accent">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>

        <div class="dash-card dash-col-3">
          <div class="kpi-enhanced">
            <div class="kpi-enhanced-top">
              <span
                class="kpi-enhanced-icon"
                style={{
                  background:
                    "color-mix(in srgb, var(--success), transparent 85%)",
                  color: "var(--success)",
                }}
              >
                <Icon name="speed" size={20} />
              </span>
              <span class="kpi-enhanced-trend up">
                <Icon name="trending_up" size={12} />
                {velocity}%
              </span>
            </div>
            <p class="kpi-enhanced-metric">{velocity}%</p>
            <p class="kpi-enhanced-label">Team Velocity</p>
            <div class="kpi-enhanced-footer">
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {done}/{taskTotal} tasks done
              </span>
              <div class="kpi-sparkline success">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>

        <div class="dash-card dash-col-3">
          <div class="kpi-enhanced">
            <div class="kpi-enhanced-top">
              <span
                class="kpi-enhanced-icon"
                style={{
                  background:
                    "color-mix(in srgb, var(--success), transparent 85%)",
                  color: "var(--success)",
                }}
              >
                <Icon name="check_circle" size={20} />
              </span>
              <span class="kpi-enhanced-trend up">
                <Icon name="trending_up" size={12} />
                {completionRate}%
              </span>
            </div>
            <p class="kpi-enhanced-metric">{completionRate}%</p>
            <p class="kpi-enhanced-label">Completion Rate</p>
            <div class="kpi-enhanced-footer">
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {totalMembers} team members
              </span>
              <div class="kpi-sparkline success">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>

        {/* ── Project Progress (6 cols) ── */}
        <div class="dash-card dash-col-6 dash-card-full">
          <div class="dash-card-header">
            <h3 class="dash-card-title">Project Progress</h3>
            <a
              href="/projects"
              style={{
                fontSize: "12px",
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View All
            </a>
          </div>
          <div class="dash-card-body">
            <div class="dash-projects">
              {actProjects.length > 0
                ? actProjects.slice(0, 5).map((project) => {
                  const risk = getRisk(project);
                  return (
                    <a
                      key={project.id}
                      href={`/projects/${project.id}`}
                      class="dash-project-item"
                    >
                      <ProgressRing value={project.progress ?? 0} />
                      <div class="dash-project-info">
                        <p class="dash-project-name">{project.name}</p>
                        <div class="dash-project-meta">
                          <span>
                            {project.taskStats
                              ? `${project.taskStats.done}/${project.taskStats.total} tasks`
                              : `${project.taskCount ?? 0} tasks`}
                          </span>
                          <span>·</span>
                          <span>
                            {project.createdAt
                              ? `${
                                Math.max(
                                  1,
                                  Math.ceil(
                                    (new Date(project.createdAt).getTime() +
                                      30 * 86400000 - Date.now()) / 86400000,
                                  ),
                                )
                              } days left`
                              : "No due date"}
                          </span>
                        </div>
                      </div>
                      <div class="dash-project-right">
                        {project.owner && (
                          <Avatar user={project.owner} size={24} />
                        )}
                        <span class={`dash-risk-badge ${risk}`}>
                          <span class="dash-risk-dot" />
                          {risk === "on_track"
                            ? "On Track"
                            : risk === "at_risk"
                            ? "At Risk"
                            : risk === "delayed"
                            ? "Delayed"
                            : "Completed"}
                        </span>
                      </div>
                    </a>
                  );
                })
                : (
                  <div class="dash-empty">
                    <Icon
                      name="folder_open"
                      size={28}
                      style={{ opacity: "0.4" }}
                    />No active projects yet. Create one to get started.
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* ── My Tasks Table (6 cols) ── */}
        <div class="dash-card dash-col-6 dash-card-full">
          <div class="dash-card-header">
            <h3 class="dash-card-title">My Tasks</h3>
            <a
              href="/tasks"
              style={{
                fontSize: "12px",
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View All
            </a>
          </div>
          <div class="dash-card-body" style={{ overflowX: "auto" }}>
            {sortedTasks.length > 0
              ? (
                <>
                  <table class="dash-task-table">
                    <thead>
                      <tr>
                        <th
                          class={sortField === "title" ? "sorted" : ""}
                          onClick={() => toggleSort("title")}
                        >
                          Task <SortIcon field="title" />
                        </th>
                        <th
                          class={sortField === "priority" ? "sorted" : ""}
                          onClick={() => toggleSort("priority")}
                        >
                          Priority <SortIcon field="priority" />
                        </th>
                        <th
                          class={sortField === "status" ? "sorted" : ""}
                          onClick={() => toggleSort("status")}
                        >
                          Status <SortIcon field="status" />
                        </th>
                        <th
                          class={sortField === "dueDate" ? "sorted" : ""}
                          onClick={() => toggleSort("dueDate")}
                        >
                          Due Date <SortIcon field="dueDate" />
                        </th>
                        <th style={{ textAlign: "right" }}>Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((task) => {
                        const pColor = PRIORITY_COLOR[task.priority] ??
                          "var(--muted)";
                        const statusCls = task.status === "TODO"
                          ? "todo"
                          : task.status === "IN_PROGRESS"
                          ? "in_progress"
                          : "done";
                        return (
                          <tr
                            key={task.id}
                            style={{ cursor: "pointer" }}
                            onClick={() => window.location.href = "/tasks"}
                          >
                            <td>
                              <div class="dash-task-name">
                                <span
                                  class="dash-task-dot"
                                  style={{
                                    background: pColor,
                                    boxShadow: `0 0 6px ${pColor}40`,
                                  }}
                                />
                                <span
                                  style={{
                                    fontWeight: 500,
                                    color: "var(--text)",
                                  }}
                                >
                                  {task.title}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                class="dash-priority-badge"
                                style={{ color: pColor }}
                              >
                                {task.priority === "HIGH"
                                  ? "High"
                                  : task.priority === "MEDIUM"
                                  ? "Medium"
                                  : "Low"}
                              </span>
                            </td>
                            <td>
                              <span class={`dash-status-badge ${statusCls}`}>
                                {task.status === "IN_PROGRESS"
                                  ? "In Progress"
                                  : task.status.charAt(0) +
                                    task.status.slice(1).toLowerCase()}
                              </span>
                            </td>
                            <td
                              style={{
                                color: task.dueDate &&
                                    new Date(task.dueDate) < new Date() &&
                                    !isCompletedStatus(task.status)
                                  ? "var(--danger)"
                                  : "var(--muted)",
                                fontWeight: task.dueDate &&
                                    new Date(task.dueDate) < new Date() &&
                                    !isCompletedStatus(task.status)
                                  ? 600
                                  : 400,
                              }}
                            >
                              {fmtDate(task.dueDate)}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <Avatar user={task.assignee} size={24} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={sortedTasks.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    zeroBased
                    showing={false}
                  />
                </>
              )
              : (
                <div class="dash-empty">
                  <Icon
                    name="assignment"
                    size={28}
                    style={{ opacity: "0.4" }}
                  />No assigned tasks yet. Create a task to get started.
                </div>
              )}
          </div>
        </div>

        {/* ── Team Workload (6 cols) ── */}
        <div class="dash-card dash-col-6 dash-card-full">
          <div class="dash-card-header">
            <h3 class="dash-card-title">Team Workload</h3>
            <span class="dash-card-badge">
              {data?.memberWorkload?.length ?? 0} members
            </span>
          </div>
          <div class="dash-card-body">
            {data?.memberWorkload && data.memberWorkload.length > 0
              ? (
                <div class="dash-workload">
                  {data.memberWorkload.slice(0, 6).map((item) => {
                    const pct = Math.round((item.count / workloadMax) * 100);
                    const barColor = pct >= 80
                      ? "var(--danger)"
                      : pct >= 50
                      ? "var(--warning)"
                      : "var(--primary)";
                    const capacity = Math.min(100, pct);
                    return (
                      <div key={item.user.id} class="dash-workload-item">
                        <div class="dash-workload-avatar">
                          <Avatar user={item.user} size={28} />
                        </div>
                        <div class="dash-workload-info">
                          <div class="dash-workload-top">
                            <span class="dash-workload-name">
                              {item.user.name}
                            </span>
                            <span class="dash-workload-role">
                              {item.user.role?.toLowerCase() ?? "member"}
                            </span>
                            <span class="dash-workload-capacity">
                              {capacity}%
                            </span>
                          </div>
                          <div class="dash-workload-track">
                            <div
                              class="dash-workload-fill"
                              style={{
                                width: `${capacity}%`,
                                background: barColor,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
              : (
                <div class="dash-empty">
                  <Icon name="group" size={28} style={{ opacity: "0.4" }} />No
                  workload data yet. Assign tasks to team members.
                </div>
              )}
          </div>
        </div>

        {/* ── Activity Feed (6 cols) ── */}
        <div class="dash-card dash-col-6 dash-card-full">
          <div class="dash-card-header">
            <h3 class="dash-card-title">Recent Activity</h3>
            <span class="dash-card-badge">{recentActivity.length} events</span>
          </div>
          <div class="dash-card-body">
            {recentActivity.length > 0
              ? (
                <div class="dash-timeline">
                  <div class="dash-tl-line" />
                  {recentActivity.slice(0, 6).map((item) => {
                    const met = item.metadata as
                      | Record<string, unknown>
                      | undefined;
                    const projectName = typeof met?.projectName === "string"
                      ? met.projectName
                      : undefined;
                    return (
                      <div key={item.id} class="dash-tl-item">
                        <div class="dash-tl-dot-wrap">
                          <div
                            class={`dash-tl-dot ${actionClass(item.action)}`}
                          >
                            <div class="dash-tl-dot-inner" />
                          </div>
                        </div>
                        <div class="dash-tl-content">
                          <p class="dash-tl-text">
                            <strong>{item.actor?.name ?? "System"}</strong>{" "}
                            {item.action.replaceAll("_", " ").toLowerCase()}
                            {projectName && (
                              <>
                                in{" "}
                                <span class="dash-tl-project-ref">
                                  {projectName}
                                </span>
                              </>
                            )}
                          </p>
                          <p class="dash-tl-time">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
              : (
                <div class="dash-empty">
                  <Icon name="history" size={28} style={{ opacity: "0.4" }} />No
                  recent activity yet.
                </div>
              )}
          </div>
        </div>
      </div>

      {/* ═══ PROJECT INSIGHTS ═══ */}
      <div class="dash-grid">
        <div class="dash-col-12">
          <ExecutiveDashboard />
        </div>
      </div>

      {/* ═══ ACTIVITY HEATMAP ═══ */}
      <div class="dash-grid">
        <div class="dash-col-12">
          <ActivityHeatmap />
        </div>
      </div>

      {/* ═══ WORKLOAD + INSIGHTS ═══ */}
      <div class="dash-grid">
        <div class="dash-col-6">
          <WorkloadBalancer
            members={data?.memberWorkload ?? []}
            tasks={tasks.slice(0, 50).map((t) => ({
              assignee: t.assignee
                ? { id: t.assignee.id, name: t.assignee.name }
                : null,
              title: t.title,
            }))}
          />
        </div>
        <div class="dash-col-6">
          <InsightsAssistant
            tasks={tasks.slice(0, 50)}
            members={data?.memberWorkload ?? []}
            completionRate={completionRate}
          />
        </div>
      </div>

      {/* ═══ ANALYTICS SNAPSHOT ═══ */}
      <div class="dash-grid">
        <div class="dash-col-12">
          <DashboardAnalyticsSnapshot />
        </div>
      </div>

      {/* ── Modals ── */}
      {projectOpen && (
        <ProjectCreateModal
          onClose={() => setProjectOpen(false)}
          onCreated={() => load(true)}
        />
      )}
      {taskOpen && (
        <TaskCreateModal
          projects={creatableProjects}
          onClose={() => setTaskOpen(false)}
          onCreated={() => load(true)}
        />
      )}
    </div>
  );
}
