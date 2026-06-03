import type { ComponentChildren } from "preact";
import type { Priority, ProjectStatus, TaskStatus, User } from "../lib/types.ts";

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return <span class="material-symbols-outlined" style={{ fontSize: `${size}px` }}>{name}</span>;
}

export function Button(
  props: {
    children: ComponentChildren;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    type?: "button" | "submit";
    disabled?: boolean;
    onClick?: () => void;
    class?: string;
  }
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
  }
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

export function Avatar({ user, size = 32 }: { user?: Partial<User> | null; size?: number }) {
  const initials = (user?.name ?? user?.email ?? "PF")
    .split(/[ @._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PF";
  return (
    <span class="avatar" style={{ width: `${size}px`, height: `${size}px` }}>
      {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name ?? "User"} /> : initials}
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
        backgroundSize: "220% 100%"
      }}
    />
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div class="panel" style={{ padding: "28px", textAlign: "center", color: "var(--muted)" }}>
      <Icon name={icon} size={36} />
      <h3 class="headline" style={{ color: "var(--text)", margin: "12px 0 4px" }}>{title}</h3>
      <p style={{ margin: 0 }}>{body}</p>
    </div>
  );
}

export function priorityTone(priority?: Priority) {
  if (priority === "URGENT" || priority === "HIGH") return "danger";
  if (priority === "MEDIUM") return "warning";
  return "neutral";
}

export function statusTone(status?: TaskStatus | ProjectStatus) {
  if (status === "DONE" || status === "COMPLETED") return "success";
  if (status === "REVIEW" || status === "IN_PROGRESS") return "warning";
  if (status === "ARCHIVED") return "danger";
  return "neutral";
}

export function fmtDate(date?: string | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

export function StatCard(
  { icon, label, value, hint }: { icon: string; label: string; value: string | number; hint?: string }
) {
  return (
    <div class="card" style={{ padding: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <p class="mono" style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>{label}</p>
          <strong class="headline" style={{ fontSize: "28px" }}>{value}</strong>
        </div>
        <span class="brand-mark" style={{ width: "36px", height: "36px" }}><Icon name={icon} size={20} /></span>
      </div>
      {hint && <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: "13px" }}>{hint}</p>}
    </div>
  );
}
