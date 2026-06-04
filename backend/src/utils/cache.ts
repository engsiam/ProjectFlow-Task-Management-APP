// Simple in-memory TTL cache. NOT shared across workers — single-process only.

const store = new Map<string, { value: unknown; expiry: number }>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiry <= now) store.delete(key);
    }
  }, 30_000).unref?.();
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiry <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiry: Date.now() + ttlMs });
  startCleanup();
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheClear(): void {
  store.clear();
}

export function cacheKey(...parts: string[]): string {
  return parts.join(":");
}
