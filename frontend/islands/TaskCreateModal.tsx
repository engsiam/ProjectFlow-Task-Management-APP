import { useEffect, useState } from "preact/hooks";
import { getAccessToken, getCurrentUser } from "../lib/auth.ts";
import { getList, post } from "../lib/api.ts";
import { API_BASE_URL } from "../lib/constants.ts";
import { toast } from "../lib/toast.ts";
import type { Priority, Project, Task, TaskStatus } from "../lib/types.ts";
import { Button, Icon } from "../components/ui.tsx";
import FilePicker from "../components/FilePicker.tsx";
import { validateDeadline, validateTaskTitle } from "../lib/validation.ts";

interface PublicUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string | null;
}

const toIsoDate = (date: string) =>
  date ? new Date(`${date}T12:00:00.000Z`).toISOString() : undefined;

export default function TaskCreateModal(
  { projects, projectId, initialStatus, onClose, onCreated }: {
    projects: Project[];
    projectId?: string;
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
  const allowCompletedOnCreate = false;
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    setAssigneeId("");
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject) {
      setAllUsers([]);
      setUserLoading(false);
      return;
    }

    let active = true;
    setAllUsers([]);
    setUserLoading(true);
    getList<PublicUser>("/users/search", { limit: 50 })
      .then((items) => {
        if (active) setAllUsers(items);
      })
      .catch(() => {
        if (active) setAllUsers([]);
      })
      .finally(() => {
        if (active) setUserLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProject]);

  useEffect(() => {
    const currentUserId = getCurrentUser()?.id;
    if (!currentUserId) return;
    if (!allUsers.some((user) => user.id === currentUserId)) return;
    setAssigneeId((value) => value || currentUserId);
  }, [allUsers, selectedProject]);

  async function submit(e: Event) {
    e.preventDefault();
    if (!selectedProject) return setError("Choose a project first.");
    const titleCheck = validateTaskTitle(title, []);
    if (!titleCheck.ok) return setError(titleCheck.message);
    const dueCheck = validateDeadline(toIsoDate(dueDate) ?? null, false);
    if (!dueCheck.ok) return setError(dueCheck.message);
    if (status === "COMPLETED" && !allowCompletedOnCreate) {
      return setError(
        "Tasks cannot be created already completed. Start as To Do and mark done after work is finished.",
      );
    }
    setLoading(true);
    setError("");
    try {
      let created: Task;
      const labelList = labels.split(",").map((label) => label.trim()).filter(
        Boolean,
      );
      if (files.length === 0) {
        created = await post<Task>(`/projects/${selectedProject}/tasks`, {
          title,
          description,
          status,
          priority,
          assigneeId: assigneeId || undefined,
          dueDate: toIsoDate(dueDate),
          labels: labelList,
        }, { loaderMessage: "Creating task…" });
      } else {
        created = await createTaskWithAttachments(
          selectedProject,
          {
            title,
            description,
            status,
            priority,
            assigneeId,
            dueDate,
            labels: labelList,
          },
          files,
        );
      }
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

  async function createTaskWithAttachments(
    projectId: string,
    fields: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: Priority;
      assigneeId: string;
      dueDate: string;
      labels: string[];
    },
    fileList: File[],
  ): Promise<Task> {
    const form = new FormData();
    form.append("title", fields.title);
    if (fields.description) form.append("description", fields.description);
    form.append("status", fields.status);
    form.append("priority", fields.priority);
    if (fields.assigneeId) form.append("assigneeId", fields.assigneeId);
    if (fields.dueDate) form.append("dueDate", toIsoDate(fields.dueDate) ?? "");
    form.append("labels", JSON.stringify(fields.labels));
    for (const f of fileList) form.append("file", f);

    const headers = new Headers();
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(
      `${API_BASE_URL}/projects/${projectId}/tasks/with-attachments`,
      {
        method: "POST",
        headers,
        body: form,
      },
    );
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message = body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : "Upload failed";
      throw new Error(message);
    }
    return (body as { data: Task }).data;
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
            </select>
          </div>
          <div>
            <label class="label">Assignee</label>
            <select
              class="select"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.currentTarget.value)}
              disabled={userLoading}
            >
              <option value="">
                {userLoading ? "Loading users..." : "Unassigned"}
              </option>
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
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
          <div style={{ gridColumn: "1 / -1" }}>
            <label class="label">Attachments</label>
            <FilePicker files={files} onChange={setFiles} compact />
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
