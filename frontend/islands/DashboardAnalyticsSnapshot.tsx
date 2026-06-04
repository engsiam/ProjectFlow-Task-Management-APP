import { useEffect, useState } from "preact/hooks";
import { get } from "../lib/api.ts";
import { ChartCard, KpiCard } from "../components/analytics/ChartCard.tsx";
import { DonutChartComponent } from "../components/charts/DonutChart.tsx";
import { TrendLineChart } from "../components/charts/TrendLineChart.tsx";
import { ProductivityBarChart } from "../components/charts/ProductivityBarChart.tsx";
import { StatusPieChart } from "../components/charts/StatusPieChart.tsx";
import { Icon } from "../components/ui.tsx";
import type { AnalyticsCharts } from "../lib/types.ts";

export default function DashboardAnalyticsSnapshot() {
  const [data, setData] = useState<AnalyticsCharts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    get<AnalyticsCharts>("/analytics/dashboard")
      .then((d) => { if (alive) setData(d); })
      .catch(() => null)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const kpi = data?.kpi;
  const empty = (kpi?.totalTasks ?? 0) === 0;

  return (
    <div class="dash-analytics-snapshot">
      <div class="dash-analytics-head">
        <div>
          <h2 class="dash-analytics-title">
            <Icon name="monitoring" size={20} /> Analytics Snapshot
          </h2>
          <p class="dash-analytics-sub">Key metrics and trends across your workspace.</p>
        </div>
        <a href="/analytics" class="dash-analytics-link">
          Open full analytics
          <Icon name="arrow_forward" size={14} />
        </a>
      </div>

      <div class="dash-analytics-kpis">
        <KpiCard
          label="Projects"
          value={kpi?.totalProjects ?? 0}
          icon="folder"
          accent="var(--primary)"
          isLoading={loading}
        />
        <KpiCard
          label="Tasks"
          value={kpi?.totalTasks ?? 0}
          icon="task"
          accent="var(--accent)"
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
          label="Overdue"
          value={kpi?.overdueTasks ?? 0}
          icon="schedule"
          accent="var(--danger)"
          isLoading={loading}
        />
      </div>

      <div class="dash-analytics-grid">
        <ChartCard
          title="Priority Mix"
          icon="flag"
          accent="var(--warning)"
          height={240}
          isLoading={loading}
          isEmpty={empty}
          emptyIcon="inbox"
          emptyTitle="No tasks"
        >
          <DonutChartComponent data={data?.byPriority ?? []} height={220} />
        </ChartCard>

        <ChartCard
          title="Status Mix"
          icon="donut_large"
          accent="var(--primary)"
          height={240}
          isLoading={loading}
          isEmpty={empty}
          emptyIcon="analytics"
          emptyTitle="No status data"
        >
          <StatusPieChart data={data?.byStatus ?? []} height={220} />
        </ChartCard>

        <ChartCard
          title="30-Day Trend"
          icon="show_chart"
          accent="var(--primary)"
          height={280}
          isLoading={loading}
          isEmpty={empty}
          emptyIcon="trending_flat"
          emptyTitle="No trend yet"
        >
          <TrendLineChart data={data?.trend ?? []} height={260} />
        </ChartCard>

        <ChartCard
          title="Top Contributors"
          icon="groups"
          accent="var(--success)"
          height={280}
          isLoading={loading}
          isEmpty={empty || (data?.productivity ?? []).length === 0}
          emptyIcon="person_off"
          emptyTitle="No assignments"
        >
          <ProductivityBarChart data={data?.productivity ?? []} height={260} />
        </ChartCard>
      </div>
    </div>
  );
}
