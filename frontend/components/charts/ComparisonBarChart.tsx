import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "./_recharts.tsx";

type Datum = {
  label: string;
  completed: number;
  overdue: number;
  pending: number;
};

export function ComparisonBarChart(
  { data, height = 320 }: {
    data: Datum[];
    height?: number;
  },
) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 16, right: 20, left: -10, bottom: 0 }}
        barCategoryGap={28}
      >
        <CartesianGrid
          strokeDasharray="3 6"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          stroke="var(--muted)"
          tick={{ fontSize: 12, fill: "var(--text)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          stroke="var(--muted)"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{
            fill: "color-mix(in srgb, var(--primary), transparent 92%)",
          }}
          content={(p: {
            active?: boolean;
            payload?: Array<
              { name: string; value: number; dataKey: string; color: string }
            >;
            label?: string;
          }) => {
            const { active, payload, label } = p;
            if (!active || !payload?.length) return null;
            return (
              <div class="chart-tooltip">
                <p class="chart-tooltip-title">{label}</p>
                {payload.map((it) => (
                  <div class="chart-tooltip-row" key={it.dataKey}>
                    <span
                      class="chart-tooltip-dot"
                      style={{ background: it.color }}
                    />
                    <span class="chart-tooltip-label">{it.name}</span>
                    <span
                      class="chart-tooltip-value"
                      style={{ marginLeft: "auto" }}
                    >
                      {it.value}
                    </span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Legend
          iconType="circle"
          verticalAlign="top"
          height={28}
          wrapperStyle={{ fontSize: "12px", color: "var(--muted)" }}
        />
        <Bar
          dataKey="completed"
          name="Completed"
          fill="var(--success)"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        >
          {data.map((_, i) => <Cell key={`c-${i}`} />)}
        </Bar>
        <Bar
          dataKey="pending"
          name="Pending"
          fill="var(--primary)"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        >
          {data.map((_, i) => <Cell key={`p-${i}`} />)}
        </Bar>
        <Bar
          dataKey="overdue"
          name="Overdue"
          fill="var(--danger)"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        >
          {data.map((_, i) => <Cell key={`o-${i}`} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
