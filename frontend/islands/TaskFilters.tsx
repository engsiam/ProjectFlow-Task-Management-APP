import type { Priority, TaskStatus } from "../lib/types.ts";

export default function TaskFilters(
  { onChange }: { onChange: (filters: { query?: string; status?: TaskStatus | ""; priority?: Priority | ""; label?: string }) => void }
) {
  return (
    <div class="panel" style={{ padding: "12px", display: "grid", gridTemplateColumns: "2fr repeat(3, minmax(140px, 1fr))", gap: "10px" }}>
      <input class="input" placeholder="Search tasks..." onInput={(e) => onChange({ query: e.currentTarget.value })} />
      <select class="select" onChange={(e) => onChange({ status: e.currentTarget.value as TaskStatus | "" })}>
        <option value="">All statuses</option>
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="REVIEW">Review</option>
        <option value="DONE">Done</option>
      </select>
      <select class="select" onChange={(e) => onChange({ priority: e.currentTarget.value as Priority | "" })}>
        <option value="">All priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>
      <input class="input" placeholder="Label" onInput={(e) => onChange({ label: e.currentTarget.value })} />
    </div>
  );
}
