import { useEffect, useState } from "preact/hooks";
import {
  fetchProjectHealth,
  fetchProjectHealthHistory,
  type HealthHistoryPoint,
  type HealthResult,
  insightAccent,
  refreshProjectHealth,
  riskColor,
  riskEmoji,
  riskLabel,
  riskShort,
  type SignalContribution,
} from "../lib/health.ts";
import { getAccessToken } from "../lib/auth.ts";

interface Props {
  projectId: string;
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

const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

// ── SVG circular gauge ─────────────────────────────────────────────
const Gauge = ({ score, color }: { score: number; color: string }) => {
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <svg viewBox="0 0 140 140" class="phi-gauge-svg" aria-hidden="true">
      <defs>
        <linearGradient
          id="phi-gauge-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stop-color={color} stop-opacity="0.85" />
          <stop offset="100%" stop-color={color} stop-opacity="1" />
        </linearGradient>
      </defs>
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        stroke-width="12"
      />
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="url(#phi-gauge-gradient)"
        stroke-width="12"
        stroke-linecap="round"
        stroke-dasharray={circ}
        stroke-dashoffset={offset}
        transform="rotate(-90 70 70)"
        style="transition: stroke-dashoffset 700ms cubic-bezier(0.4, 0, 0.2, 1);"
      />
    </svg>
  );
};

