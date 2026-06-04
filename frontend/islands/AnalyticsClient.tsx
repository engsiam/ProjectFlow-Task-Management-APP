import { useEffect, useState } from "preact/hooks";
import { get } from "../lib/api.ts";
import { Icon } from "../components/ui.tsx";
import { ChartCard, KpiCard } from "../components/analytics/ChartCard.tsx";
import { DonutChartComponent } from "../components/charts/DonutChart.tsx";
import { StatusPieChart } from "../components/charts/StatusPieChart.tsx";
import { TrendLineChart } from "../components/charts/TrendLineChart.tsx";
import { ProductivityBarChart } from "../components/charts/ProductivityBarChart.tsx";
import { ComparisonBarChart } from "../components/charts/ComparisonBarChart.tsx";
import type { AnalyticsCharts, Project } from "../lib/types.ts";

type Range = "7" | "30" | "90";

type Props = {
  initial?: AnalyticsCharts | null;
  projectId?: string;
  projectName?: string;
  projects?: Project[];
};

function isEmptyCharts(d?: AnalyticsCharts | null): boolean {
  if (!d) return true;
  return d.kpi.totalTasks === 0 && d.kpi.totalProjects === 0;
}

export default function AnalyticsClient(
  { initial = null, projectId, projectName, projects = [] }: Props,
) {
  const [data, setData] = useState<AnalyticsCharts | null>(initial);
  const [loading, setLoading] = useState<boolean>(!initial);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("30");
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(projectId);

  const endpoint = activeProjectId
    ? `/analytics/project/${activeProjectId}`
    : "/analytics/dashboard";

  async function load(target: string | undefined) {
    setLoading(true);
    setError(null);
    try {
      const url = target
        ? `/analytics/project/${target}`
        : "/analytics/dashboard";
      const res = await get<AnalyticsCharts>(url);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initial) load(activeProjectId);
  }, [activeProjectId]);

  const empty = isEmptyCharts(data);
  const kpi = data?.kpi;
  const completionRate = kpi?.completionRate ?? 0;
  const isReadOnly = empty;

  return (
    <div class="analytics-page">
      <header class="analytics-head">
        <div class="analytics-head-left">
          <h1 class="analytics-title">
            {projectName ? `${projectName} Analytics` : "Analytics"}
          </h1>
          <p class="analytics-subtitle">
            {projectName
              ? "Task progress, workload, and trends for this project."
              : "Workspace-wide health, productivity, and progress trends."}
          </p>
        </div>
        <div class="analytics-head-right">
          {projects.length > 0 && (
            <label class="analytics-select-wrap">
              <span class="analytics-select-label">Project</span>
              <select
                class="analytics-select"
                value={activeProjectId ?? ""}
                onChange={(e) => {
                  const v = (e.target as HTMLSelectElement).value;
                  setActiveProjectId(v || undefined);
                }}
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
          {!projectName && (
            <div class="analytics-range" role="tablist" aria-label="Time range">
              {(["7", "30", "90"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={range === r}
                  class={`analytics-range-btn ${range === r ? "is-active" : ""}`}
                  onClick={() => setRange(r)}
                >
                  {r}d
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {error && (
        <div class="analytics-error">
          <Icon name="error" size={18} />
          <span>{error}</span>
        </div>
      )}

      <section class="kpi-grid" aria-label="Key metrics">
        <KpiCard
          label="Total Projects"
          value={kpi?.totalProjects ?? 0}
          icon="folder_open"
          accent="var(--primary)"
          isLoading={loading}
        />
        <KpiCard
          label="Total Tasks"
          value={kpi?.totalTasks ?? 0}
          icon="task_alt"
          accent="var(--accent)"
          isLoading={loading}
        />
        <KpiCard
          label="Completed"
          value={kpi?.completedTasks ?? 0}
          icon="check_circle"
          accent="var(--success)"
          hint={`${completionRate}% completion`}
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
          hint={(kpi?.overdueTasks ?? 0) > 0 ? "Needs attention" : "All on track"}
          isLoading={loading}
        />
        <KpiCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon="insights"
          accent="var(--primary)"
          isLoading={loading}
        />
      </section>

      <section class="analytics-grid">
        <ChartCard
          title="Tasks by Priority"
          subtitle="Distribution across priority levels"
          icon="flag"
          accent="var(--warning)"
          height={300}
          isLoading={loading}
          isEmpty={isReadOnly}
          emptyIcon="inbox"
          emptyTitle="No tasks yet"
          emptyBody="Tasks will appear here once they are created."
        >
          <DonutChartComponent
            data={data?.byPriority ?? []}
            height={280}
          />
        </ChartCard>

        <ChartCard
          title="Tasks by Status"
          subtitle="Current workflow state"
          icon="donut_large"
          accent="var(--primary)"
          height={300}
          isLoading={loading}
          isEmpty={isReadOnly}
          emptyIcon="analytics"
          emptyTitle="No status data"
          emptyBody="Create tasks to see how work is distributed."
        >
          <StatusPieChart data={data?.byStatus ?? []} height={280} />
        </ChartCard>

        <ChartCard
          title={`Progress (last ${range} days)`}
          subtitle="Created vs. completed tasks"
          icon="show_chart"
          accent="var(--primary)"
          height={340}
          isLoading={loading}
          isEmpty={isReadOnly}
          emptyIcon="trending_flat"
          emptyTitle="No activity yet"
          emptyBody="Trend data will populate as tasks are created and completed."
        >
          <TrendLineChart data={data?.trend ?? []} height={320} />
        </ChartCard>

        <ChartCard
          title="Team Productivity"
          subtitle="Tasks completed and in progress per member"
          icon="groups"
          accent="var(--success)"
          height={360}
          isLoading={loading}
          isEmpty={isReadOnly || (data?.productivity ?? []).length === 0}
          emptyIcon="person_off"
          emptyTitle="No assignments"
          emptyBody="Assign tasks to teammates to see workload here."
        >
          <ProductivityBarChart data={data?.productivity ?? []} height={340} />
        </ChartCard>

        <ChartCard
          title="Completed vs. Overdue"
          subtitle="Outcome comparison at a glance"
          icon="compare_arrows"
          accent="var(--primary)"
          height={340}
          isLoading={loading}
          isEmpty={isReadOnly}
          emptyIcon="bar_chart"
          emptyTitle="No comparison data"
          emptyBody="Comparison will show once tasks are completed or overdue."
        >
          <ComparisonBarChart data={data?.comparison ?? []} height={320} />
        </ChartCard>

        <ChartCard
          title="Completion Progress"
          subtitle="Overall workspace progress"
          icon="donut_small"
          accent="var(--primary)"
          height={300}
          isLoading={loading}
          isEmpty={isReadOnly}
          emptyIcon="pending"
          emptyTitle="No progress data"
          emptyBody="Create tasks to start tracking progress."
          footer={
            <div class="chart-card-foot-row">
              <div class="chart-foot-stat">
                <span class="chart-foot-label">Done</span>
                <strong class="chart-foot-value">{kpi?.completedTasks ?? 0}</strong>
              </div>
              <div class="chart-foot-stat">
                <span class="chart-foot-label">Pending</span>
                <strong class="chart-foot-value">{kpi?.pendingTasks ?? 0}</strong>
              </div>
              <div class="chart-foot-stat">
                <span class="chart-foot-label">Overdue</span>
                <strong class="chart-foot-value" style={{ color: "var(--danger)" }}>
                  {kpi?.overdueTasks ?? 0}
                </strong>
              </div>
            </div>
          }
        >
          <DonutChartComponent
            data={[
              { name: "COMPLETED", label: "Completed", value: kpi?.completedTasks ?? 0, color: "var(--success)" },
              { name: "PENDING", label: "Pending", value: (kpi?.pendingTasks ?? 0) - (kpi?.overdueTasks ?? 0), color: "var(--primary)" },
              { name: "OVERDUE", label: "Overdue", value: kpi?.overdueTasks ?? 0, color: "var(--danger)" },
            ]}
            height={280}
          />
        </ChartCard>
      </section>
    </div>
  );
}
