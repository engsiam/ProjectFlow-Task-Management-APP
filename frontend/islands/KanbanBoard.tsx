import { useEffect, useState } from "preact/hooks";
import { patch, post } from "../lib/api.ts";
import { STATUS_COLUMNS } from "../lib/constants.ts";
import type { Project, Task, TaskStatus } from "../lib/types.ts";
import { Avatar, Badge, fmtDate, Icon, priorityTone } from "../components/ui.tsx";
import TaskDetailModal from "./TaskDetailModal.tsx";

export default function KanbanBoard({ tasks, projects, onChanged }: { tasks: Task[]; projects?: Project[]; onChanged: () => void }) {
  const [local, setLocal] = useState<Task[]>(tasks);
  const [selected, setSelected] = useState<Task | null>(null);

  useEffect(() => {
    setLocal(tasks);
  }, [tasks]);

  function sync(next: Task[]) {
    setLocal(next);
  }

  async function move(task: Task, status: TaskStatus) {
    const previous = local;
    const next = local.map((item) => item.id === task.id ? { ...item, status } : item);
    sync(next);
    try {
      await post(`/tasks/${task.id}/move`, { status });
      onChanged();
    } catch {
      sync(previous);
      alert("Could not move task. The board was restored.");
    }
  }

  async function quickPatch(task: Task, status: TaskStatus) {
    const previous = local;
    sync(local.map((item) => item.id === task.id ? { ...item, status } : item));
    try {
      await patch(`/tasks/${task.id}`, { status });
      onChanged();
    } catch {
      sync(previous);
    }
  }

  return (
    <div class="kanban-board">
      {STATUS_COLUMNS.map((column) => {
        const columnTasks = local.filter((task) => task.status === column.key).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return (
          <section
            class="kanban-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer?.getData("text/task-id");
              const task = local.find((item) => item.id === id);
              if (task) move(task, column.key);
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name={column.icon} size={18} />
                <strong>{column.label}</strong>
              </div>
              <Badge>{columnTasks.length}</Badge>
            </div>
            <div style={{ display: "grid", gap: "10px" }}>
              {columnTasks.map((task) => (
                <article
                  class={`task-card priority-${task.priority}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer?.setData("text/task-id", task.id)}
                  onClick={() => setSelected(task)}
                >
                  <div style={{ paddingLeft: "8px", display: "grid", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                      <strong>{task.title}</strong>
                      <button class="btn icon-btn" style={{ minHeight: "28px", width: "28px" }} onClick={(e) => { e.stopPropagation(); setSelected(task); }}>
                        <Icon name="open_in_new" size={16} />
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                      <Badge>{fmtDate(task.dueDate)}</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        {task.labels?.slice(0, 2).map((label) => <span class="badge">{label}</span>)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "var(--muted)", fontSize: "12px" }}><Icon name="chat_bubble" size={14} /> {task.commentCount ?? 0}</span>
                        <Avatar user={task.assignee} size={28} />
                      </div>
                    </div>
                    <select
                      class="select"
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => quickPatch(task, e.currentTarget.value as TaskStatus)}
                    >
                      {STATUS_COLUMNS.map((item) => <option value={item.key}>{item.label}</option>)}
                    </select>
                  </div>
                </article>
              ))}
              {columnTasks.length === 0 && (
                <div class="panel" style={{ padding: "20px", color: "var(--muted)", textAlign: "center" }}>
                  Drop tasks here
                </div>
              )}
            </div>
          </section>
        );
      })}
      {selected && <TaskDetailModal task={selected} projects={projects ?? []} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); onChanged(); }} />}
    </div>
  );
}
