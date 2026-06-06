import { useEffect, useState } from "preact/hooks";
import { getAccessToken } from "../lib/auth.ts";

const base = "https://projectflow-backend.engsiam.deno.net/api".replace(
  /\/$/,
  "",
);

type TrendPoint = { date: string; label: string; value: number };

const SVGSpark = (
  { points, color }: { points: TrendPoint[]; color: string },
) => {
  if (points.length < 2) return <div class="atc-empty">Not enough data</div>;
  const max = Math.max(...points.map((p) => p.value), 1);
  const w = 320;
  const h = 56;
  const pad = 4;
  const toX = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const toY = (v: number) => pad + (1 - v / max) * (h - pad * 2);
  const path = points.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.value)}`
  ).join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      class="atc-spark-svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={`atc-grad-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stop-color={color} stop-opacity="0.25" />
          <stop offset="100%" stop-color={color} stop-opacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${toX(points.length - 1)} ${h - pad} L ${toX(0)} ${
          h - pad
        } Z`}
        fill={`url(#atc-grad-${color.replace("#", "")})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  );
};

const TrendCard = (
  { title, points, color }: {
    title: string;
    points: TrendPoint[];
    color: string;
  },
) => {
  const avg = points.length
    ? Math.round(points.reduce((a, p) => a + p.value, 0) / points.length * 10) /
      10
    : 0;
  return (
    <div class="atc-card">
      <div class="atc-card-header">
        <span class="atc-card-title">{title}</span>
        <span class="atc-card-avg">{avg}</span>
      </div>
      <SVGSpark points={points} color={color} />
    </div>
  );
};

export default function AnalyticsTrendsCharts() {
  const [trends, setTrends] = useState<Record<string, TrendPoint[]> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = getAccessToken();
        if (!token) return;
        const r = await fetch(`${base}/analytics/trends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await r.json();
        if (mounted && body.data) {
          setTrends({
            completion: (body.data.completion?.completed ?? []) as TrendPoint[],
            velocity: body.data.velocity as TrendPoint[],
            overdue: body.data.overdue as TrendPoint[],
            activity: body.data.activity as TrendPoint[],
            health: body.data.health as TrendPoint[],
          });
        }
      } catch {
        /* ignore */
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
      <section class="atc-section">
        <div class="atc-loading">Loading trends…</div>
      </section>
    );
  }
  if (!trends) return null;

  return (
    <section class="atc-section">
      <h3 class="atc-section-title">Trends (30 Days)</h3>
      <div class="atc-grid">
        <TrendCard
          title="Completion"
          points={trends.completion}
          color="#22c55e"
        />
        <TrendCard title="Velocity" points={trends.velocity} color="#3b82f6" />
        <TrendCard title="Overdue" points={trends.overdue} color="#ef4444" />
        <TrendCard
          title="Team Activity"
          points={trends.activity}
          color="#f59e0b"
        />
        <TrendCard
          title="Project Health"
          points={trends.health}
          color="#6366f1"
        />
      </div>
    </section>
  );
}
