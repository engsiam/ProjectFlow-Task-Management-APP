import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "./_recharts.tsx";

type Datum = { name: string; label: string; value: number; color: string };

export function StatusPieChart(
  { data, height = 280 }: {
    data: Datum[];
    height?: number;
  },
) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius="80%"
          innerRadius="0%"
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={3}
          isAnimationActive
          animationDuration={600}
          label={({ label, value }: { label: string; value: number }) =>
            total ? `${label} ${Math.round((value / total) * 100)}%` : ""}
          labelLine={false}
        >
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip
          content={(p: { active?: boolean; payload?: Array<{ payload: Datum }> }) => {
            const { active, payload } = p;
            if (!active || !payload?.length) return null;
            const item = payload[0].payload;
            return (
              <div class="chart-tooltip">
                <div class="chart-tooltip-row">
                  <span class="chart-tooltip-dot" style={{ background: item.color }} />
                  <span class="chart-tooltip-label">{item.label}</span>
                </div>
                <div class="chart-tooltip-value">{item.value}</div>
              </div>
            );
          }}
        />
        <Legend
          iconType="circle"
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: "12px", color: "var(--muted)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
