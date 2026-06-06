import { useEffect, useState } from "preact/hooks";
import {
  fetchProjectHealth,
  fetchProjectHealthHistory,
  type HealthHistoryPoint,
  type HealthResult,
  refreshProjectHealth,
  riskColor,
  riskEmoji,
  riskLabel,
  type SignalContribution,
} from "../lib/health.ts";
import { getAccessToken } from "../lib/auth.ts";

interface Props {
  projectId: string;
}

const fmtDate = (d: string | null) => {
  if (!d) return "\u2014";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const fmtPct = (n: number) =>
  n === 0 ? "0%" : String(Math.round(n * 100)) + "%";

const Gauge = ({ score, color }: { score: number; color: string }) => {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <svg viewBox="0 0 130 130" class="phc-gauge-svg" aria-hidden="true">
      <defs>
        <linearGradient id="phc-gg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color={color} stop-opacity="0.7" />
          <stop offset="100%" stop-color={color} stop-opacity="1" />
        </linearGradient>
      </defs>
      <circle
        cx="65"
        cy="65"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        stroke-width="10"
      />
      <circle
        cx="65"
        cy="65"
        r={radius}
        fill="none"
        stroke="url(#phc-gg)"
        stroke-width="10"
        stroke-linecap="round"
        stroke-dasharray={circ}
        stroke-dashoffset={offset}
        transform="rotate(-90 65 65)"
        style="transition: stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1);"
      />
    </svg>
  );
};

const PHCKPI = (
  { label, value, danger }: { label: string; value: string; danger?: boolean },
) => (
  <div class={"phc-kpi" + (danger ? " phc-kpi-danger" : "")}>
    <div class="phc-kpi-label">{label}</div>
    <div class="phc-kpi-value">{value}</div>
  </div>
);

const PHCBreakdownBar = ({ s }: { s: SignalContribution }) => {
  const pct = Math.round((s.points / s.maxPoints) * 100);
  const cm: Record<string, string> = {
    overdue: "#ef4444",
    velocity: "#3b82f6",
    deadline: "#f59e0b",
    engagement: "#8b5cf6",
    distribution: "#10b981",
  };
  const color = cm[s.signal] ?? "#6366f1";
  return (
    <div class="phc-bar-row">
      <div class="phc-bar-header">
        <span class="phc-bar-label">{s.label}</span>
        <span class="phc-bar-score">
          {s.points}
          <span class="phc-bar-max">/{s.maxPoints}</span>
        </span>
      </div>
      <div class="phc-bar-track">
        <div
          class="phc-bar-fill"
          style={{ width: String(pct) + "%", background: color } as Record<
            string,
            string
          >}
        />
      </div>
    </div>
  );
};

