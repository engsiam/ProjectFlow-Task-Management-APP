import { Icon } from "../components/ui.tsx";

interface Task {
  status: string;
  dueDate?: string | null;
  assignee?: { id: string; name: string } | null;
}

interface MemberWorkload {
  user: { id: string; name: string };
  count: number;
}

interface Props {
  tasks: Task[];
  members: MemberWorkload[];
  completionRate?: number;
  weeklyVelocity?: number;
}

interface Insight {
  type: "warning" | "info" | "success";
  icon: string;
  title: string;
  description: string;
  action: string;
}

export default function InsightsAssistant({ tasks, members, completionRate = 0, weeklyVelocity = 0 }: Props) {
  const insights: Insight[] = [];

  const overdueCount = tasks.filter((t) =>
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED"
  ).length;

  if (overdueCount > 0) {
    insights.push({
      type: "warning",
      icon: "\u26A0\uFE0F",
      title: `${overdueCount} overdue task${overdueCount > 1 ? "s" : ""} need attention`,
      description: `Resolve overdue items to prevent schedule slippage.`,
      action: `Resolve overdue task${overdueCount > 1 ? "s" : ""}`,
    });
  }

  const avgLoad = members.length > 0
    ? members.reduce((s, m) => s + m.count, 0) / members.length
    : 0;
  const overloaded = members.filter((m) => m.count > avgLoad * 1.3);

  if (overloaded.length > 0) {
    insights.push({
      type: "warning",
      icon: "\u2699\uFE0F",
      title: `${overloaded.length} member${overloaded.length > 1 ? "s are" : " is"} overloaded`,
      description: `Reassign tasks to balance team workload and prevent burnout.`,
      action: `Reassign overloaded member${overloaded.length > 1 ? "s" : ""}`,
    });
  }

  if (weeklyVelocity > 0 && weeklyVelocity < 5) {
    insights.push({
      type: "info",
      icon: "\uD83D\uDCC8",
      title: "Weekly completion velocity is low",
      description: `Current velocity of ${weeklyVelocity}/week is below target. Consider sprint adjustments.`,
      action: "Increase weekly completion velocity",
    });
  }

  const unassigned = tasks.filter((t) => !t.assignee);
  if (unassigned.length > 3) {
    insights.push({
      type: "info",
      icon: "\uD83D\uDC65",
      title: `${unassigned.length} unassigned task${unassigned.length > 1 ? "s" : ""}`,
      description: "Assign owners to unclaimed tasks for better accountability.",
      action: `Assign ${unassigned.length} task${unassigned.length > 1 ? "s" : ""}`,
    });
  }

  if (completionRate > 0 && completionRate < 30) {
    insights.push({
      type: "warning",
      icon: "\uD83D\uDCA9",
      title: "Team engagement needs improvement",
      description: `Only ${completionRate}% of tasks completed. Review blockers and priorities.`,
      action: "Improve team engagement",
    });
  }

  if (overdueCount === 0 && overloaded.length === 0 && unassigned.length <= 3) {
    insights.push({
      type: "success",
      icon: "\u2705",
      title: "Everything looks on track",
      description: "No overdue tasks, balanced workload, and all tasks assigned.",
      action: "Keep up the momentum",
    });
  }

  const underutilized = members.filter((m) => m.count < avgLoad * 0.5 && m.count >= 0);
  if (underutilized.length > 0 && overloaded.length > 0) {
    insights.push({
      type: "info",
      icon: "\uD83D\uDD04",
      title: "Workload redistribution opportunity",
      description: `${underutilized.length} member${underutilized.length > 1 ? "s have" : " has"} capacity to take on more tasks.`,
      action: "Redistribute tasks",
    });
  }

  if (insights.length === 0) return null;

  const borderMap: Record<string, string> = {
    warning: "var(--health-warning)",
    info: "var(--health-info)",
    success: "var(--health-success)",
  };

  return (
    <div class="ia-card">
      <div class="ia-header">
        <h3 class="ia-title"><Icon name="psychology" size={18} /> Insights Assistant</h3>
        <span class="ia-badge">{insights.length} insight{insights.length > 1 ? "s" : ""}</span>
      </div>
      <div class="ia-list">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            class="ia-item"
            style={`--ia-border:${borderMap[insight.type] ?? "#6366f1"}`}
          >
            <div class="ia-item-icon">{insight.icon}</div>
            <div class="ia-item-body">
              <div class="ia-item-title">{insight.title}</div>
              <div class="ia-item-desc">{insight.description}</div>
              <div class="ia-item-action">{insight.action} →</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
