import { redis } from "./cache";

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const nowBucket = `${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const count = await redis.incr(nowBucket);
  if (count === 1) {
    await redis.expire(nowBucket, windowSeconds + 1);
  }
  return count <= limit;
}
