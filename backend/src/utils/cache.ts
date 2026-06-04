// Simple in-memory cache with TTL.
// Use for expensive queries like dashboard analytics.
// In production, replace with Deno KV or Redis.

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiry < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = 15_000): void {
  store.set(key, { value, expiry: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheClear(): void {
  store.clear();
}

// Build a cache key from userId and optional suffix
export function cacheKey(userId: string, suffix = ""): string {
  return `pf:${userId}:${suffix}`;
}
