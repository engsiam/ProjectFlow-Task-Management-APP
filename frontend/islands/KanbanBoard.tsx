import { useEffect, useState } from "preact/hooks";
import { patch, post } from "../lib/api.ts";
import { getCurrentUser } from "../lib/auth.ts";
import { canCreateTasks, canEditTask, getProjectRole } from "../lib/roles.ts";
import { toast } from "../lib/toast.ts";
import { STATUS_COLUMNS } from "../lib/constants.ts";
import type { Project, Task, TaskStatus } from "../lib/types.ts";
import {
  Avatar,
  Badge,
  fmtDate,
  Icon,
  priorityTone,
} from "../components/ui.tsx";
import TaskDetailModal from "./TaskDetailModal.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";

const priorityBorder: Record<string, string> = {
  URGENT: "var(--danger)",
  HIGH: "var(--danger)",
  MEDIUM: "var(--warning)",
  LOW: "var(--primary)",
};

const priorityLabel: Record<string, string> = {
  URGENT: "Urgent",
  HIGH: "High Priority",
  MEDIUM: "Medium Priority",
  LOW: "Low Priority",
};

export default function KanbanBoard(
  { tasks, projects, onChanged, project }: {
    tasks: Task[];
    projects?: Project[];
    onChanged: () => void;
    project?: Project;
  },
) {
  const [local, setLocal] = useState<Task[]>(tasks);
  const [selected, setSelected] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createColumn, setCreateColumn] = useState<TaskStatus>("TODO");
  const [mobileColumn, setMobileColumn] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUserId(getCurrentUser()?.id ?? null);
  }, []);
  useEffect(() => {
    setLocal(tasks);
  }, [tasks]);

  const projectCtx = project ?? (projects ? projects[0] : undefined);
  const currentRole = getProjectRole(projectCtx, currentUserId);
  const mayEditTask = canEditTask(currentRole);
  const mayCreateTasks = canCreateTasks(currentRole);

  function sync(next: Task[]) {
    setLocal(next);
  }

  async function move(task: Task, status: TaskStatus) {
    if (!mayEditTask) return;
    const previous = local;
    sync(local.map((item) => item.id === task.id ? { ...item, status } : item));
    try {
      await post(`/tasks/${task.id}/move`, { status });
      toast(`Moved to ${status.replace("_", " ")}`, "success");
      onChanged();
    } catch {
      sync(previous);
      toast("Could not move task.", "danger");
    }
  }

  async function quickPatch(task: Task, status: TaskStatus) {
    if (!mayEditTask) return;
    const previous = local;
    sync(local.map((item) => item.id === task.id ? { ...item, status } : item));
    try {
      await patch(`/tasks/${task.id}`, { status });
      toast(`Status updated to ${status.replace("_", " ")}`, "success");
      onChanged();
    } catch {
      sync(previous);
      toast("Could not update status.", "danger");
    }
  }

  const columns = STATUS_COLUMNS.map((column) => ({
    ...column,
    tasks: local.filter((t) => t.status === column.key).sort((a, b) =>
      (a.order ?? 0) - (b.order ?? 0)
    ),
  }));

  function openCreate(status: TaskStatus) {
    setCreateColumn(status);
    setShowCreate(true);
  }

  return (
    <div>
      <div class="mobile-column-indicator">
        {columns.map((col, idx) => (
          <button
            type="button"
            class={idx === mobileColumn ? "active" : ""}
            onClick={() => setMobileColumn(idx)}
          >
            <Icon name={col.icon} size={16} /> {col.label} ({col.tasks.length})
          </button>
        ))}
      </div>
      <div class="kanban-board">
        {columns.map((column, colIdx) => (
          <section
            key={column.key}
            class="kanban-column"
            data-status={column.key}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("drag-over");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("drag-over");
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove("drag-over");
              if (!mayEditTask) return;
              const id = e.dataTransfer?.getData("text/task-id");
              const task = local.find((item) => item.id === id);
              if (task && task.status !== column.key) move(task, column.key);
            }}
          >
            <div class="kanban-column-header">
              <div class="kanban-column-header-left">
                <Icon name={column.icon} size={18} />
                <span style={{ fontSize: "15px", fontWeight: 600 }}>
                  {column.label}
                </span>
                <span class="kanban-count">{column.tasks.length}</span>
              </div>
              {mayCreateTasks && (
                <button
                  type="button"
                  class="kanban-add-btn"
                  onClick={() => openCreate(column.key)}
                  aria-label={`Add task to ${column.label}`}
                >
                  <Icon name="add" size={18} />
                </button>
              )}
            </div>
            <div
              class="kanban-cards"
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {column.tasks.map((task) => (
                <div
                  key={task.id}
                  class={`task-card ${
                    column.key === "DONE" ? "task-done" : ""
                  }`}
                  draggable={mayEditTask && column.key !== "DONE"}
                  onDragStart={(e) => {
                    if (!mayEditTask) return;
                    const dt = e.dataTransfer;
                    if (!dt) return;
                    dt.setData("text/task-id", task.id);
                    dt.effectAllowed = "move";
                  }}
                  onClick={() => setSelected(task)}
                >
                  <div class="task-card-inner">
                    <div class="task-card-header">
                      <Badge tone={priorityTone(task.priority)}>
                        {priorityLabel[task.priority] || task.priority}
                      </Badge>
                      {mayEditTask && column.key !== "DONE" && (
                        <span
                          class="drag-handle"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Icon name="drag_indicator" size={18} />
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>
                      {task.title}
                    </p>
                    {task.labels && task.labels.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        {task.labels.slice(0, 3).map((label) => (
                          <span key={label} class="task-label">{label}</span>
                        ))}
                      </div>
                    )}
                    <div class="task-card-footer">
                      <div class="task-meta">
                        <Avatar user={task.assignee} size={24} />
                        {task.dueDate && (
                          <span
                            class={new Date(task.dueDate) < new Date() &&
                                task.status !== "DONE"
                              ? "overdue"
                              : ""}
                            style={{ fontSize: "12px" }}
                          >
                            {new Date(task.dueDate) < new Date() &&
                                task.status !== "DONE"
                              ? "Overdue"
                              : fmtDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      <div class="task-comment-count">
                        {(task.commentCount ?? 0) > 0 && (
                          <>
                            <Icon name="chat_bubble" size={14} />
                            <span>{task.commentCount}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {mayCreateTasks && (
                <button
                  type="button"
                  class="kanban-add-task"
                  onClick={() => openCreate(column.key)}
                >
                  <Icon name="add" size={16} /> Add task
                </button>
              )}
              {column.tasks.length === 0 && (
                <div class="kanban-dropzone">Drop tasks here</div>
              )}
            </div>
          </section>
        ))}
      </div>
      {selected && (
        <TaskDetailModal
          task={selected}
          projects={projects ?? []}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            onChanged();
          }}
        />
      )}
      {showCreate && projectCtx && (
        <TaskCreateModal
          projects={projectCtx ? [projectCtx] : projects ?? []}
          projectId={projectCtx?.id}
          initialStatus={createColumn}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
