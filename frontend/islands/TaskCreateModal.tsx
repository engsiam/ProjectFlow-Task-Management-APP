import { useState } from "preact/hooks";
import { post } from "../lib/api.ts";
import type { Priority, Project, TaskStatus } from "../lib/types.ts";
import { Button, Icon } from "../components/ui.tsx";

export default function TaskCreateModal(
  { projects, projectId, onClose, onCreated }: { projects: Project[]; projectId?: string; onClose: () => void; onCreated: () => void }
) {
  const [selectedProject, setSelectedProject] = useState(projectId ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: Event) {
    e.preventDefault();
    if (!selectedProject) return setError("Choose a project first.");
    if (!title.trim()) return setError("Task title is required.");
    setLoading(true);
    setError("");
    try {
      await post(`/projects/${selectedProject}/tasks`, {
        title,
        description,
        status,
        priority,
        dueDate: dueDate || undefined,
        labels: labels.split(",").map((label) => label.trim()).filter(Boolean)
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task could not be created.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="modal" onSubmit={submit} style={{ maxWidth: "640px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 class="headline" style={{ margin: 0 }}>Create Task</h2>
          <button type="button" class="btn icon-btn" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label class="label">Project</label>
            <select class="select" value={selectedProject} disabled={Boolean(projectId)} onChange={(e) => setSelectedProject(e.currentTarget.value)}>
              <option value="">Select project</option>
              {projects.map((project) => <option value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label class="label">Title</label>
            <input class="input" value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
          </div>
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
            <input class="input" value={labels} onInput={(e) => setLabels(e.currentTarget.value)} placeholder="api, design" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label class="label">Description</label>
            <textarea class="textarea" value={description} onInput={(e) => setDescription(e.currentTarget.value)} />
          </div>
        </div>
        {error && <p class="badge badge-danger">{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>{loading ? "Creating..." : "Create task"}</Button>
        </div>
      </form>
    </div>
  );
}
