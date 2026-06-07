import { Icon } from "../components/ui.tsx";

interface MemberWorkload {
  user: { id: string; name: string; avatar?: string };
  count: number;
}

interface Props {
  members: MemberWorkload[];
  tasks: { assignee?: { id: string; name: string } | null; title: string }[];
}

export default function WorkloadBalancer({ members, tasks }: Props) {
  if (!members || members.length === 0) return null;

  const maxCount = Math.max(1, ...members.map((m) => m.count));
  const avg = members.reduce((s, m) => s + m.count, 0) / members.length;
  const thresholdHigh = avg * 1.3;
  const thresholdLow = avg * 0.5;

  const balanced = members.filter((m) =>
    m.count >= thresholdLow && m.count <= thresholdHigh
  );
  const overloaded = members.filter((m) => m.count > thresholdHigh);
  const underutilized = members.filter((m) =>
    m.count < thresholdLow && m.count >= 0
  );

  const recommendations: string[] = [];

  for (const o of overloaded) {
    const under = underutilized.filter((u) => u.user.id !== o.user.id);
    const excess = Math.ceil(o.count - avg);
    if (under.length > 0 && excess > 0) {
      const target = under[0];
      recommendations.push(
        `Move ${Math.min(excess, 2)} task${
          Math.min(excess, 2) > 1 ? "s" : ""
        } from ${o.user.name} to ${target.user.name}`,
      );
    }
  }

  if (overloaded.length > 0 && underutilized.length === 0) {
    recommendations.push(
      `${overloaded.length} member${
        overloaded.length > 1 ? "s are" : " is"
      } overloaded. No underutilized members available to redistribute tasks.`,
    );
  } else if (overloaded.length === 0 && balanced.length === members.length) {
    recommendations.push(
      "Team workload is perfectly balanced. No redistribution needed.",
    );
  }

  if (underutilized.length > 0 && overloaded.length === 0) {
    recommendations.push(
      `${underutilized.length} member${
        underutilized.length > 1 ? "s have" : " has"
      } capacity for more tasks. Consider assigning new work.`,
    );
  }

  return (
    <div class="wlb-card">
      <div class="wlb-header">
        <h3 class="wlb-title">
          <Icon name="balance" size={18} /> Workload Balancer
        </h3>
      </div>

      <div class="wlb-summary">
        <div class="wlb-stat">
          <div class="wlb-stat-value" style="color:#10b981">
            {balanced.length}
          </div>
          <div class="wlb-stat-label">Balanced</div>
        </div>
        <div class="wlb-stat">
          <div class="wlb-stat-value" style="color:#ef4444">
            {overloaded.length}
          </div>
          <div class="wlb-stat-label">Overloaded</div>
        </div>
        <div class="wlb-stat">
          <div class="wlb-stat-value" style="color:#f59e0b">
            {underutilized.length}
          </div>
          <div class="wlb-stat-label">Underutilized</div>
        </div>
      </div>

      <div class="wlb-chart">
        {members.map((member) => {
          const pct = (member.count / maxCount) * 100;
          const isOver = overloaded.some((o) => o.user.id === member.user.id);
          const isUnder = underutilized.some((u) =>
            u.user.id === member.user.id
          );
          return (
            <div key={member.user.id} class="wlb-bar-row">
              <div class="wlb-bar-label">
                <span class="wlb-bar-name">{member.user.name}</span>
                <span class="wlb-bar-count">{member.count} tasks</span>
              </div>
              <div class="wlb-bar-track">
                <div
                  class="wlb-bar-fill"
                  style={`width:${pct}%;background:${
                    isOver ? "#ef4444" : isUnder ? "#f59e0b" : "#10b981"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {recommendations.length > 0 && (
        <div class="wlb-recs">
          <div class="wlb-recs-title">
            <Icon name="auto_awesome" size={14} /> Recommendations
          </div>
          {recommendations.map((rec, i) => (
            <div key={i} class="wlb-rec">
              <Icon name="lightbulb" size={14} />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
