import { useEffect, useState } from "preact/hooks";
import { getAccessToken } from "../lib/auth.ts";

interface DayActivity {
  date: string;
  count: number;
  weekday: number;
  weekIdx: number;
}

interface Props {
  projectId?: string;
  compact?: boolean;
}

export default function ActivityHeatmap({ projectId, compact }: Props) {
  const [weeks, setWeeks] = useState<DayActivity[][]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = getAccessToken();
        if (!token) return;
        const base = projectId
          ? `${
            import.meta.env.API_BASE_URL || ""
          }/projects/${projectId}/activity`
          : `${import.meta.env.API_BASE_URL || ""}/dashboard/activity`;
        const res = await fetch(`${base}?days=90`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const activities: { createdAt: string }[] = await res.json().catch(
          () => [],
        );
        if (!mounted) return;

        const dayMap = new Map<string, number>();
        const now = new Date();
        for (let i = 89; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          dayMap.set(key, 0);
        }
        for (const act of activities) {
          const key = act.createdAt?.slice(0, 10);
          if (key && dayMap.has(key)) {
            dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
          }
        }

        const days: DayActivity[] = [];
        let maxCount = 0;
        for (const [date, count] of dayMap) {
          const d = new Date(date);
          days.push({ date, count, weekday: d.getDay(), weekIdx: 0 });
          if (count > maxCount) maxCount = count;
        }
        days.sort((a, b) => a.date.localeCompare(b.date));

        const firstDay = days[0]?.weekday ?? 0;
        const weeks: DayActivity[][] = [];
        let current: DayActivity[] = [];
        for (let i = 0; i < firstDay; i++) {
          current.push({ date: "", count: -1, weekday: i, weekIdx: 0 });
        }
        for (const day of days) {
          current.push(day);
          if (current.length === 7) {
            weeks.push(current);
            current = [];
          }
        }
        if (current.length > 0) weeks.push(current);

        setWeeks(weeks);
        setTotal(activities.length);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const level = (count: number, max: number): string => {
    if (count < 0) return "heatmap-empty";
    if (count === 0) return "heatmap-0";
    const pct = count / Math.max(max, 1);
    if (pct <= 0.25) return "heatmap-1";
    if (pct <= 0.5) return "heatmap-2";
    if (pct <= 0.75) return "heatmap-3";
    return "heatmap-4";
  };

  const monthLabels: string[] = [];
  if (weeks.length > 0) {
    let lastMonth = -1;
    for (const week of weeks) {
      const day = week.find((d) => d.date);
      if (day) {
        const m = new Date(day.date).getMonth();
        if (m !== lastMonth) {
          monthLabels.push(
            new Date(day.date).toLocaleString("default", { month: "short" }),
          );
          lastMonth = m;
        } else monthLabels.push("");
      } else monthLabels.push("");
    }
  }

  if (loading) {
    return (
      <div class="heatmap-container">
        <div class="heatmap-loading">Loading activity data...</div>
      </div>
    );
  }

  return (
    <div class={`heatmap-container ${compact ? "heatmap-compact" : ""}`}>
      <div class="heatmap-header">
        <div class="heatmap-title">
          <span class="heatmap-title-text">{total} events in last 90 days</span>
        </div>
        <div class="heatmap-legend">
          <span class="heatmap-legend-label">Less</span>
          <div class="heatmap-cell heatmap-0" />
          <div class="heatmap-cell heatmap-1" />
          <div class="heatmap-cell heatmap-2" />
          <div class="heatmap-cell heatmap-3" />
          <div class="heatmap-cell heatmap-4" />
          <span class="heatmap-legend-label">More</span>
        </div>
      </div>
      <div class="heatmap-body">
        <div class="heatmap-days">
          <span>Mon</span>
          <span />
          <span>Wed</span>
          <span />
          <span>Fri</span>
          <span />
          <span />
        </div>
        <div class="heatmap-grid">
          <div class="heatmap-months">
            {monthLabels.map((m, i) => (
              <span key={i} class="heatmap-month-label">{m}</span>
            ))}
          </div>
          <div class="heatmap-weeks">
            {weeks.map((week, wi) => (
              <div key={wi} class="heatmap-week">
                {week.map((day, di) => (
                  <div
                    key={di}
                    class={`heatmap-cell ${
                      level(
                        day.count,
                        Math.max(
                          ...weeks.flat().filter((d) => d.count >= 0).map((d) =>
                            d.count
                          ),
                          1,
                        ),
                      )
                    }`}
                    title={day.date
                      ? `${day.date}: ${day.count} activities`
                      : ""}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
