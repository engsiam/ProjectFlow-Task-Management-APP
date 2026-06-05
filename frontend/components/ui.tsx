import type { ComponentChildren } from "preact";
import type {
  Priority,
  ProjectStatus,
  TaskStatus,
  User,
} from "../lib/types.ts";

export function Icon(
  { name, size = 22, style }: {
    name: string;
    size?: number;
    style?: Record<string, string>;
  },
) {
  return (
    <span
      class="material-symbols-outlined"
      style={{ fontSize: `${size}px`, ...style }}
    >
      {name}
    </span>
  );
}

export function Button(
  props: {
    children: ComponentChildren;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    type?: "button" | "submit";
    disabled?: boolean;
    onClick?: () => void;
    class?: string;
  },
) {
  const variant = props.variant ?? "secondary";
  const cls = variant === "primary"
    ? "btn btn-primary"
    : variant === "danger"
    ? "btn btn-danger"
    : variant === "ghost"
    ? "btn"
    : "btn btn-secondary";
  return (
    <button
      type={props.type ?? "button"}
      disabled={props.disabled}
      onClick={props.onClick}
      class={`${cls} ${props.class ?? ""}`}
    >
      {props.children}
    </button>
  );
}

export function Badge(
  { children, tone = "neutral" }: {
    children: ComponentChildren;
    tone?: "neutral" | "success" | "warning" | "danger";
  },
) {
  const toneClass = tone === "success"
    ? "badge-success"
    : tone === "warning"
    ? "badge-warning"
    : tone === "danger"
    ? "badge-danger"
    : "";
  return <span class={`badge ${toneClass}`}>{children}</span>;
}

export function Avatar(
  { user, size = 32 }: { user?: Partial<User> | null; size?: number },
) {
  const initials = (user?.name ?? user?.email ?? "PF")
    .split(/[ @._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PF";
  return (
    <span class="avatar" style={{ width: `${size}px`, height: `${size}px` }}>
      {user?.avatarUrl || user?.avatar
        ? (
          <img
            src={user.avatarUrl ?? user.avatar ?? ""}
            alt={user.name ?? "User"}
          />
        )
        : initials}
    </span>
  );
}

export function ProgressBar({ value }: { value?: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <div class="progress-track" aria-label={`Progress ${safe}%`}>
      <div class="progress-fill" style={{ width: `${safe}%` }} />
    </div>
  );
}

export function Skeleton({ height = 96 }: { height?: number }) {
  return (
    <div
      class="panel"
      style={{
        height: `${height}px`,
        background:
          "linear-gradient(90deg, var(--surface), color-mix(in srgb, var(--border), transparent 55%), var(--surface))",
        backgroundSize: "220% 100%",
      }}
    />
  );
}

export function EmptyState(
  { icon, title, body }: { icon: string; title: string; body: string },
) {
  return (
    <div
      class="panel"
      style={{ padding: "28px", textAlign: "center", color: "var(--muted)" }}
    >
      <Icon name={icon} size={36} />
      <h3
        class="headline"
        style={{ color: "var(--text)", margin: "12px 0 4px" }}
      >
        {title}
      </h3>
      <p style={{ margin: 0 }}>{body}</p>
    </div>
  );
}

export function priorityTone(priority?: Priority) {
  if (priority === "HIGH") return "danger";
  if (priority === "MEDIUM") return "warning";
  return "neutral";
}

export function statusTone(status?: TaskStatus | ProjectStatus) {
  if (status === "COMPLETED") return "success";
  if (status === "IN_PROGRESS") return "warning";
  if (status === "ARCHIVED" || status === "ON_HOLD") return "danger";
  return "neutral";
}

export function fmtDate(date?: string | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" })
    .format(new Date(date));
}

export function LoadingSpinner(
  { size, label }: { size?: "sm" | "lg"; label?: string },
) {
  const cls = size === "lg" ? "spinner spinner-lg" : "spinner";
  return (
    <div class="loading-screen">
      <div class={cls} />
      {label && <p style={{ margin: 0, fontSize: "14px" }}>{label}</p>}
    </div>
  );
}

export function StatCard(
  { icon, label, value, hint }: {
    icon: string;
    label: string;
    value: string | number;
    hint?: string;
  },
) {
  return (
    <div class="card stat-card">
      <div class="stat-card-head">
        <div class="stat-icon-tile">
          <Icon name={icon} size={18} />
        </div>
        <div class="stat-sparkline" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div>
        <p class="mono stat-card-label">{label}</p>
        <strong class="headline stat-card-value">{value}</strong>
      </div>
      {hint && <p class="stat-card-hint">{hint}</p>}
    </div>
  );
}
