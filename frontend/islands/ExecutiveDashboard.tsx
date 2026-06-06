import { type ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  type EnterpriseInsight,
  fetchPortfolio,
  fmtDate,
  fmtPct,
  type PortfolioDashboard,
  riskColor,
  riskLabel,
  type RiskMatrixItem,
  type TopContributor,
} from "../lib/portfolio.ts";
import { getAccessToken } from "../lib/auth.ts";

// ── SVG mini sparkline (inline) ──────────────────────────────────
const TrendArrow = (
  { dir, value }: { dir: "up" | "down" | "flat"; value: number },
) => {
  if (dir === "up") {
    return <span class="eo-trend eo-trend-up">↑ {value}% vs last week</span>;
  }
  if (dir === "down") {
    return <span class="eo-trend eo-trend-down">↓ {value}% vs last week</span>;
  }
  return <span class="eo-trend eo-trend-flat">→ 0% vs last week</span>;
};

// ── KPI Tile ─────────────────────────────────────────────────────
const KpiTile = (
  { label, value, color, desc }: {
    label: string;
    value: string | number | preact.ComponentChildren;
    color?: string;
    desc?: string;
  },
) => (
  <div class="eo-kpi">
    <div class="eo-kpi-label">{label}</div>
    <div class="eo-kpi-value" style={color ? `color:${color}` : ""}>
      {value}
    </div>
    {desc && <div class="eo-kpi-desc">{desc}</div>}
  </div>
);

// ── Delivery Forecast Card ───────────────────────────────────────
const ForecastCard = ({ data }: { data: PortfolioDashboard["forecast"] }) => {
  const riskClr = riskColor(data.riskLevel);
  const trendIcon = data.completionTrendDirection === "up"
    ? "↑"
    : data.completionTrendDirection === "down"
      ? "↓"
      : "→";
  const trendCls = data.completionTrendDirection === "up"
    ? "eo-dfc-up"
    : data.completionTrendDirection === "down"
      ? "eo-dfc-down"
      : "eo-dfc-flat";
  return (
    <div class="eo-card eo-dfc">
      <h3 class="eo-card-title">📬 Delivery Forecast</h3>
      <div class="eo-dfc-grid">
        <div class="eo-dfc-stat">
          <span class="eo-dfc-label">Predicted Completion</span>
          <span class="eo-dfc-value">
            {fmtDate(data.predictedCompletionDate)}
          </span>
        </div>
        <div class="eo-dfc-stat">
          <span class="eo-dfc-label">On-Time Probability</span>
          <span class="eo-dfc-value" style={`color:${riskClr}`}>
            {fmtPct(data.onTimeProbability)}
          </span>
        </div>
        <div class="eo-dfc-stat">
          <span class="eo-dfc-label">Risk Level</span>
          <span class="eo-dfc-value" style={`color:${riskClr}`}>
            {riskLabel(data.riskLevel)}
          </span>
        </div>
        <div class="eo-dfc-stat">
          <span class="eo-dfc-label">Trending</span>
          <span class={`eo-dfc-value ${trendCls}`}>
            {trendIcon} {data.completionTrend}%
          </span>
        </div>
      </div>
      <div class="eo-dfc-meta">
        {data.totalRemainingTasks} tasks remaining ·{" "}
        {data.averageVelocity7d}/day avg velocity
      </div>
    </div>
  );
};

// ── Insight bubble ───────────────────────────────────────────────
const InsightIcon = ({ type }: { type: string }) => {
  if (type === "warning") return "⚠️";
  if (type === "info") return "💡";
  return "✅";
};

