import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/cache/redis.js", () => ({
  getRedisClient: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

import { getRedisClient } from "../../src/cache/redis.js";
import { readFile, writeFile, stat } from "node:fs/promises";
import { cacheGet, cacheSet, cacheGetWithTTL } from "../../src/cache/index.js";

const mockGetRedis = vi.mocked(getRedisClient);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockStat = vi.mocked(stat);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("cacheGet", () => {
  it("uses Redis when available", async () => {
    const mockRedis = { get: vi.fn().mockResolvedValue(JSON.stringify({ name: "Fireball" })) };
    mockGetRedis.mockResolvedValue(mockRedis as never);

    const result = await cacheGet("some-key");
    expect(mockRedis.get).toHaveBeenCalledWith("some-key");
    expect(result).toEqual({ name: "Fireball" });
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("returns null on Redis miss", async () => {
    const mockRedis = { get: vi.fn().mockResolvedValue(null) };
    mockGetRedis.mockResolvedValue(mockRedis as never);

    const result = await cacheGet("missing-key");
    expect(result).toBeNull();
  });

  it("falls back to disk when Redis unavailable", async () => {
    mockGetRedis.mockResolvedValue(null);
    mockReadFile.mockResolvedValue(JSON.stringify({ name: "Fireball" }) as never);

    const result = await cacheGet("some-key");
    expect(mockReadFile).toHaveBeenCalled();
    expect(result).toEqual({ name: "Fireball" });
  });

  it("returns null on disk miss", async () => {
    mockGetRedis.mockResolvedValue(null);
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const result = await cacheGet("missing-key");
    expect(result).toBeNull();
  });
});

describe("cacheSet", () => {
  it("uses Redis with TTL when ttlSeconds is provided", async () => {
    const mockRedis = { setEx: vi.fn().mockResolvedValue(undefined), set: vi.fn() };
    mockGetRedis.mockResolvedValue(mockRedis as never);

    await cacheSet("key", { name: "Fireball" }, 3600);
    expect(mockRedis.setEx).toHaveBeenCalledWith("key", 3600, JSON.stringify({ name: "Fireball" }));
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("uses Redis without TTL when no ttlSeconds provided", async () => {
    const mockRedis = { set: vi.fn().mockResolvedValue(undefined), setEx: vi.fn() };
    mockGetRedis.mockResolvedValue(mockRedis as never);

    await cacheSet("key", { name: "Fireball" });
    expect(mockRedis.set).toHaveBeenCalledWith("key", JSON.stringify({ name: "Fireball" }));
    expect(mockRedis.setEx).not.toHaveBeenCalled();
  });

  it("falls back to disk when Redis unavailable", async () => {
    mockGetRedis.mockResolvedValue(null);

    await cacheSet("key", { name: "Fireball" });
    expect(mockWriteFile).toHaveBeenCalled();
  });
});

describe("cacheGetWithTTL", () => {
  it("uses Redis get (Redis handles expiry natively)", async () => {
    const mockRedis = { get: vi.fn().mockResolvedValue(JSON.stringify({ data: "manifest" })) };
    mockGetRedis.mockResolvedValue(mockRedis as never);

    const result = await cacheGetWithTTL("manifest:2024", 3600);
    expect(mockRedis.get).toHaveBeenCalledWith("manifest:2024");
    expect(mockStat).not.toHaveBeenCalled();
    expect(result).toEqual({ data: "manifest" });
  });

  it("falls back to disk TTL check when Redis unavailable", async () => {
    mockGetRedis.mockResolvedValue(null);
    const recentMtime = new Date(Date.now() - 60_000); // 1 minute ago
    mockStat.mockResolvedValue({ mtimeMs: recentMtime.getTime() } as never);
    mockReadFile.mockResolvedValue(JSON.stringify({ data: "manifest" }) as never);

    const result = await cacheGetWithTTL("manifest:2024", 3600);
    expect(result).toEqual({ data: "manifest" });
  });

  it("returns null when disk cache is expired", async () => {
    mockGetRedis.mockResolvedValue(null);
    const oldMtime = new Date(Date.now() - 7_200_000); // 2 hours ago
    mockStat.mockResolvedValue({ mtimeMs: oldMtime.getTime() } as never);

    const result = await cacheGetWithTTL("manifest:2024", 3600);
    expect(result).toBeNull();
  });
});
