import { useEffect, useMemo, useState } from "preact/hooks";
import { del, get, getList, patch } from "../lib/api.ts";
import { getCurrentUser, requireClientAuth } from "../lib/auth.ts";
import { toast } from "../lib/toast.ts";
import {
  canCreateTasks,
  canEditProject,
  canInviteMembers,
  canRemoveMember,
  getAssignableRoles,
  getProjectRole,
} from "../lib/roles.ts";
import type {
  Activity,
  Project,
  ProjectMember,
  ProjectStatus,
  Role,
  Task,
} from "../lib/types.ts";
import { isCompletedStatus } from "../lib/types.ts";

function statusLabel(s: ProjectStatus): string {
  if (s === "ON_HOLD") return "On Hold";
  if (s === "ARCHIVED") return "Archived";
  return s.charAt(0) + s.slice(1).toLowerCase();
}
import ConfirmDialog from "./ConfirmDialog.tsx";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Icon,
  priorityTone,
  Skeleton,
  statusTone,
} from "../components/ui.tsx";
import KanbanBoard from "./KanbanBoard.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";
import InviteMemberModal from "./InviteMemberModal.tsx";
import ProjectAnalyticsTab from "./ProjectAnalyticsTab.tsx";

type Tab =
  | "Overview"
  | "Board"
  | "Tasks"
  | "Members"
  | "Activity"
  | "Analytics";
const tabs: Tab[] = [
  "Overview",
  "Board",
  "Tasks",
  "Members",
  "Activity",
  "Analytics",
];

const STATUS_DOT: Record<string, string> = {
  TODO: "var(--muted)",
  IN_PROGRESS: "var(--info)",
  COMPLETED: "var(--success)",
};

function computeHealth(
  progress: number,
  tasks: Task[],
): { label: string; className: string } {
  const overdue =
    tasks.filter((t) =>
      t.dueDate && new Date(t.dueDate) < new Date() &&
      !isCompletedStatus(t.status)
    ).length;
  if (overdue > 3 || progress < 15) {
    return { label: "Delayed", className: "delayed" };
  }
  if (overdue > 0 || progress < 50) {
    return { label: "At Risk", className: "at-risk" };
  }
  return { label: "On Track", className: "on-track" };
}

