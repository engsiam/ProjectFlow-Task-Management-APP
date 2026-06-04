import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "./_recharts.tsx";
import { Avatar } from "../ui.tsx";

type Datum = {
  userId: string;
  name: string;
  avatar?: string | null;
  completed: number;
  inProgress: number;
  total: number;
};

export function ProductivityBarChart(
  { data, height = 320 }: {
    data: Datum[];
    height?: number;
  },
) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 30, left: 0, bottom: 0 }}
        barCategoryGap={10}
      >
        <CartesianGrid
          strokeDasharray="3 6"
          stroke="var(--border)"
          horizontal={false}
        />
        <XAxis
          type="number"
          stroke="var(--muted)"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="var(--muted)"
          tick={{ fontSize: 12, fill: "var(--text)" }}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in srgb, var(--primary), transparent 92%)" }}
          content={(p: {
            active?: boolean;
            payload?: Array<{ payload: Datum; value: number; name: string; color: string; dataKey: string }>;
          }) => {
            const { active, payload } = p;
            if (!active || !payload?.length) return null;
            const row = payload[0].payload;
            return (
              <div class="chart-tooltip">
                <div class="chart-tooltip-user">
                  <Avatar user={{ name: row.name, avatar: row.avatar }} size={24} />
                  <span class="chart-tooltip-title">{row.name}</span>
                </div>
                {payload.map((it) => (
                  <div class="chart-tooltip-row" key={it.dataKey}>
                    <span class="chart-tooltip-dot" style={{ background: it.color }} />
                    <span class="chart-tooltip-label">{it.name}</span>
                    <span class="chart-tooltip-value" style={{ marginLeft: "auto" }}>{it.value}</span>
                  </div>
                ))}
                <div class="chart-tooltip-divider" />
                <div class="chart-tooltip-row chart-tooltip-total">
                  <span class="chart-tooltip-label">Total</span>
                  <span class="chart-tooltip-value">{row.total}</span>
                </div>
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
          stackId="a"
          fill="var(--success)"
          radius={[0, 0, 0, 0]}
          maxBarSize={18}
        />
        <Bar
          dataKey="inProgress"
          name="In Progress"
          stackId="a"
          fill="var(--warning)"
          radius={[0, 4, 4, 0]}
          maxBarSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
