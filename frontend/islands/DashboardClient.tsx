import { useEffect, useMemo, useState } from "preact/hooks";
import { get } from "../lib/api.ts";
import { requireClientAuth } from "../lib/auth.ts";
import type { Activity, DashboardData, Project, Task } from "../lib/types.ts";
import { Avatar, Badge, EmptyState, fmtDate, Icon, priorityTone, ProgressBar, Skeleton, StatCard } from "../components/ui.tsx";
import ProjectCreateModal from "./ProjectCreateModal.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  async function load() {
    requireClientAuth();
    setLoading(true);
    try {
      const [dashboard, projectList] = await Promise.all([
        get<DashboardData>("/dashboard").catch(() => null),
        get<Project[]>("/projects").catch(() => [])
      ]);
      setData(dashboard);
      setProjects(Array.isArray(projectList) ? projectList : []);
      setTasks(dashboard?.myAssignedTasks ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const statusCounts = data?.taskCountByStatus ?? {};
  const priorityCounts = data?.taskCountByPriority ?? {};
  const activeProjects = data?.activeProjects?.length ? data.activeProjects : projects;
  const recentActivity = data?.recentActivity ?? [];
  const taskTotal = Object.values(statusCounts).reduce((sum, value) => sum + Number(value || 0), 0);
  const done = Number(statusCounts.DONE || 0);
  const velocity = taskTotal ? Math.round((done / taskTotal) * 100) : 0;
  const overdue = data?.overdueTasks?.length ?? 0;

  const workloadMax = useMemo(() => {
    const values = data?.memberWorkload?.map((item) => item.count) ?? [];
    return Math.max(1, ...values);
  }, [data]);

  if (loading) {
    return <div style={{ display: "grid", gap: "16px" }}><Skeleton height={120} /><Skeleton height={320} /><Skeleton height={220} /></div>;
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}>LIVE WORKSPACE</p>
          <h2 class="headline" style={{ margin: "4px 0 0", fontSize: "32px" }}>Dashboard</h2>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button class="btn btn-secondary" onClick={() => setTaskOpen(true)}><Icon name="add_task" size={18} /> New Task</button>
          <button class="btn btn-primary" onClick={() => setProjectOpen(true)}><Icon name="add" size={18} /> New Project</button>
        </div>
      </section>

      <section class="grid-stats">
        <StatCard icon="folder" label="Projects" value={data?.projectCount ?? projects.length} hint="Owned and shared workspaces" />
        <StatCard icon="assignment" label="Active tasks" value={taskTotal || tasks.length} hint={`${done} completed`} />
        <StatCard icon="speed" label="Completion" value={`${velocity}%`} hint="Across visible tasks" />
        <StatCard icon="warning" label="Overdue" value={overdue} hint="Needs attention today" />
      </section>

      <section class="dashboard-grid">
        <div style={{ display: "grid", gap: "18px" }}>
          <div class="card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 class="headline" style={{ margin: 0, fontSize: "24px" }}>Active Projects</h3>
              <a class="btn" href="/projects">View all</a>
            </div>
            {activeProjects.length === 0
              ? <EmptyState icon="folder_off" title="No projects yet" body="Create a project to start tracking work." />
              : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
                  {activeProjects.slice(0, 4).map((project) => (
                    <a class="panel" href={`/projects/${project.id}`} style={{ padding: "16px", display: "grid", gap: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                        <strong>{project.name}</strong>
                        <Badge tone={project.status === "COMPLETED" ? "success" : "neutral"}>{project.status}</Badge>
                      </div>
                      <p style={{ margin: 0, color: "var(--muted)", minHeight: "36px" }}>{project.description ?? "No description provided."}</p>
                      <ProgressBar value={project.progress} />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)", fontSize: "13px" }}>{Math.round(project.progress ?? 0)}% complete</span>
                        <div style={{ display: "flex" }}>{project.members?.slice(0, 3).map((member) => <Avatar user={member.user} />)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
          </div>

          <div class="card" style={{ padding: "18px" }}>
            <h3 class="headline" style={{ margin: "0 0 14px", fontSize: "24px" }}>My Assigned Tasks</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {(tasks.length ? tasks : data?.overdueTasks ?? []).slice(0, 5).map((task) => (
                <a class={`task-card priority-${task.priority}`} href="/tasks">
                  <div style={{ paddingLeft: "8px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
                    <div>
                      <strong>{task.title}</strong>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                        <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                        <Badge>{fmtDate(task.dueDate)}</Badge>
                      </div>
                    </div>
                    <Avatar user={task.assignee} />
                  </div>
                </a>
              ))}
              {tasks.length === 0 && !data?.overdueTasks?.length && <EmptyState icon="task_alt" title="No assigned tasks" body="Assigned work will appear here." />}
            </div>
          </div>
        </div>

        <aside style={{ display: "grid", gap: "18px" }}>
          <div class="card" style={{ padding: "18px" }}>
            <h3 class="headline" style={{ margin: "0 0 14px", fontSize: "22px" }}>Task Summary</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {Object.entries(statusCounts).map(([status, count]) => (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span class="mono" style={{ fontSize: "11px", color: "var(--muted)" }}>{status}</span>
                    <strong>{count}</strong>
                  </div>
                  <ProgressBar value={taskTotal ? (Number(count) / taskTotal) * 100 : 0} />
                </div>
              ))}
              {Object.keys(statusCounts).length === 0 && <p style={{ color: "var(--muted)" }}>No status metrics yet.</p>}
            </div>
          </div>
          <div class="card" style={{ padding: "18px" }}>
            <h3 class="headline" style={{ margin: "0 0 14px", fontSize: "22px" }}>Priority Mix</h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {Object.entries(priorityCounts).map(([priority, count]) => <Badge tone={priorityTone(priority as never)}>{priority}: {count}</Badge>)}
              {Object.keys(priorityCounts).length === 0 && <Badge>No priority data</Badge>}
            </div>
          </div>
          <div class="card" style={{ padding: "18px" }}>
            <h3 class="headline" style={{ margin: "0 0 14px", fontSize: "22px" }}>Team Workload</h3>
            <div style={{ display: "grid", gap: "12px" }}>
              {(data?.memberWorkload ?? []).slice(0, 5).map((item) => (
                <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: "10px", alignItems: "center" }}>
                  <Avatar user={item.user} />
                  <ProgressBar value={(item.count / workloadMax) * 100} />
                  <strong>{item.count}</strong>
                </div>
              ))}
              {!data?.memberWorkload?.length && <p style={{ color: "var(--muted)" }}>Workload appears once tasks are assigned.</p>}
            </div>
          </div>
          <ActivityList items={recentActivity} />
        </aside>
      </section>
      {projectOpen && <ProjectCreateModal onClose={() => setProjectOpen(false)} onCreated={load} />}
      {taskOpen && <TaskCreateModal projects={projects} onClose={() => setTaskOpen(false)} onCreated={load} />}
    </div>
  );
}

function ActivityList({ items }: { items: Activity[] }) {
  return (
    <div class="card" style={{ padding: "18px" }}>
      <h3 class="headline" style={{ margin: "0 0 14px", fontSize: "22px" }}>Recent Activity</h3>
      <div style={{ display: "grid", gap: "12px" }}>
        {items.slice(0, 6).map((item) => (
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: "10px" }}>
            <span class="brand-mark" style={{ width: "28px", height: "28px", background: "color-mix(in srgb, var(--primary), transparent 72%)", color: "var(--primary)" }}><Icon name="history" size={16} /></span>
            <div>
              <p style={{ margin: 0 }}><strong>{item.actor?.name ?? "System"}</strong> {item.action.replaceAll("_", " ").toLowerCase()}</p>
              <p class="mono" style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "10px" }}>{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {items.length === 0 && <p style={{ color: "var(--muted)" }}>No recent activity yet.</p>}
      </div>
    </div>
  );
}