// ── Mini sparkline ─────────────────────────────────────────────────
const Sparkline = ({ points }: { points: HealthHistoryPoint[] }) => {
  if (points.length < 2) {
    return (
      <div class="phi-spark-empty">
        No history yet — refresh to capture snapshots.
      </div>
    );
  }
  const w = 320;
  const h = 64;
  const pad = 4;
  const xs = points.map((p) => new Date(p.computedAt).getTime());
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const rangeX = Math.max(1, maxX - minX);
  const ys = points.map((p) => p.score);
  const minY = 0;
  const maxY = 100;
  const rangeY = Math.max(1, maxY - minY);
  const toX = (x: number) => pad + ((x - minX) / rangeX) * (w - pad * 2);
  const toY = (y: number) => pad + (1 - (y - minY) / rangeY) * (h - pad * 2);
  const path = points
    .map((p, i) =>
      `${i === 0 ? "M" : "L"} ${toX(new Date(p.computedAt).getTime())} ${
        toY(p.score)
      }`
    )
    .join(" ");
  const last = points[points.length - 1];
  const color = riskColor(last.riskLevel);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      class="phi-spark-svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="phi-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={color} stop-opacity="0.35" />
          <stop offset="100%" stop-color={color} stop-opacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${toX(maxX)} ${h - pad} L ${toX(minX)} ${h - pad} Z`}
        fill="url(#phi-spark-fill)"
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  );
};

// ── Signal bar row ─────────────────────────────────────────────────
const SignalBar = ({ s }: { s: SignalContribution }) => {
  const pct = Math.round((s.points / s.maxPoints) * 100);
  const color = pct >= 80
    ? "var(--health-success, #10b981)"
    : pct >= 50
    ? "var(--health-warning, #f59e0b)"
    : "var(--health-danger, #ef4444)";
  return (
    <li class="phi-signal-row">
      <div class="phi-signal-row-label">
        <span>{s.label}</span>
        <span class="phi-signal-row-value">
          <strong>{s.points}</strong>
          <span class="phi-signal-row-max">/ {s.maxPoints}</span>
        </span>
      </div>
      <div class="phi-signal-bar">
        <div
          class="phi-signal-bar-fill"
          style={`width:${pct}%;background:${color}`}
        />
      </div>
    </li>
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
      <div class="phi-card phi-loading">
        <div class="phi-skel-row" />
        <div class="phi-skel-grid">
          <div class="phi-skel-tile" />
          <div class="phi-skel-tile" />
          <div class="phi-skel-tile" />
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div class="phi-card phi-error">
        <p>⚠️ {error ?? "Health data unavailable"}</p>
      </div>
    );
  }

  const score = health.score;
  const color = riskColor(health.riskLevel);
  const trendIcon = health.trendDirection === "up"
    ? "↑"
    : health.trendDirection === "down"
    ? "↓"
    : "→";
  const trendClass = health.trendDirection === "up"
    ? "phi-trend-up"
    : health.trendDirection === "down"
    ? "phi-trend-down"
    : "phi-trend-flat";
  const trendLabel = health.scoreTrend === null
    ? "First snapshot"
    : health.scoreTrend === 0
    ? "No change since last snapshot"
    : `${
      health.scoreTrend > 0 ? "+" : ""
    }${health.scoreTrend} from last snapshot`;

  return (
    <section class="phi-card" style={`--phi-accent:${color}`}>
      <header class="phi-header">
        <div>
          <h2 class="phi-title">📊 Project Health Intelligence</h2>
          <p class="phi-subtitle">
            Risk Assessment Engine · Continuous Forecast
          </p>
        </div>
        <button
          type="button"
          class="phi-refresh"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Recompute health"
        >
          {refreshing ? "⏳" : "🔄"}{" "}
          <span class="phi-refresh-label">
            {refreshing ? "Computing…" : "Refresh"}
          </span>
        </button>
      </header>

      <div class="phi-headline">
        <div class="phi-gauge">
          <Gauge score={score} color={color} />
          <div class="phi-gauge-text">
            <div class="phi-score" style={`color:${color}`}>{score}</div>
            <div class="phi-score-suffix">/ 100</div>
          </div>
        </div>

        <div class="phi-headline-info">
          <div class="phi-status">
            <span class="phi-status-dot" style={`background:${color}`} />
            <span class="phi-status-label">
              {riskEmoji(health.riskLevel)} {riskShort(health.riskLevel)}
            </span>
            <span class="phi-status-desc">{riskLabel(health.riskLevel)}</span>
          </div>

          <div class={`phi-trend ${trendClass}`}>
            <span class="phi-trend-icon">{trendIcon}</span>
            <span class="phi-trend-text">{trendLabel}</span>
          </div>

          <div class="phi-trend-strip">
            <Sparkline points={history} />
          </div>
        </div>
      </div>

      <div class="phi-metric-grid">
        <div class="phi-metric">
          <div class="phi-metric-label">Health Score</div>
          <div class="phi-metric-value" style={`color:${color}`}>
            {score}
            <span class="phi-metric-suffix">/100</span>
          </div>
        </div>
        <div class="phi-metric">
          <div class="phi-metric-label">Risk Level</div>
          <div
            class="phi-metric-value phi-metric-text"
            style={`color:${color}`}
          >
            {riskShort(health.riskLevel)}
          </div>
        </div>
        <div class="phi-metric">
          <div class="phi-metric-label">On-Track Probability</div>
          <div class="phi-metric-value">
            {fmtPct(health.onTrackProbability)}
            <div class="phi-prob-bar">
              <div
                class="phi-prob-bar-fill"
                style={`width:${
                  Math.round(health.onTrackProbability * 100)
                }%;background:${color}`}
              />
            </div>
          </div>
        </div>
        <div class="phi-metric">
          <div class="phi-metric-label">Predicted Completion</div>
          <div class="phi-metric-value phi-metric-text">
            {fmtDate(health.predictedCompletionDate)}
          </div>
        </div>
        <div class="phi-metric">
          <div class="phi-metric-label">Open Tasks</div>
          <div class="phi-metric-value">
            {health.metrics.totalTasks - health.metrics.completedTasks}
            <span class="phi-metric-suffix">
              / {health.metrics.totalTasks}
            </span>
          </div>
        </div>
        <div class="phi-metric">
          <div class="phi-metric-label">Completed Tasks</div>
          <div class="phi-metric-value phi-metric-success">
            {health.metrics.completedTasks}
          </div>
        </div>
        <div class="phi-metric">
          <div class="phi-metric-label">Overdue Tasks</div>
          <div
            class={`phi-metric-value ${
              health.metrics.overdueTasks > 0 ? "phi-metric-danger" : ""
            }`}
          >
            {health.metrics.overdueTasks}
          </div>
        </div>
        <div class="phi-metric">
          <div class="phi-metric-label">Open vs Closed</div>
          <div class="phi-metric-value phi-metric-text">
            {health.metrics.totalTasks - health.metrics.completedTasks} :{" "}
            {health.metrics.completedTasks}
          </div>
        </div>
      </div>

      <div class="phi-section-grid">
        <section class="phi-section">
          <h3 class="phi-section-title">
            <span class="phi-section-icon" style="color:#f59e0b">⚠️</span>
            Top Risk Factors
          </h3>
          {health.topRiskFactors.length === 0
            ? <p class="phi-empty">No material risk factors detected. 🎉</p>
            : (
              <ul class="phi-list">
                {health.topRiskFactors.map((f, i) => (
                  <li
                    key={i}
                    class="phi-list-item"
                    style={`--phi-list-accent:${insightAccent(f.type)}`}
                  >
                    <div class="phi-list-title">{f.title}</div>
                    <div class="phi-list-text">{f.text}</div>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section class="phi-section">
          <h3 class="phi-section-title">
            <span class="phi-section-icon" style="color:#6366f1">✓</span>
            Recommended Actions
          </h3>
          {health.recommendations.length === 0
            ? <p class="phi-empty">No actions needed right now.</p>
            : (
              <ul class="phi-list">
                {health.recommendations.map((a, i) => (
                  <li
                    key={i}
                    class="phi-list-item phi-list-item-action"
                    style={`--phi-list-accent:${insightAccent(a.type)}`}
                  >
                    <div class="phi-list-title">{a.title}</div>
                    <div class="phi-list-text">{a.text}</div>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>

      <details class="phi-breakdown">
        <summary>
          <span>Health Score Breakdown</span>
          <span class="phi-breakdown-final">
            <strong>{score}</strong>
            <span class="phi-breakdown-suffix">/100</span>
          </span>
        </summary>
        <ul class="phi-signals">
          {health.signalContributions.map((s) => (
            <SignalBar key={s.signal} s={s} />
          ))}
        </ul>
      </details>
    </section>
  );
}
