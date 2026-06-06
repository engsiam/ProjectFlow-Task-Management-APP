import { useEffect, useState } from "preact/hooks";
import {
  fetchWorkspaceHealth,
  riskEmoji,
  riskLabel,
  type WorkspaceHealth,
} from "../lib/health.ts";
import { getAccessToken } from "../lib/auth.ts";

export default function AtRiskWidget() {
  const [data, setData] = useState<WorkspaceHealth | null>(null);
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
        const result = await fetchWorkspaceHealth(token);
        if (mounted) setData(result);
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
      <div class="atrisk-widget atrisk-loading">
        <div class="atrisk-skeleton" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div class="atrisk-widget atrisk-error">
        <p>⚠️ {error ?? "Health data unavailable"}</p>
      </div>
    );
  }

  if (data.totalProjects === 0) {
    return (
      <div class="atrisk-widget">
        <h3>🤖Project Insights</h3>
        <p class="atrisk-empty">
          No projects yet. Create one to see AI insights.
        </p>
      </div>
    );
  }

  const scoreColor = data.averageScore >= 70
    ? "#10b981"
    : data.averageScore >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div class="atrisk-widget">
      <header class="atrisk-header">
        <h3>🤖Project Insights</h3>
        <a class="atrisk-link" href="/projects">View all →</a>
      </header>

      <div class="atrisk-summary">
        <div class="atrisk-stat">
          <div class="atrisk-stat-label">Avg. health</div>
          <div
            class="atrisk-stat-value atrisk-stat-score"
            style={`color:${scoreColor}`}
          >
            {data.averageScore}
            <span class="atrisk-stat-suffix">/100</span>
          </div>
        </div>
        <div class="atrisk-stat">
          <div class="atrisk-stat-label">At risk</div>
          <div
            class="atrisk-stat-value"
            style={data.atRiskCount > 0 ? "color:#f59e0b" : "color:#10b981"}
          >
            {data.atRiskCount}
          </div>
        </div>
        <div class="atrisk-stat">
          <div class="atrisk-stat-label">Critical</div>
          <div
            class="atrisk-stat-value"
            style={data.criticalCount > 0 ? "color:#ef4444" : "color:#10b981"}
          >
            {data.criticalCount}
          </div>
        </div>
      </div>

      {data.atRisk.length > 0
        ? (
          <ul class="atrisk-list">
            {data.atRisk.slice(0, 5).map((p) => (
              <li key={p.projectId} class="atrisk-item">
                <a href={`/projects/${p.projectId}`} class="atrisk-item-link">
                  <span
                    class="atrisk-color-dot"
                    style={`background:${p.projectColor}`}
                  />
                  <span class="atrisk-name">{p.projectName}</span>
                  <span class="atrisk-meta">
                    {riskEmoji(p.riskLevel)} {riskLabel(p.riskLevel)} ·{" "}
                    {p.score}/100
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )
        : <p class="atrisk-empty">🎉 All projects are on track.</p>}
    </div>
  );
}
