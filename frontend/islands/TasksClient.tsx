import { useEffect, useMemo, useState } from "preact/hooks";
import { getList } from "../lib/api.ts";
import { getCurrentUser, requireClientAuth } from "../lib/auth.ts";
import { toast } from "../lib/toast.ts";
import { canCreateTasks, getProjectRole } from "../lib/roles.ts";
import type { Priority, Project, Task, TaskStatus } from "../lib/types.ts";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  fmtDate,
  Icon,
  priorityTone,
  Skeleton,
  statusTone,
} from "../components/ui.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";
import TaskDetailModal from "./TaskDetailModal.tsx";

const GLOBAL_TASK_LOAD_TIMEOUT_MS = 9_000;
const PROJECT_TASK_LOAD_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }) as Promise<T | null>;
}

function attachProject(task: Task, project: Project): Task {
  return task.project ? task : { ...task, project };
}

export default function TasksClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadNotice, setLoadNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [label, setLabel] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function load() {
    requireClientAuth();
    setLoading(true);
    setLoadNotice("");
    try {
      const projectList = await getList<Project>("/projects", { limit: 100 });
      setProjects(projectList);
      try {
        const directTasks = await withTimeout(
          getList<Task>("/tasks", { limit: 100, sort: "-updatedAt" }),
          GLOBAL_TASK_LOAD_TIMEOUT_MS,
        );
        if (directTasks) {
          setTasks(directTasks);
          return;
        }
      } catch {
        // Fall back to project-by-project loading for older backend instances.
      }

      const batches = await Promise.all(
        projectList.map(async (project) => {
          try {
            const result = await withTimeout(
              getList<Task>(`/projects/${project.id}/tasks`, { limit: 100 }),
              PROJECT_TASK_LOAD_TIMEOUT_MS,
            );
            if (!result) {
              return { tasks: [] as Task[], delayed: true, failed: false };
            }
            return {
              tasks: result.map((task) => attachProject(task, project)),
              delayed: false,
              failed: false,
            };
          } catch {
            return { tasks: [] as Task[], delayed: false, failed: true };
          }
        }),
      );
      setTasks(batches.flatMap((batch) => batch.tasks));
      const delayed = batches.filter((batch) => batch.delayed).length;
      const failed = batches.filter((batch) => batch.failed).length;
      if (delayed || failed) {
        setLoadNotice(
          "Some project task lists are still syncing. Showing the tasks that responded.",
        );
      }
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Tasks could not be loaded.";
      setProjects([]);
      setTasks([]);
      setLoadNotice(msg);
      toast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (typeof globalThis.location === "undefined") return;
    const params = new URLSearchParams(globalThis.location.search);
    setQuery(params.get("search") ?? params.get("q") ?? "");
  }, []);

  useEffect(() => {
    setCurrentUserId(getCurrentUser()?.id ?? null);
  }, []);

  useEffect(() => {
    if (typeof history === "undefined" || typeof location === "undefined") {
      return;
    }
    if (location.pathname !== "/tasks") return;
    const url = new URL(location.href);
    if (query) {
      url.searchParams.set("search", query);
    } else {
      url.searchParams.delete("search");
      url.searchParams.delete("q");
    }
    history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [query]);

  const creatableProjects = projects.filter((project) =>
    canCreateTasks(getProjectRole(project, currentUserId))
  );

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
      return (!query || text.includes(query.toLowerCase())) &&
        (!status || task.status === status) &&
        (!priority || task.priority === priority) &&
        (!label ||
          task.labels?.some((item) =>
            item.toLowerCase().includes(label.toLowerCase())
          ));
    });
  }, [tasks, query, status, priority, label]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: "16px" }}>
        <Skeleton height={104} />
        <Skeleton height={420} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <p class="mono page-kicker">TASK OPERATIONS</p>
          <h2 class="headline" style={{ margin: "2px 0 0", fontSize: "32px" }}>
            Tasks
          </h2>
        </div>
        {creatableProjects.length > 0 && (
          <Button
            variant="primary"
            onClick={() => setOpen(true)}
          >
            <Icon name="add_task" size={18} /> New Task
          </Button>
        )}
      </section>
      {loadNotice && (
        <section
          class="panel"
          style={{ padding: "12px 14px", color: "var(--muted)" }}
        >
          {loadNotice}
        </section>
      )}
      {tasks.length > 0 && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          {(["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const).map((s) => {
            const count = tasks.filter((t) => t.status === s).length;
            return (
              <div
                class="panel"
                style={{ padding: "14px", textAlign: "center" }}
              >
                <p class="mono page-kicker">{s.replace("_", " ")}</p>
                <strong style={{ fontSize: "24px" }}>{count}</strong>
              </div>
            );
          })}
        </section>
      )}
      <section
        class="panel"
        style={{
          padding: "12px",
          display: "grid",
          gridTemplateColumns: "2fr repeat(3, minmax(140px, 1fr))",
          gap: "10px",
        }}
      >
        <input
          class="input"
          placeholder="Search tasks..."
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <select
          class="select"
          value={status}
          onChange={(e) => setStatus(e.currentTarget.value as TaskStatus | "")}
        >
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REVIEW">Review</option>
          <option value="DONE">Done</option>
        </select>
        <select
          class="select"
          value={priority}
          onChange={(e) => setPriority(e.currentTarget.value as Priority | "")}
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <input
          class="input"
          placeholder="Label"
          value={label}
          onInput={(e) => setLabel(e.currentTarget.value)}
        />
      </section>
      {filtered.length === 0
        ? (
          <EmptyState
            icon="search_off"
            title="No tasks match"
            body="Adjust filters or create a new task."
          />
        )
        : (
          <div class="card" style={{ overflow: "auto" }}>
            <table class="task-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th>Assignee</th>
                  <th>Labels</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => (
                  <tr
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelected(task)}
                  >
                    <td>
                      <div style={{ display: "grid", gap: "2px" }}>
                        <span class="mono page-kicker">
                          TSK-{task.id.slice(-4).toUpperCase()}
                        </span>
                        <strong>{task.title}</strong>
                        <span
                          style={{ color: "var(--muted)", fontSize: "12px" }}
                        >
                          {task.project?.name ?? ""}
                        </span>
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
                    <td style={{ color: "var(--muted)", fontSize: "13px" }}>
                      {fmtDate(task.dueDate)}
                    </td>
                    <td>
                      <Avatar user={task.assignee} size={28} />
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        {task.labels?.slice(0, 3).map((item) => (
                          <Badge key={item}>{item}</Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {open && (
        <TaskCreateModal
          projects={creatableProjects}
          onClose={() => setOpen(false)}
          onCreated={(task) => {
            if (task) {
              const project = projects.find((item) =>
                item.id === task.projectId
              );
              setTasks((current) => [
                project ? attachProject(task, project) : task,
                ...current,
              ]);
            }
            load();
          }}
        />
      )}
      {selected && (
        <TaskDetailModal
          task={selected}
          projects={projects}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
