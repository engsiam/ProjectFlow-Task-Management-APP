import { useEffect, useMemo, useState } from "preact/hooks";
import { get } from "../lib/api.ts";
import { requireClientAuth } from "../lib/auth.ts";
import type { Activity, Project, ProjectMember, Task } from "../lib/types.ts";
import { Avatar, Badge, Button, EmptyState, Icon, priorityTone, ProgressBar, Skeleton, statusTone } from "../components/ui.tsx";
import KanbanBoard from "./KanbanBoard.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";
import InviteMemberModal from "./InviteMemberModal.tsx";

type Tab = "Overview" | "Board" | "Tasks" | "Members" | "Activity" | "Analytics";

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [taskOpen, setTaskOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function load() {
    requireClientAuth();
    setLoading(true);
    try {
      const [p, t, m, a] = await Promise.all([
        get<Project>(`/projects/${projectId}`),
        get<Task[]>(`/projects/${projectId}/tasks`).catch(() => []),
        get<ProjectMember[]>(`/projects/${projectId}/members`).catch(() => []),
        get<Activity[]>(`/projects/${projectId}/activity`).catch(() => [])
      ]);
      setProject(p);
      setTasks(Array.isArray(t) ? t : []);
      setMembers(Array.isArray(m) ? m : p.members ?? []);
      setActivity(Array.isArray(a) ? a : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [projectId]);

  const counts = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [tasks]);

  if (loading) return <div style={{ display: "grid", gap: "16px" }}><Skeleton height={160} /><Skeleton height={440} /></div>;
  if (!project) return <EmptyState icon="folder_off" title="Project not found" body="The backend did not return this project." />;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section class="card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}>PROJECT DETAIL</p>
            <h2 class="headline" style={{ margin: "4px 0", fontSize: "34px" }}>{project.name}</h2>
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: "760px" }}>{project.description ?? "No description provided."}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "start", flexWrap: "wrap" }}>
            <Badge tone={statusTone(project.status)}>{project.status}</Badge>
            <Button onClick={() => setInviteOpen(true)}><Icon name="person_add" size={18} /> Invite</Button>
            <Button variant="primary" onClick={() => setTaskOpen(true)}><Icon name="add_task" size={18} /> New Task</Button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "16px", alignItems: "center", marginTop: "18px" }}>
          <ProgressBar value={project.progress} />
          <strong>{Math.round(project.progress ?? 0)}%</strong>
        </div>
        <div style={{ display: "flex", marginTop: "14px" }}>{members.slice(0, 6).map((member) => <Avatar user={member.user} />)}</div>
      </section>

      <nav class="panel" style={{ padding: "8px", display: "flex", gap: "6px", overflowX: "auto" }}>
        {(["Overview", "Board", "Tasks", "Members", "Activity", "Analytics"] as Tab[]).map((item) => (
          <button class={`btn ${tab === item ? "btn-primary" : ""}`} onClick={() => setTab(item)}>{item}</button>
        ))}
      </nav>

      {tab === "Overview" && (
        <section class="dashboard-grid">
          <div class="card" style={{ padding: "18px" }}>
            <h3 class="headline" style={{ margin: "0 0 14px", fontSize: "24px" }}>Status Overview</h3>
            <div class="grid-stats">
              {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => (
                <div class="panel" style={{ padding: "14px" }}>
                  <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "10px" }}>{status}</p>
                  <strong class="headline" style={{ fontSize: "28px" }}>{counts[status] ?? 0}</strong>
                </div>
              ))}
            </div>
          </div>
          <ActivityPanel activity={activity} />
        </section>
      )}
      {tab === "Board" && <KanbanBoard tasks={tasks} projects={[project]} onChanged={load} />}
      {tab === "Tasks" && <TaskTable tasks={tasks} />}
      {tab === "Members" && <MemberList members={members} />}
      {tab === "Activity" && <ActivityPanel activity={activity} />}
      {tab === "Analytics" && (
        <div class="card" style={{ padding: "18px" }}>
          <h3 class="headline" style={{ marginTop: 0 }}>Analytics</h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {Object.entries(counts).map(([status, count]) => (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>{status}</span><strong>{count}</strong></div>
                <ProgressBar value={tasks.length ? (count / tasks.length) * 100 : 0} />
              </div>
            ))}
          </div>
        </div>
      )}
      {taskOpen && <TaskCreateModal projects={[project]} projectId={project.id} onClose={() => setTaskOpen(false)} onCreated={load} />}
      {inviteOpen && <InviteMemberModal projectId={project.id} onClose={() => setInviteOpen(false)} onInvited={load} />}
    </div>
  );
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return <EmptyState icon="assignment" title="No tasks yet" body="Create tasks to fill the project board." />;
  return (
    <div class="card" style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {tasks.map((task) => (
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "14px" }}><strong>{task.title}</strong></td>
              <td><Badge tone={statusTone(task.status)}>{task.status}</Badge></td>
              <td><Badge tone={priorityTone(task.priority)}>{task.priority}</Badge></td>
              <td><Avatar user={task.assignee} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberList({ members }: { members: ProjectMember[] }) {
  return (
    <div class="card" style={{ padding: "18px", display: "grid", gap: "10px" }}>
      {members.map((member) => (
        <div class="panel" style={{ padding: "12px", display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Avatar user={member.user} />
            <div><strong>{member.user.name}</strong><p style={{ margin: 0, color: "var(--muted)" }}>{member.user.email}</p></div>
          </div>
          <Badge>{member.role}</Badge>
        </div>
      ))}
      {!members.length && <EmptyState icon="group" title="No members returned" body="Invite teammates to collaborate." />}
    </div>
  );
}

function ActivityPanel({ activity }: { activity: Activity[] }) {
  return (
    <div class="card" style={{ padding: "18px" }}>
      <h3 class="headline" style={{ margin: "0 0 14px", fontSize: "24px" }}>Activity Timeline</h3>
      <div style={{ display: "grid", gap: "12px" }}>
        {activity.map((item) => (
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: "10px" }}>
            <span class="brand-mark" style={{ width: "32px", height: "32px" }}><Icon name="bolt" size={17} /></span>
            <div>
              <p style={{ margin: 0 }}><strong>{item.actor?.name ?? "System"}</strong> {item.action.replaceAll("_", " ").toLowerCase()}</p>
              <p class="mono" style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: "10px" }}>{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {!activity.length && <p style={{ color: "var(--muted)" }}>Project actions will appear here.</p>}
      </div>
    </div>
  );
}
