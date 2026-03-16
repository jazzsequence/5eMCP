import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let _client: RedisClient | null = null;
let _attempted = false;

/**
 * Returns a connected Redis client if REDIS_URL is set and the connection
 * succeeds. Returns null otherwise (falls back to disk cache).
 * Singleton — connection is attempted once; failures are not retried.
 */
export async function getRedisClient(): Promise<RedisClient | null> {
  if (!process.env.REDIS_URL) return null;
  if (_attempted) return _client;

  _attempted = true;
  try {
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    _client = client;
    return _client;
  } catch {
    _client = null;
    return null;
  }
}

/** Reset singleton state — for use in tests only. */
export function resetRedisClient(): void {
  _client = null;
  _attempted = false;
}
