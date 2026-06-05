import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "./_recharts.tsx";

type Datum = {
  date: string;
  label: string;
  created: number;
  completed: number;
};

export function TrendLineChart(
  { data, height = 300 }: {
    data: Datum[];
    height?: number;
  },
) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="trendCreatedArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trendCompletedArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 6"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          stroke="var(--muted)"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          stroke="var(--muted)"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: "var(--primary)", strokeDasharray: "3 3" }}
          content={(p: {
            active?: boolean;
            payload?: Array<
              { name: string; value: number; color: string; dataKey: string }
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
        <Area
          type="monotone"
          dataKey="created"
          name="Created"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#trendCreatedArea)"
        />
        <Area
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="var(--success)"
          strokeWidth={2}
          fill="url(#trendCompletedArea)"
        />
        <Line
          type="monotone"
          dataKey="created"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
        <Line
          type="monotone"
          dataKey="completed"
          stroke="var(--success)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
