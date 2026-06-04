import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { get, getList } from "../lib/api.ts";
import { getCurrentUser, requireClientAuth } from "../lib/auth.ts";
import { toast } from "../lib/toast.ts";
import { canCreateTasks, getProjectRole } from "../lib/roles.ts";
import type { Activity, DashboardData, Project, Task } from "../lib/types.ts";
import type { Priority, TaskStatus } from "../lib/types.ts";
import {
  Avatar,
  Badge,
  EmptyState,
  fmtDate,
  Icon,
  priorityTone,
  ProgressBar,
  Skeleton,
} from "../components/ui.tsx";
import ProjectCreateModal from "./ProjectCreateModal.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";

// Data cache: 30s TTL, survives route transitions
const dashboardCache = {
  data: null as DashboardData | null,
  projects: null as Project[] | null,
  ts: 0,
};
const CACHE_TTL = 30_000;

function useCachedLoader() {
  return useMemo(() => {
    const now = Date.now();
    const hit = dashboardCache.data && (now - dashboardCache.ts) < CACHE_TTL;
    return {
      data: hit ? dashboardCache.data : null,
      projects: hit ? dashboardCache.projects : null,
      stale: hit,
    };
  }, []);
}

function ProgressRing({ value, size = 64 }: { value: number; size?: number }) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference -
    (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={value >= 80
            ? "var(--success)"
            : value >= 40
            ? "var(--warning)"
            : "var(--primary)"}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.35s" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
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

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  async function load(force = false) {
    requireClientAuth();
    // Try cache first
    const cached = !force && dashboardCache.data &&
      (Date.now() - dashboardCache.ts) < CACHE_TTL;
    if (cached) {
      setData(dashboardCache.data);
      setProjects(dashboardCache.projects ?? []);
      setTasks(dashboardCache.data!.myAssignedTasks ?? []);
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
      // Populate cache
      dashboardCache.data = dashboard;
      dashboardCache.projects = projectList;
      dashboardCache.ts = Date.now();
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
    setCurrentUserId(getCurrentUser()?.id ?? null);
  }, []);

  const statusCounts: Record<TaskStatus, number> = data?.taskCountByStatus ??
    data?.tasks?.byStatus ?? { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
  const priorityCounts: Record<Priority, number> = data?.taskCountByPriority ??
    data?.tasks?.byPriority ?? { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  const activeProjects = data?.activeProjects?.length
    ? data.activeProjects
    : projects;
  const creatableProjects = projects.filter((project) =>
    canCreateTasks(getProjectRole(project, currentUserId))
  );
  const recentActivity = data?.recentActivity ?? [];
  const taskTotal = data?.tasks?.total ??
    Object.values(statusCounts).reduce((sum, v) => sum + Number(v || 0), 0);
  const done = Number(statusCounts.DONE || 0);
  const velocity = taskTotal ? Math.round((done / taskTotal) * 100) : 0;
  const overdue = data?.tasks?.overdue ?? data?.overdueTasks?.length ?? 0;
  const urgentCount = Number(priorityCounts.URGENT || 0);

  const workloadMax = useMemo(() => {
    return Math.max(1, ...(data?.memberWorkload?.map((w) => w.count) ?? []));
  }, [data]);

  if (loading) {
    return (
      <div class="dg">
        <Skeleton height={96} />
        <Skeleton height={96} />
        <Skeleton height={96} />
        <Skeleton height={96} />
        <Skeleton height={320} />
        <Skeleton height={320} />
      </div>
    );
  }

  return (
    <div class="dg">
      {/* ── Header Section ── */}
      <div class="section-head">
        <div>
          <h2 class="headline-lg">Dashboard</h2>
          <p class="headline-sub">
            Welcome back. Everything looks smooth today.
          </p>
        </div>
        <div class="section-actions">
          {creatableProjects.length > 0 && (
            <button
              type="button"
              class="btn btn-secondary"
              onClick={() => setTaskOpen(true)}
            >
              <Icon name="add_task" size={18} /> New Task
            </button>
          )}
          <button
            type="button"
            class="btn btn-primary"
            onClick={() => setProjectOpen(true)}
          >
            <Icon name="add" size={18} /> New Project
          </button>
        </div>
      </div>

      {/* ── KPI Row (4 columns) ── */}
      <div class="dg dg-12">
        <div class="card dg-span-3">
          <div class="kpi-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <span
                class="kpi-icon"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary), transparent 85%)",
                  color: "var(--primary)",
                }}
              >
                <Icon name="folder" size={18} />
              </span>
              <span class="kpi-trend" style={{ color: "var(--success)" }}>
                <Icon name="trending_up" size={14} />+2
              </span>
            </div>
            <p class="kpi-label">Total Projects</p>
            <p class="kpi-value">
              {data?.projectCount ?? data?.projects?.total ?? projects.length}
            </p>
          </div>
        </div>

        <div class="card dg-span-3">
          <div class="kpi-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <span
                class="kpi-icon"
                style={{
                  background:
                    "color-mix(in srgb, var(--accent), transparent 85%)",
                  color: "var(--accent)",
                }}
              >
                <Icon name="task_alt" size={18} />
              </span>
              {urgentCount > 0 && (
                <span
                  class="kpi-badge"
                  style={{
                    background:
                      "color-mix(in srgb, var(--danger), transparent 85%)",
                    color: "var(--danger)",
                  }}
                >
                  {urgentCount} Urgent
                </span>
              )}
            </div>
            <p class="kpi-label">Active Tasks</p>
            <p class="kpi-value">
              {(data?.mine?.assignedOpen ?? taskTotal) || tasks.length}
            </p>
          </div>
        </div>

        <div class="card dg-span-3">
          <div class="kpi-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <span
                class="kpi-icon"
                style={{
                  background:
                    "color-mix(in srgb, var(--success), transparent 85%)",
                  color: "var(--success)",
                }}
              >
                <Icon name="speed" size={18} />
              </span>
              <div
                style={{
                  width: "48px",
                  height: "6px",
                  borderRadius: "999px",
                  background: "var(--surface-2)",
                  overflow: "hidden",
                  alignSelf: "center",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: "inherit",
                    background: "var(--primary)",
                    width: `${velocity}%`,
                  }}
                />
              </div>
            </div>
            <p class="kpi-label">Team Velocity</p>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "4px" }}
            >
              <p class="kpi-value">{velocity}%</p>
              <Icon
                name="trending_up"
                size={18}
                style={{ color: "var(--success)" }}
              />
            </div>
          </div>
        </div>

        <div class="card dg-span-3">
          <div class="kpi-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <span
                class="kpi-icon"
                style={{
                  background:
                    "color-mix(in srgb, var(--success), transparent 85%)",
                  color: "var(--success)",
                }}
              >
                <Icon name="check_circle" size={18} />
              </span>
              <span class="kpi-trend" style={{ color: "var(--muted)" }}>
                All Systems UP
              </span>
            </div>
            <p class="kpi-label">System Status</p>
            <p class="kpi-value" style={{ color: "var(--success)" }}>Healthy</p>
          </div>
        </div>

        {/* ── Project Progress & My Tasks (side by side) ── */}
        <div class="card dg-span-6 card-full-height">
          <div class="card-header">
            <h3 class="card-title">Project Progress</h3>
            <Icon
              name="more_horiz"
              size={20}
              style={{ color: "var(--muted)" }}
            />
          </div>
          <div
            class="card-body"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
            }}
          >
            {activeProjects.slice(0, 3).map((project) => (
              <a
                href={`/projects/${project.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <ProgressRing value={project.progress ?? 0} />
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
                    {project.name}
                  </p>
                  {project.createdAt && (
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "12px",
                        color: "var(--muted)",
                      }}
                    >
                      Due in {Math.max(
                        1,
                        Math.ceil(
                          (new Date(project.createdAt).getTime() +
                            30 * 86400000 - Date.now()) / 86400000,
                        ),
                      )} days
                    </p>
                  )}
                </div>
              </a>
            ))}
            {activeProjects.length === 0 && (
              <p style={{ margin: 0, color: "var(--muted)" }}>
                No active projects.
              </p>
            )}
          </div>
        </div>

        <div class="card dg-span-6 card-full-height">
          <div
            class="card-header"
            style={{
              borderBottom: "1px solid var(--border)",
              marginBottom: 0,
              padding:
                "var(--card-padding) var(--card-padding) var(--space-md)",
            }}
          >
            <h3 class="card-title">My Tasks</h3>
            <a
              href="/tasks"
              class="card-desc"
              style={{ color: "var(--primary)" }}
            >
              View All
            </a>
          </div>
          <div class="card-body" style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                textAlign: "left",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "color-mix(in srgb, var(--surface-2), transparent 40%)",
                  }}
                >
                  <th
                    style={{
                      padding: "8px var(--space-md)",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Task Name
                  </th>
                  <th
                    style={{
                      padding: "8px var(--space-md)",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Priority
                  </th>
                  <th
                    style={{
                      padding: "8px var(--space-md)",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Due Date
                  </th>
                  <th
                    style={{
                      padding: "8px var(--space-md)",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      textAlign: "right",
                    }}
                  >
                    Owner
                  </th>
                </tr>
              </thead>
              <tbody style={{ borderTop: "1px solid var(--border)" }}>
                {(tasks.length ? tasks : data?.overdueTasks ?? []).slice(0, 5)
                  .map((task) => {
                    const pColor =
                      task.priority === "URGENT" || task.priority === "HIGH"
                        ? "var(--danger)"
                        : task.priority === "MEDIUM"
                        ? "var(--warning)"
                        : "var(--primary)";
                    return (
                      <tr
                        style={{
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onClick={() => window.location.href = "/tasks"}
                      >
                        <td style={{ padding: "12px var(--space-md)" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "var(--space-sm)",
                            }}
                          >
                            <div
                              style={{
                                width: "6px",
                                height: "24px",
                                borderRadius: "999px",
                                background: pColor,
                                boxShadow: `0 0 8px ${pColor}40`,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: "14px" }}>
                              {task.title}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "12px var(--space-md)" }}>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background:
                                `color-mix(in srgb, ${pColor}, transparent 80%)`,
                              color: pColor,
                              fontSize: "10px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              border:
                                `1px solid color-mix(in srgb, ${pColor}, transparent 70%)`,
                            }}
                          >
                            {task.priority === "URGENT" ||
                                task.priority === "HIGH"
                              ? "High Priority"
                              : task.priority === "MEDIUM"
                              ? "Medium"
                              : "Low"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px var(--space-md)",
                            fontSize: "13px",
                            color: "var(--muted)",
                          }}
                        >
                          {fmtDate(task.dueDate)}
                        </td>
                        <td
                          style={{
                            padding: "12px var(--space-md)",
                            textAlign: "right",
                          }}
                        >
                          <Avatar user={task.assignee} size={28} />
                        </td>
                      </tr>
                    );
                  })}
                {(!tasks.length && !data?.overdueTasks?.length) && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "var(--space-lg)",
                        textAlign: "center",
                        color: "var(--muted)",
                      }}
                    >
                      No assigned tasks yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Team Workload & Recent Activity ── */}
        <div class="card dg-span-6 card-full-height">
          <div class="card-header">
            <h3 class="card-title">Team Workload</h3>
            <select
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "4px 8px",
                fontSize: "13px",
                color: "var(--text)",
              }}
            >
              <option>Current Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div
            class="card-body"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
            }}
          >
            {(data?.memberWorkload ?? []).slice(0, 5).map((item) => {
              const pct = workloadMax
                ? Math.round((item.count / workloadMax) * 100)
                : 0;
              const barColor = pct >= 80
                ? "var(--danger)"
                : pct >= 50
                ? "var(--warning)"
                : "var(--primary)";
              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-xs)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-sm)",
                      }}
                    >
                      <Avatar user={item.user} size={24} />
                      <span style={{ fontSize: "14px" }}>{item.user.name}</span>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background:
                            "color-mix(in srgb, var(--primary), transparent 85%)",
                          color: "var(--primary)",
                          fontSize: "9px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {item.user.role?.toLowerCase() ?? "Member"}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {item.count}/{workloadMax} Tasks
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "999px",
                      background: "var(--surface-2)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "inherit",
                        background: barColor,
                        width: `${pct}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {!data?.memberWorkload?.length && (
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Workload appears once tasks are assigned.
              </p>
            )}
          </div>
        </div>

        <div class="card dg-span-6 card-full-height">
          <div class="card-header">
            <h3 class="card-title">Recent Activity</h3>
            <Icon name="history" size={20} style={{ color: "var(--muted)" }} />
          </div>
          <div
            class="card-body"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-md)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "11px",
                  top: "8px",
                  bottom: "8px",
                  width: "2px",
                  background: "var(--border)",
                  zIndex: 0,
                }}
              />
              {recentActivity.slice(0, 4).map((item) => {
                const dotStyle =
                  item.action.includes("create") || item.action.includes("add")
                    ? { borderColor: "var(--primary)", bg: "var(--primary)" }
                    : item.action.includes("complete") ||
                        item.action.includes("done")
                    ? { borderColor: "var(--success)", bg: "var(--success)" }
                    : item.action.includes("comment")
                    ? { borderColor: "var(--accent)", bg: "var(--accent)" }
                    : { borderColor: "var(--warning)", bg: "var(--warning)" };
                return (
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      gap: "var(--space-sm)",
                      paddingLeft: "32px",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "4px",
                        width: "24px",
                        height: "24px",
                        borderRadius: "999px",
                        background: "var(--card)",
                        border: `2px solid ${dotStyle.borderColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "999px",
                          background: dotStyle.bg,
                        }}
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: "var(--muted)",
                        }}
                      >
                        <strong style={{ color: "var(--text)" }}>
                          {item.actor?.name ?? "System"}
                        </strong>{" "}
                        {item.action.replaceAll("_", " ").toLowerCase()}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "11px",
                          color: "var(--muted)",
                        }}
                      >
                        <span
                          style={{
                            background: "var(--surface-2)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
              {recentActivity.length === 0 && (
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  No recent activity yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {projectOpen && (
        <ProjectCreateModal
          onClose={() => setProjectOpen(false)}
          onCreated={() => {
            load(true);
          }}
        />
      )}
      {taskOpen && (
        <TaskCreateModal
          projects={creatableProjects}
          onClose={() => setTaskOpen(false)}
          onCreated={() => {
            load(true);
          }}
        />
      )}
    </div>
  );
}
