import { useEffect, useMemo, useState } from "preact/hooks";
import { del, getList, patch } from "../lib/api.ts";
import { getCurrentUser } from "../lib/auth.ts";
import { canDeleteTask, canEditTask, getProjectRole } from "../lib/roles.ts";
import { toast } from "../lib/toast.ts";
import type {
  Activity,
  Priority,
  Project,
  Task,
  TaskStatus,
} from "../lib/types.ts";
import {
  Avatar,
  Badge,
  Button,
  fmtDate,
  Icon,
  priorityTone,
  statusTone,
} from "../components/ui.tsx";
import CommentBox from "./CommentBox.tsx";
import ConfirmDialog from "./ConfirmDialog.tsx";
import TaskAttachments from "./TaskAttachments.tsx";

const toIsoDate = (date: string) =>
  date ? new Date(`${date}T12:00:00.000Z`).toISOString() : undefined;

export default function TaskDetailModal(
  { task, projects, onClose, onSaved }: {
    task: Task;
    projects: Project[];
    onClose: () => void;
    onSaved: () => void;
  },
) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate?.slice(0, 10) ?? "");
  const [labels, setLabels] = useState((task.labels ?? []).join(", "));
  const [tab, setTab] = useState<"all" | "comments" | "history">("all");
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activityItems, setActivityItems] = useState<Activity[]>([]);

  useEffect(() => {
    setCurrentUserId(getCurrentUser()?.id ?? null);
  }, []);

  useEffect(() => {
    getList<Activity>(`/tasks/${task.id}/activity`, { limit: 50 }).then(
      (items) => {
        if (Array.isArray(items)) setActivityItems(items);
      },
    ).catch(() => {});
  }, [task.id]);

  const projectRole = useMemo(() => {
    const fullProject = projects.find((p) => p.id === task.projectId);
    const projectContext = fullProject ?? task.project ?? null;
    return getProjectRole(projectContext, currentUserId);
  }, [currentUserId, projects, task.project, task.projectId]);
  const mayEditTask = canEditTask(projectRole);
  const mayDeleteTask = canDeleteTask(projectRole, task, currentUserId);

  const [confirmAction, setConfirmAction] = useState<"delete" | null>(null);

  async function save() {
    if (!mayEditTask) return;
    setError("");
    try {
      await patch(`/tasks/${task.id}`, {
        title,
        description,
        status,
        priority,
        dueDate: toIsoDate(dueDate),
        labels: labels.split(",").map((l) => l.trim()).filter(Boolean),
      });
      toast("Task saved.", "success");
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save task.";
      setError(msg);
      toast(msg, "danger");
    }
  }

  async function remove() {
    if (!mayDeleteTask) return;
    try {
      await del(`/tasks/${task.id}`);
      toast(`"${task.title}" deleted.`, "warning");
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to delete task.";
      setError(msg);
      toast(msg, "danger");
    }
  }

  const statusDotColor = status === "TODO"
    ? "var(--muted)"
    : status === "IN_PROGRESS"
    ? "var(--warning)"
    : status === "REVIEW"
    ? "var(--accent)"
    : "var(--success)";

  return (
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        class="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "1024px",
          maxHeight: "921px",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            height: "64px",
            borderBottom: "1px solid var(--border)",
            background:
              "color-mix(in srgb, var(--surface-2), var(--surface) 40%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                background:
                  "color-mix(in srgb, var(--primary), transparent 85%)",
                color: "var(--primary)",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.03em",
              }}
            >
              PF-{task.id.slice(-4).toUpperCase()}
            </span>
            <Icon
              name="chevron_right"
              size={16}
              style={{ color: "var(--muted)" }}
            />
            <span style={{ fontSize: "16px", fontWeight: 600 }}>
              {task.project?.name ?? "Task"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              class="btn"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "13px" }}
            >
              <Icon name="share" size={18} /> Share
            </button>
            <button
              type="button"
              class="btn"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "13px" }}
            >
              <Icon name="more_horiz" size={18} />
            </button>
            <div
              style={{
                width: "1px",
                height: "24px",
                background: "var(--border)",
              }}
            />
            <button
              type="button"
              class="btn icon-btn"
              onClick={onClose}
              style={{ width: "32px", height: "32px", minHeight: "32px" }}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Main Column */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {/* Title */}
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: "32px",
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>

            {/* Status Chips */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  cursor: mayEditTask ? "pointer" : "default",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background: statusDotColor,
                    boxShadow: `0 0 8px ${statusDotColor}40`,
                  }}
                />
                <span style={{ fontSize: "14px" }}>
                  {status.replace("_", " ")}
                </span>
                {mayEditTask && (
                  <Icon
                    name="expand_more"
                    size={16}
                    style={{ color: "var(--muted)" }}
                  />
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon
                  name="priority_high"
                  size={18}
                  style={{
                    color: priority === "URGENT" || priority === "HIGH"
                      ? "var(--danger)"
                      : "var(--muted)",
                  }}
                />
                <span style={{ fontSize: "14px" }}>{priority} Priority</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon
                  name="calendar_today"
                  size={18}
                  style={{ color: "var(--muted)" }}
                />
                <span style={{ fontSize: "14px" }}>
                  {fmtDate(dueDate || task.dueDate)}
                </span>
              </div>
            </div>

            {/* Description */}
            {(description || mayEditTask) && (
              <section style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--muted)",
                    marginBottom: "12px",
                  }}
                >
                  <Icon name="subject" size={18} />
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    Description
                  </span>
                </div>
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "8px",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {mayEditTask
                    ? (
                      <textarea
                        class="textarea"
                        value={description}
                        onInput={(e) => setDescription(e.currentTarget.value)}
                        style={{ minHeight: "100px" }}
                      />
                    )
                    : (
                      <p
                        style={{
                          margin: 0,
                          color: "var(--muted)",
                          lineHeight: 1.6,
                        }}
                      >
                        {description || "No description provided."}
                      </p>
                    )}
                </div>
              </section>
            )}

            {/* Attachments */}
            <section style={{ marginBottom: "24px" }}>
              <TaskAttachments
                taskId={task.id}
                currentUserRole={projectRole}
                currentUserId={currentUserId}
                projectOwnerId={projects.find((p) => p.id === task.projectId)
                  ?.ownerId ?? task.project?.ownerId ?? null}
              />
            </section>

            {/* Activity Section */}
            <section>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--muted)",
                  }}
                >
                  <Icon name="forum" size={18} />
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    Activity
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    padding: "4px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {(["all", "comments", "history"] as const).map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setTab(item)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: 0,
                        background: tab === item
                          ? "var(--card)"
                          : "transparent",
                        color: tab === item ? "var(--text)" : "var(--muted)",
                        fontWeight: 600,
                        fontSize: "11px",
                        textTransform: "capitalize",
                        boxShadow: tab === item
                          ? "0 1px 3px rgba(0,0,0,0.08)"
                          : "none",
                        cursor: "pointer",
                      }}
                    >
                      {item === "all"
                        ? "All"
                        : item === "comments"
                        ? "Comments"
                        : "History"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments (CommentBox hides the form for VIEWER) */}
              {(tab === "all" || tab === "comments") && (
                <CommentBox taskId={task.id} />
              )}

              {/* Activity Timeline */}
              <div style={{ position: "relative", paddingLeft: "48px" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "15px",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    background: "var(--border)",
                  }}
                />
                {(tab === "all" || tab === "history") &&
                  activityItems.map((item) => (
                    <div
                      key={item.id}
                      style={{ position: "relative", marginBottom: "16px" }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "-36px",
                          top: 0,
                          width: "32px",
                          height: "32px",
                          borderRadius: "999px",
                          border: "2px solid var(--border)",
                          background: "var(--surface-2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {item.actor?.name
                          ? <Avatar user={item.actor} size={28} />
                          : (
                            <Icon
                              name="edit"
                              size={14}
                              style={{ color: "var(--muted)" }}
                            />
                          )}
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "4px",
                          }}
                        >
                          <strong style={{ fontSize: "14px" }}>
                            {item.actor?.name ?? "System"}
                          </strong>
                          <span
                            style={{ fontSize: "12px", color: "var(--muted)" }}
                          >
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            color: "var(--muted)",
                          }}
                        >
                          {item.action.replaceAll("_", " ").toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside
            style={{
              width: "320px",
              flexShrink: 0,
              background:
                "color-mix(in srgb, var(--surface-2), var(--surface) 30%)",
              borderLeft: "1px solid var(--border)",
              padding: "24px",
              overflowY: "auto",
            }}
          >
            {/* Assignee */}
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Assignee
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <Avatar user={task.assignee} size={40} />
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
                    {task.assignee?.name ?? "Unassigned"}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "12px",
                      color: "var(--muted)",
                    }}
                  >
                    {task.assignee?.email ?? "No owner yet"}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Metadata
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>Project</span>
                  <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                    {task.project?.name ?? "N/A"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>Due Date</span>
                  <span>{fmtDate(dueDate || task.dueDate)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>Priority</span>
                  <Badge tone={priorityTone(priority)}>{priority}</Badge>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>Labels</span>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                      maxWidth: "160px",
                      justifyContent: "flex-end",
                    }}
                  >
                    {(labels
                      ? labels.split(",").map((l) => l.trim()).filter(Boolean)
                      : []).map((l) => (
                        <span
                          key={l}
                          style={{
                            padding: "2px 6px",
                            borderRadius: "999px",
                            background:
                              "color-mix(in srgb, var(--primary), transparent 85%)",
                            color: "var(--primary)",
                            fontSize: "10px",
                            fontWeight: 700,
                            border:
                              "1px solid color-mix(in srgb, var(--primary), transparent 75%)",
                          }}
                        >
                          {l}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Subtasks Progress */}
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Execution Progress
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  marginBottom: "8px",
                }}
              >
                <span>Subtasks</span>
                <span style={{ color: "var(--muted)" }}>0 / 0</span>
              </div>
              <div
                style={{
                  height: "6px",
                  borderRadius: "999px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: "inherit",
                    background:
                      "linear-gradient(90deg, var(--primary), var(--accent))",
                    width: "0%",
                  }}
                />
              </div>
            </div>

            {/* Notifications toggle */}
            <div
              style={{
                paddingTop: "24px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--muted)",
                }}
              >
                <Icon name="notifications_active" size={18} />
                <span style={{ fontSize: "13px" }}>Notifications</span>
              </div>
              <div
                style={{
                  width: "40px",
                  height: "20px",
                  borderRadius: "999px",
                  background:
                    "color-mix(in srgb, var(--primary), transparent 60%)",
                  position: "relative",
                  cursor: "pointer",
                  border:
                    "1px solid color-mix(in srgb, var(--primary), transparent 40%)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    right: "2px",
                    top: "1px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "999px",
                    background: "var(--primary)",
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            {mayEditTask && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={save}
                  style={{ fontSize: "13px", minHeight: "36px" }}
                >
                  <Icon name="content_copy" size={18} /> Save
                </button>
                {mayDeleteTask && (
                  <button
                    type="button"
                    class="btn btn-danger"
                    onClick={() => setConfirmAction("delete")}
                    style={{ fontSize: "13px", minHeight: "36px" }}
                  >
                    <Icon name="delete" size={18} /> Delete
                  </button>
                )}
              </div>
            )}
            {error && (
              <p
                style={{
                  margin: "8px 0 0",
                  color: "var(--danger)",
                  fontSize: "13px",
                }}
              >
                {error}
              </p>
            )}
          </aside>
        </div>
      </div>
      {confirmAction === "delete" && (
        <ConfirmDialog
          title="Delete task"
          body={`Are you sure you want to delete "${task.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            setConfirmAction(null);
            await remove();
          }}
        />
      )}
    </div>
  );
}