export default function ProjectHealthCard({ projectId }: Props) {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [history, setHistory] = useState<HealthHistoryPoint[]>([]);
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
        const [data, hist] = await Promise.all([
          fetchProjectHealth(projectId, token),
          fetchProjectHealthHistory(projectId, token).catch(() => []),
        ]);
        if (mounted) {
          setHealth(data);
          setHistory(hist);
        }
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
      const [data, hist] = await Promise.all([
        refreshProjectHealth(projectId, token),
        fetchProjectHealthHistory(projectId, token).catch(() => []),
      ]);
      setHealth(data);
      setHistory(hist);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div class="phc-card phc-loading">
        <div class="phc-skel-row" />
        <div class="phc-skel-grid">
          <div class="phc-skel-tile" />
          <div class="phc-skel-tile" />
          <div class="phc-skel-tile" />
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div class="phc-card phc-error">
        <p>{error ?? "Health data unavailable"}</p>
      </div>
    );
  }

  const score = health.score;
  const color = riskColor(health.riskLevel);

  const td = health.trendDirection;
  const trendIcon = td === "up"
    ? "\u2191"
    : td === "down"
    ? "\u2193"
    : "\u2192";
  const trendSign = (health.scoreTrend ?? 0) > 0 ? "+" : "";
  const trendVal = health.scoreTrend ?? 0;
  const trendText = health.scoreTrend === null
    ? "First snapshot"
    : trendSign + String(trendVal) + " this week";

  const riskCls = "phc-risk-chip phc-risk-" + health.riskLevel.toLowerCase();
  const trendChipCls = "phc-trend-chip " + (
    td === "up"
      ? "phc-trend-up"
      : td === "down"
      ? "phc-trend-down"
      : "phc-trend-flat"
  );

  return (
    <div
      class="phc-card"
      style={{ "--phc-accent": color } as Record<string, string>}
    >
      <div class="phc-top">
        <div>
          <h2 class="phc-title">Project Health Intelligence</h2>
          <div class="phc-top-badges">
            <span
              class="phc-score-chip"
              style={{ "--phc-chip-color": "var(--health-primary)" } as Record<
                string,
                string
              >}
            >
              Score: {score}
            </span>
            <span class={riskCls}>
              {riskEmoji(health.riskLevel)} {riskLabel(health.riskLevel)}
            </span>
          </div>
        </div>
        <button
          type="button"
          class="phc-refresh"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh health data"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {refreshing ? "Computing\u2026" : "Refresh"}
        </button>
      </div>

      <div class="phc-center">
        <div class="phc-gauge-wrap">
          <Gauge score={score} color={color} />
          <div class="phc-gauge-inner">
            <span
              class="phc-gauge-score"
              style={{ color } as Record<string, string>}
            >
              {score}
            </span>
            <span class="phc-gauge-label">Health Score</span>
          </div>
        </div>
        {health.scoreTrend !== null && (
          <div class={trendChipCls}>
            {trendIcon} {trendText}
          </div>
        )}
      </div>

      <div class="phc-kpi-grid">
        <PHCKPI
          label="Delivery Confidence"
          value={fmtPct(health.onTrackProbability)}
        />
        <PHCKPI
          label="Predicted Completion"
          value={fmtDate(health.predictedCompletionDate)}
        />
        <PHCKPI
          label="Overdue Tasks"
          value={String(health.metrics.overdueTasks)}
          danger={health.metrics.overdueTasks > 0}
        />
        <PHCKPI
          label="Open Tasks"
          value={String(
            health.metrics.totalTasks - health.metrics.completedTasks,
          )}
        />
        <PHCKPI
          label="Completed"
          value={String(health.metrics.completedTasks)}
        />
        <PHCKPI
          label="Team Members"
          value={String(health.metrics.activeMembers)}
        />
      </div>

      <div class="phc-section-card">
        <h3 class="phc-section-title">
          <span class="phc-section-icon">{"\u26A0\uFE0F"}</span>{" "}
          Top Risk Factors
        </h3>
        {health.topRiskFactors.length === 0
          ? <p class="phc-empty">No material risk factors detected.</p>
          : (
            <div class="phc-risk-list">
              {health.topRiskFactors.map((f, i) => (
                <div key={i} class="phc-risk-item">
                  <span class="phc-risk-icon">{"\u26A0"}</span>
                  <div>
                    <div class="phc-risk-item-title">{f.title}</div>
                    <div class="phc-risk-item-desc">{f.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {health.recommendations.length > 0 && (
        <div class="phc-section-card">
          <h3 class="phc-section-title">
            <span class="phc-section-icon" style="color:#6366f1">
              {"\u2713"}
            </span>{" "}
            Recommended Actions
          </h3>
          <div class="phc-action-list">
            {health.recommendations.map((a, i) => (
              <span key={i} class="phc-action-pill">{a.title}</span>
            ))}
          </div>
        </div>
      )}

      <div class="phc-section-card">
        <h3 class="phc-section-title">
          <span class="phc-section-icon">{"\uD83D\uDCCA"}</span>{" "}
          Health Score Breakdown
        </h3>
        <div class="phc-breakdown-list">
          {health.signalContributions.map((s) => (
            <PHCBreakdownBar key={s.signal} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
