import { Icon } from "../components/ui.tsx";

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  createdAt?: string | null;
  startDate?: string | null;
  priority: string;
  assignee?: { id: string; name: string; avatar?: string } | null;
}

interface Props {
  tasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "var(--muted)",
  IN_PROGRESS: "var(--info)",
  COMPLETED: "var(--success)",
};

export default function ProjectTimeline({ tasks }: Props) {
  if (!tasks || tasks.length === 0) {
    return (
      <div class="pt-empty">
        <Icon name="timeline" size={32} />
        <h3>No tasks to display</h3>
        <p>Create tasks with start and due dates to see the timeline.</p>
      </div>
    );
  }

  const now = new Date();
  const sorted = [...tasks].sort((a, b) => {
    const aDate = a.startDate || a.createdAt || a.dueDate || "";
    const bDate = b.startDate || b.createdAt || b.dueDate || "";
    return aDate.localeCompare(bDate);
  });

  const datedTasks = sorted.filter((t) => t.startDate || t.dueDate || t.createdAt);
  if (datedTasks.length === 0) {
    return (
      <div class="pt-empty">
        <Icon name="timeline" size={32} />
        <h3>No dated tasks</h3>
        <p>Set start and due dates on tasks to visualize them on the timeline.</p>
      </div>
    );
  }

  const allDates = datedTasks.flatMap((t) => {
    const dates: string[] = [];
    if (t.startDate) dates.push(t.startDate);
    if (t.createdAt) dates.push(t.createdAt);
    if (t.dueDate) dates.push(t.dueDate);
    return dates;
  });
  allDates.sort();

  const timelineStart = new Date(allDates[0]);
  timelineStart.setDate(timelineStart.getDate() - 2);
  const timelineEnd = new Date(allDates[allDates.length - 1]);
  timelineEnd.setDate(timelineEnd.getDate() + 2);
  const totalDays = Math.max(1, Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / 86400000));

  const weeks: { start: Date; end: Date; label: string }[] = [];
  const cursor = new Date(timelineStart);
  while (cursor < timelineEnd) {
    const weekStart = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
    const weekEnd = cursor > timelineEnd ? new Date(timelineEnd) : new Date(cursor);
    weeks.push({
      start: weekStart,
      end: weekEnd,
      label: weekStart.toLocaleDateString("default", { month: "short", day: "numeric" }),
    });
  }

  const todayX = ((now.getTime() - timelineStart.getTime()) / (totalDays * 86400000)) * 100;

  return (
    <div class="pt-container">
      <div class="pt-header">
        <div class="pt-header-left">
          <h3 class="pt-title"><Icon name="timeline" size={18} /> Project Timeline</h3>
          <span class="pt-count">{datedTasks.length} task{datedTasks.length > 1 ? "s" : ""}</span>
        </div>
        <div class="pt-legend">
          <span class="pt-legend-item"><span class="pt-legend-dot" style="background:var(--success)" /> Done</span>
          <span class="pt-legend-item"><span class="pt-legend-dot" style="background:var(--info)" /> In Progress</span>
          <span class="pt-legend-item"><span class="pt-legend-dot" style="background:var(--muted)" /> To Do</span>
        </div>
      </div>

      <div class="pt-body">
        <div class="pt-week-labels">
          {weeks.map((w, i) => (
            <div key={i} class="pt-week-label" style={`flex:${Math.max(1, Math.ceil((w.end.getTime() - w.start.getTime()) / (totalDays * 86400000) * 100))}`}>
              {w.label}
            </div>
          ))}
        </div>

        <div class="pt-timeline-track">
          {weeks.map((w, i) => (
            <div key={i} class="pt-week-segment" style={`flex:${Math.max(1, Math.ceil((w.end.getTime() - w.start.getTime()) / (totalDays * 86400000) * 100))}`} />
          ))}
          {todayX > 0 && todayX < 100 && (
            <div class="pt-today-line" style={`left:${todayX}%`}>
              <div class="pt-today-label">Today</div>
            </div>
          )}
        </div>

        <div class="pt-rows">
          {datedTasks.map((task) => {
            const taskStart = task.startDate || task.createdAt || task.dueDate || allDates[0];
            const taskEnd = task.dueDate || task.startDate || task.createdAt || allDates[allDates.length - 1];
            const startPos = Math.max(0, ((new Date(taskStart).getTime() - timelineStart.getTime()) / (totalDays * 86400000)) * 100);
            const endPos = Math.min(100, ((new Date(taskEnd).getTime() - timelineStart.getTime()) / (totalDays * 86400000)) * 100);
            const width = Math.max(3, endPos - startPos);
            const color = STATUS_COLORS[task.status] || "var(--muted)";
            const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== "COMPLETED";

            return (
              <div key={task.id} class="pt-row">
                <div class="pt-row-info">
                  <div class="pt-row-title">
                    <span class="pt-row-dot" style={`background:${color}`} />
                    <span class="pt-row-name">{task.title}</span>
                    {isOverdue && <span class="pt-overdue-badge">Overdue</span>}
                  </div>
                  <div class="pt-row-dates">
                    {taskStart && <span>{new Date(taskStart).toLocaleDateString()}</span>}
                    <span> → </span>
                    {taskEnd && <span>{new Date(taskEnd).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div class="pt-bar-track">
                  <div class="pt-bar" style={`left:${startPos}%;width:${width}%;background:${color}${isOverdue ? ";opacity:0.8" : ""}`}>
                    <div class="pt-bar-inner" />
                  </div>
                  {isOverdue && (
                    <div class="pt-bar-overdue" style={`left:${endPos}%`}>
                      <span style="font-size:9px;color:#ef4444">!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