const InsightCard = ({ items }: { items: EnterpriseInsight[] }) => {
  if (items.length === 0) return null;
  const borderMap: Record<string, string> = {
    warning: "var(--health-warning)",
    info: "var(--health-info)",
    success: "var(--health-success)",
  };
  return (
    <div class="eo-card eo-insight-card">
      <h3 class="eo-card-title">🤖Project Insights</h3>
      <ul class="eo-insight-list">
        {items.map((i, idx) => (
          <li
            key={idx}
            class="eo-insight-item"
            style={`--eo-insight-border:${borderMap[i.type] || "#6366f1"}`}
          >
            <span class="eo-insight-icon">{InsightIcon({ type: i.type })}</span>
            <span class="eo-insight-text">{i.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── Risk Matrix table ─────────────────────────────────────────────
const deadlineLabel = (s: string) =>
  s === "OVERDUE"
    ? "OVERDUE"
    : s === "AT_RISK"
      ? "AT_RISK"
      : s === "ON_TRACK"
        ? "ON TRACK"
        : "—";
const deadlineColor = (s: string) =>
  s === "OVERDUE"
    ? "#ef4444"
    : s === "AT_RISK"
      ? "#f59e0b"
      : s === "ON_TRACK"
        ? "#10b981"
        : "#94a3b8";

const RiskRow = ({ item }: { item: RiskMatrixItem }) => {
  const clr = riskColor(item.riskLevel);
  return (
    <tr class="eo-rm-row">
      <td class="eo-rm-name">
        <a href={`/projects/${item.projectId}`}>
          <span class="eo-rm-dot" style={`background:${item.projectColor}`} />
          <span class="eo-rm-project-name">{item.projectName}</span>
        </a>
      </td>
      <td class="eo-rm-score" style={`color:${clr}`}>{item.healthScore}</td>
      <td class="eo-rm-risk" style={`color:${clr}`}>
        {riskLabel(item.riskLevel)}
      </td>
      <td class="eo-rm-bar-cell">
        <div class="eo-rm-bar-bg">
          <div
            class="eo-rm-bar-fill"
            style={`width:${item.completionPct}%;background:${clr}`}
          />
        </div>
        <span class="eo-rm-bar-label">{item.completionPct}%</span>
      </td>
      <td
        class="eo-rm-due"
        style={`color:${deadlineColor(item.deadlineStatus)}`}
      >
        {deadlineLabel(item.deadlineStatus)}
      </td>
      <td class="eo-rm-overdue">
        {item.overdueTasks > 0
          ? <span style="color:#ef4444">{item.overdueTasks}</span>
          : "0"}
      </td>
    </tr>
  );
};

const RiskMatrixTable = ({ items }: { items: RiskMatrixItem[] }) => {
  if (items.length === 0) return null;
  return (
    <div class="eo-card eo-rm-card">
      <h3 class="eo-card-title">⚠️ Project Risk Matrix</h3>
      <div class="eo-rm-scroll">
        <table class="eo-rm-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Health</th>
              <th>Risk</th>
              <th>Completion</th>
              <th>Deadline</th>
              <th>Overdue</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => <RiskRow key={item.projectId} item={item} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Team Intelligence ─────────────────────────────────────────────
const ContributorBadge = ({ c }: { c: TopContributor }) => (
  <span class="eo-ti-person">
    <span class="eo-ti-avatar">
      {c.avatar
        ? <img src={c.avatar} alt={c.name} class="eo-ti-avatar-img" />
        : (
          <span class="eo-ti-avatar-fallback">
            {c.name.charAt(0).toUpperCase()}
          </span>
        )}
    </span>
    <span class="eo-ti-person-name">{c.name}</span>
    <span class="eo-ti-person-stat">{c.tasksCompleted7d}/7d</span>
  </span>
);

const TeamIntelligenceCard = (
  { data }: { data: PortfolioDashboard["team"] },
) => {
  if (data.memberCount === 0) return null;
  const efficiencyColor = data.teamEfficiency >= 70
    ? "#10b981"
    : data.teamEfficiency >= 40
      ? "#f59e0b"
      : "#ef4444";
  return (
    <div class="eo-card eo-ti-card">
      <h3 class="eo-card-title">👥 Team Intelligence</h3>
      <div class="eo-ti-grid">
        <div class="eo-ti-stat">
          <span class="eo-ti-stat-label">Efficiency</span>
          <span class="eo-ti-stat-value" style={`color:${efficiencyColor}`}>
            {data.teamEfficiency}%
          </span>
        </div>
        <div class="eo-ti-stat">
          <span class="eo-ti-stat-label">Balanced</span>
          <span class="eo-ti-stat-value" style="color:#10b981">
            {data.workload.balanced}
          </span>
        </div>
        <div class="eo-ti-stat">
          <span class="eo-ti-stat-label">Overloaded</span>
          <span
            class="eo-ti-stat-value"
            style={data.workload.overloaded > 0
              ? "color:#ef4444"
              : "color:#94a3b8"}
          >
            {data.workload.overloaded}
          </span>
        </div>
        <div class="eo-ti-stat">
          <span class="eo-ti-stat-label">Underutilized</span>
          <span
            class="eo-ti-stat-value"
            style={data.workload.underutilized > 0
              ? "color:#f59e0b"
              : "color:#94a3b8"}
          >
            {data.workload.underutilized}
          </span>
        </div>
      </div>
      {data.topContributors.length > 0 && (
        <div class="eo-ti-contributors">
          <div class="eo-ti-contrib-label">Top Contributors</div>
          <div class="eo-ti-avatars">
            {data.topContributors.map((c) => (
              <ContributorBadge key={c.userId} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Executive Dashboard ─────────────────────────────────────
export default function ExecutiveDashboard() {
  const [data, setData] = useState<PortfolioDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }
        const d = await fetchPortfolio(token);
        if (mounted) setData(d);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section class="eo-section">
        <div class="eo-skel-header" />
        <div class="eo-skel-kpis">
          <div class="eo-skel-tile" />
          <div class="eo-skel-tile" />
          <div class="eo-skel-tile" />
          <div class="eo-skel-tile" />
          <div class="eo-skel-tile" />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section class="eo-section eo-error">
        <p>⚠️ {error ?? "No data"}</p>
      </section>
    );
  }

  if (data.executive.totalProjects === 0) {
    return (
      <section class="eo-section">
        <div class="eo-empty">
          <div class="eo-empty-icon">📊</div>
          <h3>No Projects Yet</h3>
          <p>
            Create your first project and start tracking health, delivery
            forecasts and team performance in real time.
          </p>
        </div>
      </section>
    );
  }

  const exec = data.executive;
  const scoreColor = riskColor(
    exec.healthScore >= 70
      ? "ON_TRACK"
      : exec.healthScore >= 40
        ? "AT_RISK"
        : "CRITICAL",
  );

  return (
    <section class="eo-section">
      <header class="eo-header">
        <div>
          <h2 class="eo-title">📊 Executive Overview</h2>
          <p class="eo-subtitle">
            {exec.totalProjects} project{exec.totalProjects > 1 ? "s" : ""}{" "}
            tracked · real-time health intelligence
          </p>
        </div>
        <a class="eo-link" href="/projects">View all →</a>
      </header>

      {/* KPI Row */}
      <div class="eo-kpi-grid">
        <KpiTile
          label="Avg Health Score"
          value={exec.healthScore}
          desc="/100"
          color={scoreColor}
        />
        <KpiTile
          label="On Track"
          value={exec.healthyCount}
          color="#10b981"
          desc="healthy projects"
        />
        <KpiTile
          label="At Risk"
          value={exec.atRiskCount}
          color={exec.atRiskCount > 0 ? "#f59e0b" : "#10b981"}
          desc="needs attention"
        />
        <KpiTile
          label="Critical"
          value={exec.criticalCount}
          color={exec.criticalCount > 0 ? "#ef4444" : "#10b981"}
          desc="action required"
        />
        <KpiTile
          label="Weekly Trend"
          value={
            <TrendArrow
              dir={exec.weeklyTrendDirection}
              value={exec.weeklyTrend}
            />
          }
          desc=""
        />
      </div>

      {/* Narrative */}
      <div class="eo-narrative">
        <strong>{exec.narrative.headline}</strong> {exec.narrative.body}
      </div>

      {/* Two-column: Forecast + Insights */}
      <div class="eo-two-col">
        <ForecastCard data={data.forecast} />
        <InsightCard items={data.insights} />
      </div>

      {/* Risk Matrix */}
      <RiskMatrixTable items={data.matrix} />

      {/* Team Intelligence */}
      <TeamIntelligenceCard data={data.team} />
    </section>
  );
}
