import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "./_recharts.tsx";

type Datum = { name: string; label: string; value: number; color: string };

export function DonutChartComponent(
  { data, height = 280, valueFormatter }: {
    data: Datum[];
    height?: number;
    valueFormatter?: (v: number) => string;
  },
) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const fmt = valueFormatter ?? ((v: number) => v.toString());

  return (
    <div class="donut-chart-wrap" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={3}
            isAnimationActive
            animationDuration={600}
          >
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip
            content={(
              p: { active?: boolean; payload?: Array<{ payload: Datum }> },
            ) => {
              const { active, payload } = p;
              if (!active || !payload?.length) return null;
              const item = payload[0].payload;
              const pct = total ? Math.round((item.value / total) * 100) : 0;
              return (
                <div class="chart-tooltip">
                  <div class="chart-tooltip-row">
                    <span
                      class="chart-tooltip-dot"
                      style={{ background: item.color }}
                    />
                    <span class="chart-tooltip-label">{item.label}</span>
                  </div>
                  <div class="chart-tooltip-value">
                    {fmt(item.value)}{" "}
                    <span class="chart-tooltip-muted">({pct}%)</span>
                  </div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div class="donut-center" aria-hidden="true">
        <strong class="donut-center-value">{fmt(total)}</strong>
        <span class="donut-center-label">Total</span>
      </div>
    </div>
  );
}
