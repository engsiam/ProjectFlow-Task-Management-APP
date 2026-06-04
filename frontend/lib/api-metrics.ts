import { signal } from "@preact/signals-core";

export interface ApiCallRecord {
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: number;
}

const MAX_RECORDS = 300;
const records = signal<ApiCallRecord[]>([]);

export function recordApiCall(call: ApiCallRecord) {
  const arr = records.value;
  const next = arr.length >= MAX_RECORDS ? arr.slice(-MAX_RECORDS + 1) : arr;
  records.value = [...next, call];
}

export function getApiRecords() {
  return records;
}

export function clearApiRecords() {
  records.value = [];
}

export function computeAggregates(recs: ApiCallRecord[]) {
  const map = new Map<string, {
    method: string;
    path: string;
    count: number;
    durations: number[];
    lastStatus: number;
    lastTimestamp: number;
  }>();

  for (const r of recs) {
    const key = `${r.method} ${r.path}`;
    const entry = map.get(key) || {
      method: r.method,
      path: r.path,
      count: 0,
      durations: [],
      lastStatus: r.status,
      lastTimestamp: r.timestamp,
    };
    entry.count++;
    entry.durations.push(r.duration);
    entry.lastStatus = r.status;
    entry.lastTimestamp = r.timestamp;
    map.set(key, entry);
  }

  return Array.from(map.values())
    .map((e) => {
      const sorted = [...e.durations].sort((a, b) => a - b);
      const avg = Math.round(e.durations.reduce((s, d) => s + d, 0) / e.count);
      return {
        method: e.method,
        path: e.path,
        count: e.count,
        avgDuration: avg,
        minDuration: sorted[0],
        maxDuration: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        lastStatus: e.lastStatus,
        lastTimestamp: e.lastTimestamp,
      };
    })
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

export type AggregatedMetrics = ReturnType<typeof computeAggregates>[number];
