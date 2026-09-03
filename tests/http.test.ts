import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createHttpApp } from "../src/http.js";

async function jsonRpcRequest(
  baseUrl: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify(body),
  });
}

function initializeRequest(): unknown {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    },
  };
}

describe("HTTP transport", () => {
  let server: Server;
  let baseUrl: string;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(async () => {
    delete process.env.MCP_HTTP_TOKEN;
    server = createHttpApp();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("responds to /health", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body).toEqual({ status: "ok", service: "5eMCP" });
  });

  it("returns 404 for unknown paths", async () => {
    const res = await fetch(`${baseUrl}/nope`);
    expect(res.status).toBe(404);
  });

  it("rejects non-POST requests to /mcp with 405", async () => {
    const res = await fetch(`${baseUrl}/mcp`, { method: "GET" });
    expect(res.status).toBe(405);
  });

  it("handles a valid initialize request over POST /mcp", async () => {
    const res = await jsonRpcRequest(baseUrl, initializeRequest());
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('"5eMCP"');
  });

  it("returns 400 for malformed JSON body", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: "{not valid json",
    });
    expect(res.status).toBe(400);
  });
});

describe("HTTP transport with MCP_HTTP_TOKEN set", () => {
  let server: Server;
  let baseUrl: string;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(async () => {
    process.env.MCP_HTTP_TOKEN = "s3cr3t";
    server = createHttpApp();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("rejects requests without a Bearer token", async () => {
    const res = await jsonRpcRequest(baseUrl, initializeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with the wrong token", async () => {
    const res = await jsonRpcRequest(baseUrl, initializeRequest(), { Authorization: "Bearer wrong" });
    expect(res.status).toBe(401);
  });

  it("accepts requests with the correct token", async () => {
    const res = await jsonRpcRequest(baseUrl, initializeRequest(), { Authorization: "Bearer s3cr3t" });
    expect(res.status).toBe(200);
  });

  it("still serves /health without a token", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
  });
});
