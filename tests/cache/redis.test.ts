import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("redis", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "redis";
import { getRedisClient, resetRedisClient } from "../../src/cache/redis.js";

const mockCreateClient = vi.mocked(createClient);

beforeEach(() => {
  resetRedisClient();
  vi.resetAllMocks();
  delete process.env.REDIS_URL;
});

afterEach(() => {
  delete process.env.REDIS_URL;
});

describe("getRedisClient", () => {
  it("returns null when REDIS_URL is not set", async () => {
    const client = await getRedisClient();
    expect(client).toBeNull();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("creates and connects a Redis client when REDIS_URL is set", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const mockClient = { connect: vi.fn().mockResolvedValue(undefined) };
    mockCreateClient.mockReturnValue(mockClient as never);

    const client = await getRedisClient();
    expect(mockCreateClient).toHaveBeenCalledWith({ url: "redis://localhost:6379" });
    expect(mockClient.connect).toHaveBeenCalled();
    expect(client).toBe(mockClient);
  });

  it("returns null when Redis connection fails", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const mockClient = { connect: vi.fn().mockRejectedValue(new Error("Connection refused")) };
    mockCreateClient.mockReturnValue(mockClient as never);

    const client = await getRedisClient();
    expect(client).toBeNull();
  });

  it("returns the same client on subsequent calls (singleton)", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const mockClient = { connect: vi.fn().mockResolvedValue(undefined) };
    mockCreateClient.mockReturnValue(mockClient as never);

    const client1 = await getRedisClient();
    const client2 = await getRedisClient();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
  });

  it("does not retry after a failed connection", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const mockClient = { connect: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) };
    mockCreateClient.mockReturnValue(mockClient as never);

    await getRedisClient();
    await getRedisClient();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });
});
