import { useState } from "preact/hooks";
import { del, patch } from "../lib/api.ts";
import type { Priority, Project, Task, TaskStatus } from "../lib/types.ts";
import { Avatar, Badge, Button, fmtDate, Icon, priorityTone, statusTone } from "../components/ui.tsx";
import CommentBox from "./CommentBox.tsx";

export default function TaskDetailModal(
  { task, projects, onClose, onSaved }: { task: Task; projects: Project[]; onClose: () => void; onSaved: () => void }
) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate?.slice(0, 10) ?? "");
  const [labels, setLabels] = useState((task.labels ?? []).join(", "));
  const [tab, setTab] = useState<"activity" | "comments">("comments");
  const [error, setError] = useState("");

  async function save() {
    setError("");
    try {
      await patch(`/tasks/${task.id}`, {
        title,
        description,
        status,
        priority,
        dueDate: dueDate || undefined,
        labels: labels.split(",").map((label) => label.trim()).filter(Boolean)
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save task.");
    }
  }

  async function remove() {
    if (!confirm(`Delete ${task.title}?`)) return;
    await del(`/tasks/${task.id}`);
    onSaved();
  }

  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px" }}>
          <section style={{ padding: "22px", borderRight: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
              <div>
                <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}>TASK DETAIL</p>
                <h2 class="headline" style={{ margin: "4px 0 0", fontSize: "28px" }}>{task.title}</h2>
              </div>
              <button class="btn icon-btn" onClick={onClose}><Icon name="close" /></button>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
              <Badge tone={statusTone(status)}>{status}</Badge>
              <Badge tone={priorityTone(priority)}>{priority}</Badge>
              <Badge>{fmtDate(dueDate)}</Badge>
            </div>
            <label class="label">Title</label>
            <input class="input" value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
            <label class="label" style={{ marginTop: "14px" }}>Description</label>
            <textarea class="textarea" value={description} onInput={(e) => setDescription(e.currentTarget.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginTop: "14px" }}>
              <div>
                <label class="label">Status</label>
                <select class="select" value={status} onChange={(e) => setStatus(e.currentTarget.value as TaskStatus)}>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
              <div>
                <label class="label">Priority</label>
                <select class="select" value={priority} onChange={(e) => setPriority(e.currentTarget.value as Priority)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label class="label">Due date</label>
                <input class="input" type="date" value={dueDate} onInput={(e) => setDueDate(e.currentTarget.value)} />
              </div>
              <div>
                <label class="label">Labels</label>
                <input class="input" value={labels} onInput={(e) => setLabels(e.currentTarget.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "18px", flexWrap: "wrap" }}>
              <button class={`btn ${tab === "comments" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("comments")}>Comments</button>
              <button class={`btn ${tab === "activity" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("activity")}>Activity</button>
            </div>
            <div style={{ marginTop: "14px" }}>
              {tab === "comments"
                ? <CommentBox taskId={task.id} />
                : (
                  <div class="panel" style={{ padding: "14px", color: "var(--muted)" }}>
                    <p><strong style={{ color: "var(--text)" }}>{task.assignee?.name ?? "Someone"}</strong> moved this task through the workflow.</p>
                    <p class="mono" style={{ fontSize: "10px" }}>Activity from the backend timeline appears in project Activity.</p>
                  </div>
                )}
            </div>
          </section>
          <aside style={{ padding: "22px", display: "grid", alignContent: "start", gap: "18px" }}>
            <div>
              <p class="label">Assignee</p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Avatar user={task.assignee} />
                <div>
                  <strong>{task.assignee?.name ?? "Unassigned"}</strong>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px" }}>{task.assignee?.email ?? "No owner yet"}</p>
                </div>
              </div>
            </div>
            <div>
              <p class="label">Project</p>
              <select class="select" value={task.projectId ?? task.project?.id ?? ""} disabled>
                <option>{task.project?.name ?? projects.find((p) => p.id === task.projectId)?.name ?? "Project"}</option>
              </select>
            </div>
            <div>
              <p class="label">Labels</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {labels.split(",").map((label) => label.trim()).filter(Boolean).map((label) => <Badge>{label}</Badge>)}
              </div>
            </div>
            <div class="panel" style={{ padding: "14px" }}>
              <p class="label">Subtasks</p>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Checklist</span><strong>0 / 0</strong></div>
            </div>
            {error && <p class="badge badge-danger">{error}</p>}
            <Button variant="primary" onClick={save}><Icon name="save" size={18} /> Save changes</Button>
            <Button variant="danger" onClick={remove}><Icon name="delete" size={18} /> Delete task</Button>
          </aside>
        </div>
      </div>
    </div>
  );
}
