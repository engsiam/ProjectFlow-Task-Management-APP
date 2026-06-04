import { useEffect, useState } from "preact/hooks";
import { get } from "../lib/api.ts";
import { ChartCard, KpiCard } from "../components/analytics/ChartCard.tsx";
import { DonutChartComponent } from "../components/charts/DonutChart.tsx";
import { StatusPieChart } from "../components/charts/StatusPieChart.tsx";
import { TrendLineChart } from "../components/charts/TrendLineChart.tsx";
import { ProductivityBarChart } from "../components/charts/ProductivityBarChart.tsx";
import { ComparisonBarChart } from "../components/charts/ComparisonBarChart.tsx";
import { Icon } from "../components/ui.tsx";
import type { AnalyticsCharts } from "../lib/types.ts";

export default function ProjectAnalyticsTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<AnalyticsCharts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    get<AnalyticsCharts>(`/analytics/project/${projectId}`)
      .then((d) => { if (alive) setData(d); })
      .catch(() => null)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  const kpi = data?.kpi;
  const empty = (kpi?.totalTasks ?? 0) === 0;

  return (
    <div class="pd-analytics">
      <div class="pd-analytics-head">
        <h3 class="pd-analytics-title">
          <Icon name="monitoring" size={18} /> Project Insights
        </h3>
        <a href={`/analytics?project=${projectId}`} class="pd-analytics-link">
          Full analytics
          <Icon name="arrow_forward" size={14} />
        </a>
      </div>

      <div class="pd-analytics-kpis">
        <KpiCard
          label="Tasks"
          value={kpi?.totalTasks ?? 0}
          icon="task"
          accent="var(--primary)"
          isLoading={loading}
        />
        <KpiCard
          label="Completed"
          value={kpi?.completedTasks ?? 0}
          icon="check_circle"
          accent="var(--success)"
          isLoading={loading}
        />
        <KpiCard
          label="Pending"
          value={kpi?.pendingTasks ?? 0}
          icon="hourglass_top"
          accent="var(--warning)"
          isLoading={loading}
        />
        <KpiCard
          label="Overdue"
          value={kpi?.overdueTasks ?? 0}
          icon="schedule"
          accent="var(--danger)"
          isLoading={loading}
        />
      </div>

      <div class="pd-analytics-grid">
        <ChartCard
          title="Priority Distribution"
          icon="flag"
          accent="var(--warning)"
          height={260}
          isLoading={loading}
          isEmpty={empty}
        >
          <DonutChartComponent data={data?.byPriority ?? []} height={240} />
        </ChartCard>

        <ChartCard
          title="Status Mix"
          icon="donut_large"
          accent="var(--primary)"
          height={260}
          isLoading={loading}
          isEmpty={empty}
        >
          <StatusPieChart data={data?.byStatus ?? []} height={240} />
        </ChartCard>

        <ChartCard
          title="30-Day Trend"
          icon="show_chart"
          accent="var(--primary)"
          height={300}
          isLoading={loading}
          isEmpty={empty}
        >
          <TrendLineChart data={data?.trend ?? []} height={280} />
        </ChartCard>

        <ChartCard
          title="Team Productivity"
          icon="groups"
          accent="var(--success)"
          height={320}
          isLoading={loading}
          isEmpty={empty || (data?.productivity ?? []).length === 0}
        >
          <ProductivityBarChart data={data?.productivity ?? []} height={300} />
        </ChartCard>

        <ChartCard
          title="Completed vs Overdue"
          icon="compare_arrows"
          accent="var(--primary)"
          height={300}
          isLoading={loading}
          isEmpty={empty}
        >
          <ComparisonBarChart data={data?.comparison ?? []} height={280} />
        </ChartCard>
      </div>
    </div>
  );
}
