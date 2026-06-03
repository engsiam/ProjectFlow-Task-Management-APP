import { useEffect, useMemo, useState } from "preact/hooks";
import { get } from "../lib/api.ts";
import { requireClientAuth } from "../lib/auth.ts";
import type { Priority, Project, Task, TaskStatus } from "../lib/types.ts";
import { Avatar, Badge, Button, EmptyState, fmtDate, Icon, priorityTone, Skeleton, statusTone } from "../components/ui.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";
import TaskDetailModal from "./TaskDetailModal.tsx";

export default function TasksClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [label, setLabel] = useState("");

  async function load() {
    requireClientAuth();
    setLoading(true);
    const projectList = await get<Project[]>("/projects").catch(() => []);
    setProjects(Array.isArray(projectList) ? projectList : []);
    const batches = await Promise.all((Array.isArray(projectList) ? projectList : []).map((project) =>
      get<Task[]>(`/projects/${project.id}/tasks`).catch(() => [])
    ));
    setTasks(batches.flat());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
      return (!query || text.includes(query.toLowerCase())) &&
        (!status || task.status === status) &&
        (!priority || task.priority === priority) &&
        (!label || task.labels?.some((item) => item.toLowerCase().includes(label.toLowerCase())));
    });
  }, [tasks, query, status, priority, label]);

  if (loading) return <div style={{ display: "grid", gap: "16px" }}><Skeleton height={104} /><Skeleton height={420} /></div>;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}>TASK OPERATIONS</p>
          <h2 class="headline" style={{ margin: "4px 0 0", fontSize: "32px" }}>Tasks</h2>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}><Icon name="add_task" size={18} /> New Task</Button>
      </section>
      <section class="panel" style={{ padding: "12px", display: "grid", gridTemplateColumns: "2fr repeat(3, minmax(140px, 1fr))", gap: "10px" }}>
        <input class="input" placeholder="Search tasks..." value={query} onInput={(e) => setQuery(e.currentTarget.value)} />
        <select class="select" value={status} onChange={(e) => setStatus(e.currentTarget.value as TaskStatus | "")}>
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REVIEW">Review</option>
          <option value="DONE">Done</option>
        </select>
        <select class="select" value={priority} onChange={(e) => setPriority(e.currentTarget.value as Priority | "")}>
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <input class="input" placeholder="Label" value={label} onInput={(e) => setLabel(e.currentTarget.value)} />
      </section>
      {filtered.length === 0
        ? <EmptyState icon="search_off" title="No tasks match" body="Adjust filters or create a new task." />
        : (
          <div class="card" style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ color: "var(--muted)", textAlign: "left" }}>
                <tr>
                  <th style={{ padding: "14px" }}>Task</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th>Assignee</th>
                  <th>Labels</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => (
                  <tr style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }} onClick={() => setSelected(task)}>
                    <td style={{ padding: "14px" }}><strong>{task.title}</strong><p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{task.project?.name ?? ""}</p></td>
                    <td><Badge tone={statusTone(task.status)}>{task.status}</Badge></td>
                    <td><Badge tone={priorityTone(task.priority)}>{task.priority}</Badge></td>
                    <td>{fmtDate(task.dueDate)}</td>
                    <td><Avatar user={task.assignee} /></td>
                    <td><div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{task.labels?.slice(0, 3).map((item) => <Badge>{item}</Badge>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {open && <TaskCreateModal projects={projects} onClose={() => setOpen(false)} onCreated={load} />}
      {selected && <TaskDetailModal task={selected} projects={projects} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); load(); }} />}
    </div>
  );
}
