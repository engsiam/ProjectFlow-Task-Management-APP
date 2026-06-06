import { useEffect, useState } from "preact/hooks";
import {
  fetchProjectHealth,
  type HealthResult,
  refreshProjectHealth,
  riskColor,
  riskEmoji,
  riskLabel,
} from "../lib/health.ts";
import { getAccessToken } from "../lib/auth.ts";

interface Props {
  projectId: string;
  compact?: boolean;
}

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const scoreBand = (score: number) => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 30) return "Poor";
  return "Critical";
};

export default function ProjectHealthCard(
  { projectId, compact = false }: Props,
) {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
        const data = await fetchProjectHealth(projectId, token);
        if (mounted) setHealth(data);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      const data = await refreshProjectHealth(projectId, token);
      setHealth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div class="health-card health-loading">
        <div class="health-skeleton" />
        <div class="health-skeleton-line" />
      </div>
    );
  }

  if (error || !health) {
    return (
      <div class="health-card health-error">
        <p>⚠️ {error ?? "Health data unavailable"}</p>
      </div>
    );
  }

  const score = health.score;
  const ringColor = riskColor(health.riskLevel);
  const insight = health.insights[0];

  if (compact) {
    return (
      <div
        class="health-badge"
        style={`--health-color:${ringColor}`}
        title={`${riskLabel(health.riskLevel)} • score ${score}/100`}
      >
        <span class="health-badge-dot" />
        <span class="health-badge-text">{score}</span>
      </div>
    );
  }

  return (
    <div class="health-card" style={`--health-color:${ringColor}`}>
      <header class="health-header">
        <div>
          <h3 class="health-title">🤖 AI Project Insights</h3>
          <p class="health-subtitle">
            {riskEmoji(health.riskLevel)} {riskLabel(health.riskLevel)} ·{" "}
            {scoreBand(score)}
          </p>
        </div>
        <button
          type="button"
          class="health-refresh"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh health"
        >
          {refreshing ? "⏳" : "🔄"}
        </button>
      </header>

      <div class="health-gauge">
        <svg viewBox="0 0 120 120" class="health-gauge-svg">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            stroke-width="10"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={ringColor}
            stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray={`${(score / 100) * 314} 314`}
            transform="rotate(-90 60 60)"
            style="transition: stroke-dasharray 600ms ease;"
          />
        </svg>
        <div class="health-gauge-text">
          <div class="health-score">{score}</div>
          <div class="health-score-suffix">/ 100</div>
        </div>
      </div>

      {insight && (
        <div class={`health-insight health-insight-${insight.type}`}>
          <strong>{insight.title}</strong>
          <p>{insight.text}</p>
        </div>
      )}

      {health.insights.length > 1 && (
        <details class="health-insights-more">
          <summary>
            +{health.insights.length - 1}{" "}
            more insight{health.insights.length - 1 === 1 ? "" : "s"}
          </summary>
          <ul class="health-insight-list">
            {health.insights.slice(1).map((i, idx) => (
              <li key={idx} class={`health-insight health-insight-${i.type}`}>
                <strong>{i.title}</strong>
                <p>{i.text}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div class="health-meta">
        <div>
          <span class="health-meta-label">On track</span>
          <span class="health-meta-value">
            {Math.round(health.onTrackProbability * 100)}%
          </span>
        </div>
        <div>
          <span class="health-meta-label">ETA</span>
          <span class="health-meta-value">
            {fmtDate(health.predictedCompletionDate)}
          </span>
        </div>
        <div>
          <span class="health-meta-label">Overdue</span>
          <span class="health-meta-value">
            {health.metrics.overdueTasks}
          </span>
        </div>
      </div>

      <details class="health-breakdown">
        <summary>Score breakdown</summary>
        <ul>
          <li>
            <span>Overdue tasks (30)</span>
            <strong>{health.metrics.overdueScore}</strong>
          </li>
          <li>
            <span>Velocity 7d (20)</span>
            <strong>{health.metrics.velocityScore}</strong>
          </li>
          <li>
            <span>Deadline proximity (25)</span>
            <strong>{health.metrics.deadlineScore}</strong>
          </li>
          <li>
            <span>Engagement (15)</span>
            <strong>{health.metrics.engagementScore}</strong>
          </li>
          <li>
            <span>Workload balance (10)</span>
            <strong>{health.metrics.distributionScore}</strong>
          </li>
        </ul>
      </details>
    </div>
  );
}
