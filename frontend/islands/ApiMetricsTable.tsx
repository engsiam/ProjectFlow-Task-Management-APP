import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getApiRecords, clearApiRecords, computeAggregates } from "../lib/api-metrics.ts";
import { Icon, Button } from "../components/ui.tsx";

type Tab = "live" | "aggregated";

export default function ApiMetricsTable() {
  const [tab, setTab] = useState<Tab>("aggregated");
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState(false);
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const records = getApiRecords();
  const recs = records.value;
  const aggregates = useMemo(() => computeAggregates(recs), [recs]);
  const totalApiCalls = recs.length;
  const avgAll = recs.length
    ? Math.round(recs.reduce((s, r) => s + r.duration, 0) / recs.length)
    : 0;
  const slowest = recs.length ? Math.max(...recs.map((r) => r.duration)) : 0;

  const live = recs.slice(-50).reverse();

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <strong style={{ fontSize: "18px" }}>API Response Times</strong>
          <span class="badge badge-neutral" style={{ fontSize: "11px" }}>
            {totalApiCalls} calls
          </span>
          {totalApiCalls > 0 && (
            <>
              <span
                class="badge badge-success"
                style={{ fontSize: "11px" }}
              >
                avg {avgAll}ms
              </span>
              <span
                class="badge badge-danger"
                style={{ fontSize: "11px" }}
              >
                max {slowest}ms
              </span>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div class="btn-group" style={{ display: "flex" }}>
            <button
              type="button"
              class={`btn ${tab === "aggregated" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "12px", padding: "4px 12px" }}
              onClick={() => setTab("aggregated")}
            >
              By Endpoint
            </button>
            <button
              type="button"
              class={`btn ${tab === "live" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "12px", padding: "4px 12px" }}
              onClick={() => setTab("live")}
            >
              Live Log
            </button>
          </div>
          <Button variant="ghost" onClick={() => clearApiRecords()}>
            <Icon name="delete_sweep" size={16} /> Clear
          </Button>
        </div>
      </div>

      {tab === "aggregated"
        ? (
          <div style={{ overflowX: "auto" }}>
            <table class="api-metrics-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th style={{ textAlign: "right" }}>Calls</th>
                  <th style={{ textAlign: "right" }}>Avg (ms)</th>
                  <th style={{ textAlign: "right" }}>Min (ms)</th>
                  <th style={{ textAlign: "right" }}>Max (ms)</th>
                  <th style={{ textAlign: "right" }}>P95 (ms)</th>
                  <th>Last Status</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>
                        <Icon name="bar_chart" size={24} />
                        <p style={{ margin: "6px 0 0" }}>No API calls recorded yet. Interact with the app to see metrics.</p>
                      </td>
                    </tr>
                  )
                  : aggregates.map((a) => (
                    <tr key={`${a.method} ${a.path}`}>
                      <td>
                        <span class={`method-badge method-${a.method.toLowerCase()}`}>
                          {a.method}
                        </span>
                      </td>
                      <td style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "12px" }}>
                        {a.path}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{a.count}</td>
                      <td style={{ textAlign: "right" }}>
                        <span class={a.avgDuration > 500 ? "dur-slow" : a.avgDuration > 200 ? "dur-warn" : "dur-fast"}>
                          {a.avgDuration}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--muted)" }}>{a.minDuration}</td>
                      <td style={{ textAlign: "right", color: "var(--muted)" }}>{a.maxDuration}</td>
                      <td style={{ textAlign: "right" }}>
                        <span class={a.p95 > 500 ? "dur-slow" : a.p95 > 200 ? "dur-warn" : "dur-fast"}>
                          {a.p95}
                        </span>
                      </td>
                      <td>
                        <span class={`status-badge status-${Math.floor(a.lastStatus / 100)}`}>
                          {a.lastStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )
        : (
          <div ref={liveRef} style={{ overflowX: "auto" }}>
            <table class="api-metrics-table">
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>Time</th>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th style={{ textAlign: "right", width: "80px" }}>Duration</th>
                  <th style={{ width: "70px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {live.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>
                        <Icon name="timeline" size={24} />
                        <p style={{ margin: "6px 0 0" }}>No API calls recorded yet.</p>
                      </td>
                    </tr>
                  )
                  : live.map((r, i) => {
                    const ago = Math.round((now - r.timestamp) / 1000);
                    const timeLabel = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : `${Math.floor(ago / 3600)}h ago`;
                    return (
                      <tr key={`${r.timestamp}-${i}`}>
                        <td style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {timeLabel}
                        </td>
                        <td>
                          <span class={`method-badge method-${r.method.toLowerCase()}`}>
                            {r.method}
                          </span>
                        </td>
                        <td style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "12px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.path}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: '"JetBrains Mono", monospace' }}>
                          <span class={r.duration > 500 ? "dur-slow" : r.duration > 200 ? "dur-warn" : "dur-fast"}>
                            {r.duration}ms
                          </span>
                        </td>
                        <td>
                          <span class={`status-badge status-${Math.floor(r.status / 100)}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