export default function ProjectDetailClient(
  { projectId }: { projectId: string },
) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [taskOpen, setTaskOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUserId(getCurrentUser()?.id ?? null);
  }, []);

  async function load() {
    requireClientAuth();
    setLoading(true);
    try {
      const [p, t, m, a] = await Promise.all([
        get<Project>(`/projects/${projectId}`),
        getList<Task>(`/projects/${projectId}/tasks`, { limit: 100 }).catch(
          () => [],
        ),
        getList<ProjectMember>(`/projects/${projectId}/members`, { limit: 100 })
          .catch(() => []),
        getList<Activity>(`/projects/${projectId}/activity`, { limit: 100 })
          .catch(() => []),
      ]);
      setProject(p);
      setTasks(Array.isArray(t) ? t : []);
      setMembers(Array.isArray(m) ? m : p.members ?? []);
      setActivity(Array.isArray(a) ? a : []);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(next: ProjectStatus) {
    if (!project || project.status === next) return;
    setStatusSaving(true);
    const prev = project.status;
    setProject({ ...project, status: next });
    try {
      const updated = await patch<Project>(
        `/projects/${project.id}`,
        { status: next },
        { loaderMessage: `Setting project to ${statusLabel(next)}…` },
      );
      setProject((p) => p ? { ...p, status: updated.status } : p);
      toast(`Project marked as ${statusLabel(next)}.`, "success");
    } catch (err) {
      setProject((p) => p ? { ...p, status: prev } : p);
      const msg = err instanceof Error
        ? err.message
        : "Could not change project status.";
      toast(msg, "danger");
    } finally {
      setStatusSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, [projectId]);

  const counts = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      const key = isCompletedStatus(task.status) ? "COMPLETED" : task.status;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [tasks]);

  const openTasks = (counts.TODO ?? 0) + (counts.IN_PROGRESS ?? 0);
  const completion = project?.progress ?? 0;
  const health = computeHealth(completion, tasks);
  const dueSoon = [...tasks].filter((task) => task.dueDate).sort((a, b) =>
    new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime()
  ).slice(0, 5);

  const earliestDue = dueSoon[0]?.dueDate;
  const daysToDue = earliestDue
    ? Math.ceil(
      (new Date(earliestDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    : null;

  const recentTasks = [...tasks].sort((a, b) =>
    new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  ).slice(0, 6);

  const currentRole = getProjectRole(project, currentUserId);
  const mayInviteMembers = canInviteMembers(
    currentRole,
    project,
    currentUserId,
  );
  const mayCreateTasks = canCreateTasks(currentRole, project, currentUserId);
  const mayEditProject = canEditProject(currentRole, project, currentUserId);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: "12px" }}>
        <Skeleton height={120} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
          }}
        >
          <Skeleton height={88} />
          <Skeleton height={88} />
          <Skeleton height={88} />
          <Skeleton height={88} />
        </div>
        <Skeleton height={320} />
      </div>
    );
  }
  if (!project) {
    return (
      <EmptyState
        icon="folder_off"
        title="Project not found"
        body="The backend did not return this project."
      />
    );
  }

  return (
    <div class="workspace-page">
      {/* Header */}
      <div class="pd-header">
        <div class="pd-header-top">
          <div class="pd-header-info">
            <div class="pd-header-badges">
              {mayEditProject && project.status !== "ARCHIVED"
                ? (
                  <select
                    class="pd-status-select"
                    value={project.status}
                    disabled={statusSaving}
                    onChange={(e) =>
                      changeStatus(
                        (e.currentTarget as HTMLSelectElement)
                          .value as ProjectStatus,
                      )}
                    style={`background:${
                      statusTone(project.status).includes("success")
                        ? "color-mix(in srgb,var(--success),transparent 88%)"
                        : statusTone(project.status).includes("warning")
                        ? "color-mix(in srgb,var(--warning),transparent 88%)"
                        : statusTone(project.status).includes("muted")
                        ? "color-mix(in srgb,var(--muted),transparent 88%)"
                        : "color-mix(in srgb,var(--info),transparent 88%)"
                    };color:${
                      statusTone(project.status).includes("success")
                        ? "var(--success)"
                        : statusTone(project.status).includes("warning")
                        ? "var(--warning)"
                        : statusTone(project.status).includes("muted")
                        ? "var(--muted)"
                        : "var(--info)"
                    };font-weight:600`}
                  >
                    <option value="ACTIVE">{statusLabel("ACTIVE")}</option>
                    <option value="COMPLETED">
                      {statusLabel("COMPLETED")}
                    </option>
                    <option value="ON_HOLD">{statusLabel("ON_HOLD")}</option>
                  </select>
                )
                : (
                  <Badge tone={statusTone(project.status)}>
                    {statusLabel(project.status)}
                  </Badge>
                )}
              <span
                class="mono"
                style="font-size:11px;color:var(--muted);letter-spacing:0.03em"
              >
                PRJ-{project.id.slice(-4).toUpperCase()}
              </span>
              {currentRole && <Badge>{currentRole}</Badge>}
              <span class={`pd-health ${health.className}`}>
                <span class="pd-health-dot" />
                {health.label}
              </span>
            </div>
            <h1 class="pd-title">{project.name}</h1>
            {project.description && <p class="pd-desc">{project.description}
            </p>}
            {(project.startDate || project.deadline) && (
              <div class="pd-header-dates">
                {project.startDate && (
                  <span class="pd-header-date">
                    <Icon name="event" size={14} />
                    <span class="pd-header-date-label">Start</span>
                    <span>
                      {new Date(project.startDate).toLocaleDateString()}
                    </span>
                  </span>
                )}
                {project.startDate && project.deadline && (
                  <span class="pd-header-date-sep">→</span>
                )}
                {project.deadline && (
                  <span
                    class="pd-header-date"
                    style={new Date(project.deadline) < new Date() &&
                        project.status !== "COMPLETED"
                      ? "color:var(--danger);font-weight:600"
                      : ""}
                  >
                    <Icon name="flag" size={14} />
                    <span class="pd-header-date-label">Deadline</span>
                    <span>
                      {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
          <div class="pd-header-actions">
            {mayInviteMembers && (
              <Button onClick={() => setInviteOpen(true)}>
                <Icon name="person_add" size={16} /> Invite
              </Button>
            )}
            {mayCreateTasks && (
              <Button
                variant="primary"
                onClick={() => setTaskOpen(true)}
              >
                <Icon name="add_task" size={16} /> New Task
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div class="pd-kpi-grid">
        <div class="pd-kpi">
          <div class="pd-kpi-icon">
            <Icon name="check_circle" size={18} />
          </div>
          <div class="pd-kpi-label">Completion</div>
          <div class="pd-kpi-value">{Math.round(completion)}%</div>
          <div class="pd-kpi-sub">
            {counts.COMPLETED ?? 0} of {tasks.length} tasks done
          </div>
        </div>
        <div class="pd-kpi">
          <div
            class="pd-kpi-icon"
            style="background:color-mix(in srgb,var(--warning),transparent 88%);color:var(--warning)"
          >
            <Icon name="pending" size={18} />
          </div>
          <div class="pd-kpi-label">Open Tasks</div>
          <div class="pd-kpi-value">{openTasks}</div>
          <div class="pd-kpi-sub">{counts.IN_PROGRESS ?? 0} in progress</div>
        </div>
        <div class="pd-kpi">
          <div
            class="pd-kpi-icon"
            style="background:color-mix(in srgb,var(--info),transparent 88%);color:var(--info)"
          >
            <Icon name="group" size={18} />
          </div>
          <div class="pd-kpi-label">Team Members</div>
          <div class="pd-kpi-value">{members.length}</div>
          <div class="pd-kpi-sub">
            {members.filter((m) =>
              m.role === "PROJECT_MANAGER" || m.role === "ADMIN"
            ).length} leads
          </div>
        </div>
        <div class="pd-kpi">
          <div
            class="pd-kpi-icon"
            style="background:color-mix(in srgb,var(--danger),transparent 88%);color:var(--danger)"
          >
            <Icon name="calendar_today" size={18} />
          </div>
          <div class="pd-kpi-label">Due Date</div>
          <div
            class="pd-kpi-value"
            style={daysToDue !== null && daysToDue < 0
              ? "color:var(--danger)"
              : ""}
          >
            {daysToDue !== null
              ? `${daysToDue > 0 ? `${daysToDue}d` : "Overdue"}`
              : "—"}
          </div>
          <div class="pd-kpi-sub">
            {earliestDue
              ? new Date(earliestDue).toLocaleDateString()
              : "No deadlines"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav class="pd-tabs">
        {tabs.map((item) => (
          <button
            type="button"
            class={`pd-tab ${tab === item ? "active" : ""}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* ── Overview Tab ── */}
      {tab === "Overview" && (
        <div class="pd-grid">
          {/* Left Column */}
          <div style="display:grid;gap:14px">
            {/* Progress */}
            <div class="pd-card">
              <div class="pd-card-title">
                <Icon name="trending_up" size={16} /> Progress
              </div>
              <div class="pd-progress-bar">
                <div
                  class="pd-progress-fill"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <div class="pd-progress-meta">
                <span>{Math.round(completion)}% complete</span>
                <span>{tasks.length} total tasks</span>
              </div>
              <div class="pd-progress-stats">
                <div class="pd-progress-stat">
                  <div
                    class="pd-progress-stat-value"
                    style="color:var(--muted)"
                  >
                    {counts.TODO ?? 0}
                  </div>
                  <div class="pd-progress-stat-label">To Do</div>
                </div>
                <div class="pd-progress-stat">
                  <div class="pd-progress-stat-value" style="color:var(--info)">
                    {counts.IN_PROGRESS ?? 0}
                  </div>
                  <div class="pd-progress-stat-label">In Progress</div>
                </div>
                <div class="pd-progress-stat">
                  <div
                    class="pd-progress-stat-value"
                    style="color:var(--success)"
                  >
                    {counts.COMPLETED ?? 0}
                  </div>
                  <div class="pd-progress-stat-label">Done</div>
                </div>
              </div>
            </div>

            {/* Recent Task Updates */}
            <div class="pd-card">
              <div class="pd-card-title">
                <Icon name="assignment" size={16} /> Recent Updates
              </div>
              {recentTasks.length === 0
                ? (
                  <div style="padding:24px 0;text-align:center;color:var(--muted);font-size:13px">
                    No tasks yet — create one to get started.
                  </div>
                )
                : (
                  <div class="pd-task-list">
                    {recentTasks.map((task) => (
                      <div key={task.id} class="pd-task-item">
                        <span
                          class="pd-task-status-dot"
                          style={{ background: STATUS_DOT[task.status] }}
                        />
                        <div class="pd-task-info">
                          <div class="pd-task-name">{task.title}</div>
                          <div class="pd-task-meta">
                            {task.status.replace("_", " ")} · {task.priority}
                            {task.dueDate &&
                              ` · Due ${
                                new Date(task.dueDate).toLocaleDateString()
                              }`}
                          </div>
                        </div>
                        {task.assignee && (
                          <div class="pd-task-assignee">
                            <Avatar user={task.assignee} size={24} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Team */}
            <div class="pd-card">
              <div class="pd-card-title">
                <Icon name="group" size={16} /> Team ({members.length})
              </div>
              {members.length === 0
                ? (
                  <div style="padding:24px 0;text-align:center;color:var(--muted);font-size:13px">
                    No team members yet.
                  </div>
                )
                : (
                  <div>
                    <div class="pd-team" style="margin-bottom:12px">
                      {members.slice(0, 8).map((m) => (
                        <span
                          class="pd-team-avatar"
                          title={m.user.name}
                        >
                          {m.user.name.charAt(0).toUpperCase()}
                        </span>
                      ))}
                      {members.length > 8 && (
                        <span class="pd-team-count">+{members.length - 8}</span>
                      )}
                    </div>
                    <div style="display:grid;gap:4px">
                      {members.slice(0, 4).map((m) => (
                        <div key={m.id} class="pd-member-row">
                          <div class="pd-member-info">
                            <Avatar user={m.user} size={28} />
                            <div>
                              <div style="font-size:13px;font-weight:500">
                                {m.user.name}
                              </div>
                              <div style="font-size:11px;color:var(--muted)">
                                {m.user.email}
                              </div>
                            </div>
                          </div>
                          <Badge>{m.role}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Right Column */}
          <div style="display:grid;gap:14px">
            {/* Health Detail */}
            <div class="pd-card">
              <div class="pd-card-title">
                <Icon name="monitor_heart" size={16} /> Project Health
              </div>
              <div class="pd-health-card">
                <div class="pd-hc-row">
                  <span class="pd-hc-label">Status</span>
                  <span
                    class={`pd-health ${health.className}`}
                    style="padding:2px 8px;font-size:11px"
                  >
                    <span class="pd-health-dot" /> {health.label}
                  </span>
                </div>
                <div class="pd-hc-divider" />
                <div class="pd-hc-row">
                  <span class="pd-hc-label">Overdue tasks</span>
                  <span
                    class="pd-hc-value"
                    style={tasks.filter((t) =>
                        t.dueDate && new Date(t.dueDate) < new Date() &&
                        !isCompletedStatus(t.status)
                      ).length > 0
                      ? "color:var(--danger)"
                      : ""}
                  >
                    {tasks.filter((t) =>
                      t.dueDate && new Date(t.dueDate) < new Date() &&
                      !isCompletedStatus(t.status)
                    ).length}
                  </span>
                </div>
                <div class="pd-hc-row">
                  <span class="pd-hc-label">Completion rate</span>
                  <span class="pd-hc-value">
                    {tasks.length > 0
                      ? Math.round(
                        ((counts.COMPLETED ?? 0) / tasks.length) * 100,
                      )
                      : 0}%
                  </span>
                </div>
                <div class="pd-hc-row">
                  <span class="pd-hc-label">Open vs closed</span>
                  <span class="pd-hc-value">
                    {openTasks} / {counts.COMPLETED ?? 0}
                  </span>
                </div>
                <div class="pd-hc-divider" />
                <div class="pd-hc-row">
                  <span class="pd-hc-label">Created</span>
                  <span class="pd-hc-value">
                    {project.createdAt
                      ? new Date(project.createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div class="pd-hc-row">
                  <span class="pd-hc-label">Last activity</span>
                  <span class="pd-hc-value">
                    {activity.length > 0
                      ? new Date(activity[0].createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div class="pd-card">
              <div class="pd-card-title">
                <Icon name="history" size={16} /> Activity
              </div>
              {activity.length === 0
                ? (
                  <div style="padding:24px 0;text-align:center;color:var(--muted);font-size:13px">
                    No activity yet.
                  </div>
                )
                : (
                  <div class="pd-timeline">
                    {activity.slice(0, 8).map((item, idx) => {
                      const actionType = item.action.includes("create") ||
                          item.action.includes("add")
                        ? "created"
                        : item.action.includes("update") ||
                            item.action.includes("edit") ||
                            item.action.includes("move")
                        ? "updated"
                        : item.action.includes("complete") ||
                            item.action.includes("done")
                        ? "completed"
                        : "commented";
                      return (
                        <div class="pd-tl-item">
                          <div style="display:flex;flex-direction:column;align-items:center">
                            <span class={`pd-tl-dot ${actionType}`} />
                            {idx < activity.slice(0, 8).length - 1 && (
                              <div class="pd-tl-line" />
                            )}
                          </div>
                          <div class="pd-tl-content">
                            <p class="pd-tl-text">
                              <strong>{item.actor?.name ?? "System"}</strong>
                              {" "}
                              {item.action.replaceAll("_", " ").toLowerCase()}
                            </p>
                            <p class="pd-tl-time">
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Other tabs */}
      {tab === "Board" && (
        <KanbanBoard
          tasks={tasks}
          projects={[project]}
          project={project}
          onChanged={load}
        />
      )}
      {tab === "Tasks" && <TaskTable tasks={tasks} />}
      {tab === "Members" && (
        <MemberList
          actorRole={currentRole}
          currentUserId={currentUserId}
          members={members}
          projectId={project.id}
          onChanged={load}
        />
      )}
      {tab === "Activity" && <ActivityPanel activity={activity} />}
      {tab === "Analytics" && <ProjectAnalyticsTab projectId={project.id} />}

      {taskOpen && (
        <TaskCreateModal
          projects={[project]}
          projectId={project.id}
          onClose={() => setTaskOpen(false)}
          onCreated={() => {
            load();
          }}
        />
      )}
      {inviteOpen && (
        <InviteMemberModal
          projectId={project.id}
          onClose={() => setInviteOpen(false)}
          onInvited={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

/* ── Sub-components ── */

function TaskTable({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) {
    return (
      <EmptyState
        icon="assignment"
        title="No tasks yet"
        body="Create tasks to fill the project board."
      />
    );
  }
  return (
    <div class="card" style="overflow:auto">
      <table class="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} style="cursor:pointer">
              <td>
                <div style="display:grid;gap:2px">
                  <span
                    class="mono"
                    style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase"
                  >
                    TSK-{task.id.slice(-4).toUpperCase()}
                  </span>
                  <strong>{task.title}</strong>
                </div>
              </td>
              <td>
                <Badge tone={statusTone(task.status)}>
                  {task.status.replace("_", " ")}
                </Badge>
              </td>
              <td>
                <Badge tone={priorityTone(task.priority)}>
                  {task.priority}
                </Badge>
              </td>
              <td>
                <Avatar user={task.assignee} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberList({
  actorRole,
  currentUserId,
  members,
  projectId,
  onChanged,
}: {
  actorRole: Role | null;
  currentUserId: string | null;
  members: ProjectMember[];
  projectId: string;
  onChanged: () => void;
}) {
  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(
    null,
  );

  async function changeRole(member: ProjectMember, role: Role) {
    try {
      await patch(`/projects/${projectId}/members/${member.user.id}/role`, {
        role,
      });
      toast(`${member.user.name} role changed to ${role}.`, "success");
      await onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to change role.";
      toast(msg, "danger");
    }
  }
  async function removeMember(member: ProjectMember) {
    try {
      await del(`/projects/${projectId}/members/${member.user.id}`);
      toast(`${member.user.name} removed from project.`, "warning");
      await onChanged();
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Unable to remove member.";
      toast(msg, "danger");
    }
  }
  if (!members.length) {
    return (
      <EmptyState
        icon="group"
        title="No members"
        body="Invite teammates to collaborate."
      />
    );
  }
  return (
    <>
      <div class="card" style="padding:14px;display:grid;gap:4px">
        {members.map((member) => {
          const editableRoles = getAssignableRoles(actorRole, member.role);
          const removable = canRemoveMember(
            actorRole,
            member.role,
            currentUserId,
            member.user.id,
          );
          return (
            <div key={member.id} class="pd-member-row">
              <div class="pd-member-info">
                <Avatar user={member.user} size={32} />
                <div>
                  <div style="font-size:13px;font-weight:500">
                    {member.user.name}
                  </div>
                  <div style="font-size:11px;color:var(--muted)">
                    {member.user.email}
                  </div>
                </div>
              </div>
              <div class="pd-member-actions">
                {editableRoles.length === 0
                  ? <Badge>{member.role}</Badge>
                  : (
                    <select
                      class="select"
                      value={member.role}
                      style="width:120px"
                      onChange={(e) =>
                        changeRole(member, e.currentTarget.value as Role)}
                    >
                      {editableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0) + role.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  )}
                {removable && (
                  <button
                    type="button"
                    class="btn btn-danger"
                    style="padding:4px 8px;font-size:12px"
                    onClick={() => setRemovingMember(member)}
                  >
                    <Icon name="person_remove" size={14} /> Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {removingMember && (
        <ConfirmDialog
          title="Remove member"
          body={`Are you sure you want to remove ${removingMember.user.name} from the project? Tasks assigned to them will remain.`}
          confirmLabel="Remove"
          variant="danger"
          onCancel={() => setRemovingMember(null)}
          onConfirm={async () => {
            const m = removingMember;
            setRemovingMember(null);
            await removeMember(m);
          }}
        />
      )}
    </>
  );
}

function ActivityPanel({ activity }: { activity: Activity[] }) {
  if (!activity.length) {
    return (
      <EmptyState
        icon="history"
        title="No activity"
        body="Project actions will appear here."
      />
    );
  }
  return (
    <div class="pd-card">
      <div class="pd-card-title">
        <Icon name="history" size={16} /> Activity Log
      </div>
      <div class="pd-timeline">
        {activity.map((item, idx) => {
          const actionType =
            item.action.includes("create") || item.action.includes("add")
              ? "created"
              : item.action.includes("update") ||
                  item.action.includes("edit") || item.action.includes("move")
              ? "updated"
              : item.action.includes("complete") || item.action.includes("done")
              ? "completed"
              : "commented";
          return (
            <div class="pd-tl-item">
              <div style="display:flex;flex-direction:column;align-items:center">
                <span class={`pd-tl-dot ${actionType}`} />
                {idx < activity.length - 1 && <div class="pd-tl-line" />}
              </div>
              <div class="pd-tl-content">
                <p class="pd-tl-text">
                  <strong>{item.actor?.name ?? "System"}</strong>{" "}
                  {item.action.replaceAll("_", " ").toLowerCase()}
                </p>
                <p class="pd-tl-time">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
