// A simple in-memory rate limiter (token-bucket-ish) keyed by IP + path.
// Suitable for protecting auth endpoints at small scale; replace with Redis
// in production for multi-instance deployments.

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export const rateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } => {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }
  if (b.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { allowed: true, remaining: limit - b.count, resetAt: b.resetAt };
};

// Periodic cleanup to avoid unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();
