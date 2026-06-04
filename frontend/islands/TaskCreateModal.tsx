import { useEffect, useState } from "preact/hooks";
import { getList, post } from "../lib/api.ts";
import { getCurrentUser } from "../lib/auth.ts";
import { toast } from "../lib/toast.ts";
import type {
  Priority,
  Project,
  ProjectMember,
  Task,
  TaskStatus,
} from "../lib/types.ts";
import { Button, Icon } from "../components/ui.tsx";

const toIsoDate = (date: string) =>
  date ? new Date(`${date}T12:00:00.000Z`).toISOString() : undefined;

export default function TaskCreateModal(
  { projects, projectId, members = [], initialStatus, onClose, onCreated }: {
    projects: Project[];
    projectId?: string;
    members?: ProjectMember[];
    initialStatus?: TaskStatus;
    onClose: () => void;
    onCreated: (task?: Task) => void | Promise<void>;
  },
) {
  const [selectedProject, setSelectedProject] = useState(
    projectId ?? projects[0]?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(initialStatus ?? "TODO");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [loadedMembers, setLoadedMembers] = useState<ProjectMember[]>([]);
  const [error, setError] = useState("");
  const memberOptions = members.length > 0 ? members : loadedMembers;

  useEffect(() => {
    setAssigneeId("");
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject || members.length > 0) {
      setLoadedMembers([]);
      setMemberLoading(false);
      return;
    }

    let active = true;
    setLoadedMembers([]);
    setMemberLoading(true);
    getList<ProjectMember>(`/projects/${selectedProject}/members`, {
      limit: 100,
    })
      .then((items) => {
        if (active) setLoadedMembers(items);
      })
      .catch(() => {
        if (active) setLoadedMembers([]);
      })
      .finally(() => {
        if (active) setMemberLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProject, members.length]);

  useEffect(() => {
    const currentUserId = getCurrentUser()?.id;
    if (
      !currentUserId ||
      !memberOptions.some((member) => member.user.id === currentUserId)
    ) {
      return;
    }
    setAssigneeId((value) => value || currentUserId);
  }, [memberOptions, selectedProject]);

  async function submit(e: Event) {
    e.preventDefault();
    if (!selectedProject) return setError("Choose a project first.");
    if (!title.trim()) return setError("Task title is required.");
    setLoading(true);
    setError("");
    try {
      const created = await post<Task>(`/projects/${selectedProject}/tasks`, {
        title,
        description,
        status,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: toIsoDate(dueDate),
        labels: labels.split(",").map((label) => label.trim()).filter(Boolean),
      });
      toast(`"${title}" created!`, "success");
      await onCreated(created);
      onClose();
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Task could not be created.";
      setError(msg);
      toast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form
        class="modal"
        onSubmit={submit}
        style={{ maxWidth: "640px", padding: "20px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 class="headline" style={{ margin: 0 }}>Create Task</h2>
          <button type="button" class="btn icon-btn" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "14px",
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <label class="label">Project</label>
            <select
              class="select"
              value={selectedProject}
              disabled={Boolean(projectId)}
              onChange={(e) => setSelectedProject(e.currentTarget.value)}
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label class="label">Title</label>
            <input
              class="input"
              value={title}
              onInput={(e) => setTitle(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="label">Status</label>
            <select
              class="select"
              value={status}
              onChange={(e) => setStatus(e.currentTarget.value as TaskStatus)}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div>
            <label class="label">Priority</label>
            <select
              class="select"
              value={priority}
              onChange={(e) => setPriority(e.currentTarget.value as Priority)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          {(memberOptions.length > 0 || memberLoading) && (
            <div>
              <label class="label">Assignee</label>
              <select
                class="select"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.currentTarget.value)}
                disabled={memberLoading}
              >
                <option value="">
                  {memberLoading ? "Loading members..." : "Unassigned"}
                </option>
                {memberOptions.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label class="label">Due date</label>
            <input
              class="input"
              type="date"
              value={dueDate}
              onInput={(e) => setDueDate(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="label">Labels</label>
            <input
              class="input"
              value={labels}
              onInput={(e) => setLabels(e.currentTarget.value)}
              placeholder="api, design"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label class="label">Description</label>
            <textarea
              class="textarea"
              value={description}
              onInput={(e) => setDescription(e.currentTarget.value)}
            />
          </div>
        </div>
        {error && <p class="badge badge-danger">{error}</p>}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "16px",
          }}
        >
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create task"}
          </Button>
        </div>
      </form>
    </div>
  );
}
