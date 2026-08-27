import Redis from "ioredis";
import { env } from "./env";

// Dedicated fail-fast connection, deliberately separate from the shared cache.ts `redis`
// client (which is configured with maxRetriesPerRequest: null / enableReadyCheck: false so
// BullMQ's worker can retry patiently through Redis blips without dropping in-flight jobs).
// enforceRateLimit() sits directly in the request path of every AI call, so it needs the
// opposite behaviour: same production guidance src/server/queue.ts already applies to its
// producer-side `queueConnection` — fail fast rather than hang the HTTP response.
const rateLimitRedis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  connectTimeout: 1500,
  commandTimeout: 1000,
  lazyConnect: false,
});

// Silence unhandled 'error' event crashes (ioredis emits these on top of rejecting the
// in-flight command promise); enforceRateLimit's own try/catch is what actually handles it.
rateLimitRedis.on("error", (err) => {
  console.error("[rate-limit] redis connection error:", err.message);
});

/**
 * Sliding-window-ish fixed-bucket rate limit backed by Redis INCR/EXPIRE.
 *
 * Fails OPEN (returns true / allows the request) if Redis itself is unreachable or too slow,
 * rather than hanging the request indefinitely or hard-blocking every AI call during a cache
 * outage. Rate limiting here is a cost/abuse control, not the primary security boundary
 * (auth + trip-access checks still run regardless), so availability wins this tradeoff.
 */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const nowBucket = `${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  try {
    const count = await rateLimitRedis.incr(nowBucket);
    if (count === 1) {
      await rateLimitRedis.expire(nowBucket, windowSeconds + 1);
    }
    return count <= limit;
  } catch (err) {
    console.error("[rate-limit] check failed, failing open:", key, err instanceof Error ? err.message : err);
    return true;
  }
}
