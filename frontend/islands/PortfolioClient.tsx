import { useEffect, useState } from "preact/hooks";
import { getAccessToken } from "../lib/auth.ts";
import { fetchPortfolio, riskColor, riskLabel, fmtPct, fmtDate } from "../lib/portfolio.ts";
import type { PortfolioDashboard } from "../lib/portfolio.ts";
import { Icon, Skeleton, EmptyState } from "../components/ui.tsx";
import ProjectHealthCard from "./ProjectHealthCard.tsx";

export default function PortfolioClient() {
  const [data, setData] = useState<PortfolioDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = getAccessToken();
        if (!token) { setError("Not authenticated"); setLoading(false); return; }
        const d = await fetchPortfolio(token);
        if (mounted) setData(d);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load portfolio");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div class="pf-container">
        <div class="pf-hero-skel">
          <Skeleton height={140} />
        </div>
        <div class="pf-grid">
          {Array.from({ length: 6 }).map(() => (
            <div class="pf-card-skel"><Skeleton height={180} /></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState icon="monitoring" title="Portfolio unavailable" body={error ?? "No data"} />
    );
  }

  const exec = data.executive;
  const scoreColor = riskColor(
    exec.healthScore >= 70 ? "ON_TRACK" : exec.healthScore >= 40 ? "AT_RISK" : "CRITICAL"
  );

  return (
    <div class="pf-container">
      {/* Hero */}
      <div class="pf-hero">
        <div class="pf-hero-main">
          <div class="pf-hero-score">
            <div class="pf-hero-ring">
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                <circle cx="48" cy="48" r="40" fill="none" stroke={scoreColor} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - exec.healthScore / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 48 48)" style="transition:stroke-dashoffset 0.8s ease" />
              </svg>
              <span class="pf-hero-ring-value" style={`color:${scoreColor}`}>{exec.healthScore}</span>
            </div>
            <div class="pf-hero-meta">
              <div class="pf-hero-label">Portfolio Health</div>
              <div class="pf-hero-status" style={`color:${scoreColor}`}>{riskLabel(exec.healthScore >= 70 ? "ON_TRACK" : exec.healthScore >= 40 ? "AT_RISK" : "CRITICAL")}</div>
              <div class="pf-hero-trend">
                <Icon name={exec.weeklyTrendDirection === "up" ? "trending_up" : exec.weeklyTrendDirection === "down" ? "trending_down" : "trending_flat"} size={14} />
                <span>{exec.weeklyTrend}% vs last week</span>
              </div>
            </div>
          </div>
          <div class="pf-hero-stats">
            <div class="pf-hero-stat">
              <div class="pf-hero-stat-value">{exec.totalProjects}</div>
              <div class="pf-hero-stat-label">Projects</div>
            </div>
            <div class="pf-hero-stat">
              <div class="pf-hero-stat-value" style="color:#10b981">{exec.healthyCount}</div>
              <div class="pf-hero-stat-label">On Track</div>
            </div>
            <div class="pf-hero-stat">
              <div class="pf-hero-stat-value" style="color:#f59e0b">{exec.atRiskCount}</div>
              <div class="pf-hero-stat-label">At Risk</div>
            </div>
            <div class="pf-hero-stat">
              <div class="pf-hero-stat-value" style="color:#ef4444">{exec.criticalCount}</div>
              <div class="pf-hero-stat-label">Critical</div>
            </div>
          </div>
        </div>
        {data.forecast && (
          <div class="pf-hero-forecast">
            <div class="pf-hero-forecast-item">
              <span class="pf-hero-forecast-label">Predicted Completion</span>
              <span class="pf-hero-forecast-value">{fmtDate(data.forecast.predictedCompletionDate)}</span>
            </div>
            <div class="pf-hero-forecast-item">
              <span class="pf-hero-forecast-label">On-Time Probability</span>
              <span class="pf-hero-forecast-value" style={`color:${riskColor(data.forecast.riskLevel)}`}>{fmtPct(data.forecast.onTimeProbability)}</span>
            </div>
            <div class="pf-hero-forecast-item">
              <span class="pf-hero-forecast-label">Team Efficiency</span>
              <span class="pf-hero-forecast-value" style={`color:${data.team?.teamEfficiency >= 70 ? "#10b981" : data.team?.teamEfficiency >= 40 ? "#f59e0b" : "#ef4444"}`}>{data.team?.teamEfficiency ?? "—"}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Risk Matrix */}
      {data.matrix && data.matrix.length > 0 && (
        <div class="pf-section">
          <h3 class="pf-section-title"><Icon name="gpp_bad" size={18} /> Risk Matrix</h3>
          <div class="pf-rm-scroll">
            <table class="pf-rm-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Health</th>
                  <th>Risk</th>
                  <th>Progress</th>
                  <th>Deadline</th>
                  <th>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {data.matrix.map((item) => {
                  const clr = riskColor(item.riskLevel);
                  return (
                    <tr key={item.projectId} class="pf-rm-row" onClick={() => setSelectedProject(item.projectId === selectedProject ? null : item.projectId)}>
                      <td class="pf-rm-name">
                        <a href={`/projects/${item.projectId}`}>
                          <span class="pf-rm-dot" style={`background:${item.projectColor}`} />
                          {item.projectName}
                        </a>
                      </td>
                      <td class="pf-rm-score" style={`color:${clr}`}>{item.healthScore}</td>
                      <td style={`color:${clr}`}>{riskLabel(item.riskLevel)}</td>
                      <td>
                        <div class="pf-rm-bar">
                          <div class="pf-rm-bar-fill" style={`width:${item.completionPct}%;background:${clr}`} />
                          <span class="pf-rm-bar-label">{item.completionPct}%</span>
                        </div>
                      </td>
                      <td style={`color:${item.deadlineStatus === "OVERDUE" ? "#ef4444" : item.deadlineStatus === "AT_RISK" ? "#f59e0b" : "#10b981"}`}>
                        {item.deadlineStatus === "OVERDUE" ? "OVERDUE" : item.deadlineStatus === "AT_RISK" ? "AT RISK" : item.deadlineStatus === "ON_TRACK" ? "ON TRACK" : "—"}
                      </td>
                      <td class="pf-rm-overdue">{item.overdueTasks > 0 ? <span style="color:#ef4444">{item.overdueTasks}</span> : "0"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <div class="pf-section">
          <h3 class="pf-section-title"><Icon name="insights" size={18} /> Portfolio Insights</h3>
          <div class="pf-insights-grid">
            {data.insights.map((i, idx) => (
              <div key={idx} class="pf-insight-card" style={`--pf-insight-border:${i.type === "warning" ? "#f59e0b" : i.type === "info" ? "#3b82f6" : "#10b981"}`}>
                <span class="pf-insight-icon">
                  {i.type === "warning" ? "\u26A0\uFE0F" : i.type === "info" ? "\uD83D\uDCA1" : "\u2705"}
                </span>
                <span class="pf-insight-text">{i.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Intelligence Card for selected project */}
      {selectedProject && (
        <div class="pf-section">
          <div class="pf-section-header">
            <h3 class="pf-section-title"><Icon name="health_and_safety" size={18} /> Project Health Intelligence</h3>
            <button class="pf-close-btn" onClick={() => setSelectedProject(null)}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <ProjectHealthCard projectId={selectedProject} />
        </div>
      )}
    </div>
  );
}
