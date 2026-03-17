import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { getRedisClient } from "./redis.js";

const CACHE_DIR = process.env.CACHE_DIR ?? join(homedir(), ".cache", "5emcp");

async function ensureCacheDir(): Promise<void> {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

function cachePath(key: string): string {
  // Sanitize key for use as filename
  const safe = key.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return join(CACHE_DIR, `${safe}.json`);
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (redis) {
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  }
  try {
    const data = await readFile(cachePath(key), "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const redis = await getRedisClient();
  if (redis) {
    const str = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setEx(key, ttlSeconds, str);
    } else {
      await redis.set(key, str);
    }
    return;
  }
  await ensureCacheDir();
  await writeFile(cachePath(key), JSON.stringify(value), "utf-8");
}

export async function cacheGetWithTTL<T>(key: string, ttlSeconds: number): Promise<T | null> {
  const redis = await getRedisClient();
  if (redis) {
    // Redis handles expiry natively — plain get suffices
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  }
  try {
    const info = await stat(cachePath(key));
    const ageSeconds = (Date.now() - info.mtimeMs) / 1000;
    if (ageSeconds > ttlSeconds) return null;
    const data = await readFile(cachePath(key), "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}
