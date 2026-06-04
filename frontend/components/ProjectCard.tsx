import { useRef, useState } from "preact/hooks";
import { del, post } from "../lib/api.ts";
import { getProjectRole } from "../lib/roles.ts";
import { toast } from "../lib/toast.ts";
import type { Project } from "../lib/types.ts";
import { Avatar, Icon } from "./ui.tsx";

function projectHealth(project: Project): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (project.status === "COMPLETED") return { label: "Completed", tone: "success" };
  if (project.status === "ARCHIVED") return { label: "Archived", tone: "neutral" };
  const pct = project.progress ?? 0;
  if (pct >= 80) return { label: "On Track", tone: "success" };
  if (pct >= 30) return { label: "At Risk", tone: "warning" };
  return { label: "Delayed", tone: "danger" };
}

function SegmentedProgress({ taskStats }: { taskStats?: Project["taskStats"] }) {
  if (!taskStats || taskStats.total === 0) return null;
  const { total, todo, inProgress, review, done } = taskStats;
  const segments = [
    { value: done / total * 100, color: "var(--success)" },
    { value: review / total * 100, color: "var(--accent)" },
    { value: inProgress / total * 100, color: "var(--warning)" },
    { value: todo / total * 100, color: "var(--surface-2)" },
  ].filter((s) => s.value > 0);

  return (
    <div class="pc-progress-track">
      {segments.map((seg, i) => (
        <div
          key={i}
          class="pc-progress-seg"
          style={{ width: `${seg.value}%`, background: seg.color }}
        />
      ))}
    </div>
  );
}

interface CardAction {
  label: string;
  icon: string;
  danger?: boolean;
  onClick: () => void;
}

function ContextMenu({ actions }: { actions: CardAction[] }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div class="pc-ctx" ref={menuRef}>
      <button
        type="button"
        class="pc-ctx-trigger"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Project actions"
      >
        <Icon name="more_horiz" size={18} />
      </button>
      {open && (
        <>
          <div class="pc-ctx-backdrop" onClick={() => setOpen(false)} />
          <div class="pc-ctx-menu" role="menu">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                class={`pc-ctx-item ${action.danger ? "pc-ctx-item--danger" : ""}`}
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); setOpen(false); action.onClick(); }}
              >
                <Icon name={action.icon} size={16} />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ProjectCard(
  { project, currentUserId, onChanged }: {
    project: Project;
    currentUserId: string | null;
    onChanged: () => void;
  },
) {
  const projectRole = getProjectRole(project, currentUserId);
  const health = projectHealth(project);
  const memberCount = project.members?.length ?? 0;
  const visibleMembers = project.members?.slice(0, 3) ?? [];
  const extraCount = memberCount - visibleMembers.length;
  const openTasks = project.taskStats
    ? project.taskStats.total - project.taskStats.done
    : 0;
  const completedTasks = project.taskStats?.done ?? 0;

  async function archive() {
    if (!confirm(`Archive ${project.name}?`)) return;
    try {
      await post(`/projects/${project.id}/archive`);
      toast(`"${project.name}" archived.`, "success");
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unable to archive.", "danger");
    }
  }

  async function remove() {
    if (!confirm(`Delete ${project.name}? This cannot be undone.`)) return;
    try {
      await del(`/projects/${project.id}`);
      toast(`"${project.name}" deleted.`, "warning");
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unable to delete.", "danger");
    }
  }

  const actions: CardAction[] = [
    { label: "Open", icon: "arrow_outward", onClick: () => { location.href = `/projects/${project.id}`; } },
  ];
  if (projectRole === "ADMIN") {
    actions.push(
      { label: "Archive", icon: "archive", onClick: archive },
      { label: "Delete", icon: "delete", danger: true, onClick: remove },
    );
  }

  const progress = project.progress ?? 0;

  return (
    <article class="pc">
      {/* Header */}
      <div class="pc-header">
        <div class="pc-header-left">
          <span class="pc-icon">
            <Icon name="folder" size={18} />
          </span>
          <a href={`/projects/${project.id}`} class="pc-title">
            {project.name}
          </a>
        </div>
        <div class="pc-header-right">
          <span class={`pc-badge pc-badge--${health.tone}`}>{health.label}</span>
          <ContextMenu actions={actions} />
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p class="pc-desc">{project.description}</p>
      )}

      {/* Meta row */}
      <div class="pc-meta">
        <div class="pc-meta-left">
          <Avatar user={project.owner} size={22} />
          {memberCount > 0 && (
            <div class="pc-avatars">
              {visibleMembers.map((m) => (
                <Avatar key={m.id} user={m.user} size={22} />
              ))}
              {extraCount > 0 && (
                <span class="pc-extra-count">+{extraCount}</span>
              )}
            </div>
          )}
        </div>
        <div class="pc-meta-right">
          {project.updatedAt && (
            <span class="pc-meta-item">
              <Icon name="schedule" size={14} />
              {fmtRelative(project.updatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Segmented progress */}
      <div class="pc-progress-area">
        <SegmentedProgress taskStats={project.taskStats} />
        <div class="pc-progress-stats">
          <span class="pc-pct">{Math.round(progress)}%</span>
          <span class="pc-task-count">{openTasks} open · {completedTasks} closed</span>
        </div>
      </div>
    </article>
  );
}

function fmtRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}
