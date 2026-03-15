import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("../../src/search/omnisearch.js", () => ({
  omnisearch: vi.fn().mockResolvedValue([
    { name: "Fireball", source: "PHB", entityType: "spell" },
    { name: "Fire Giant", source: "MM", entityType: "monster" },
  ]),
}));

import { registerOmnisearchTool } from "../../src/tools/omnisearch.js";
import { omnisearch } from "../../src/search/omnisearch.js";

const mockOmnisearch = vi.mocked(omnisearch);

function makeServer() {
  const tools: Record<string, Parameters<McpServer["tool"]>> = {};
  const server = {
    tool: vi.fn((...args: Parameters<McpServer["tool"]>) => {
      const name = args[0] as string;
      tools[name] = args;
    }),
  } as unknown as McpServer;
  return { server, tools };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerOmnisearchTool", () => {
  it("registers the omnisearch tool", () => {
    const { server, tools } = makeServer();
    registerOmnisearchTool(server);
    expect(tools["omnisearch"]).toBeDefined();
  });

  it("calls omnisearch with correct args", async () => {
    const { server, tools } = makeServer();
    registerOmnisearchTool(server);
    const [, , , handler] = tools["omnisearch"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "fire", ruleset: "2024" });
    expect(mockOmnisearch).toHaveBeenCalledWith("fire", "2024", expect.any(Number));
  });

  it("returns results as JSON text with counts", async () => {
    const { server, tools } = makeServer();
    registerOmnisearchTool(server);
    const [, , , handler] = tools["omnisearch"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    const result = await handler({ query: "fire", ruleset: "2024" });
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.total).toBe(2);
    expect(Array.isArray(parsed.results)).toBe(true);
  });

  it("groups results by entityType in summary", async () => {
    const { server, tools } = makeServer();
    registerOmnisearchTool(server);
    const [, , , handler] = tools["omnisearch"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    const result = await handler({ query: "fire", ruleset: "2024" });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.by_type).toBeDefined();
    expect(parsed.by_type.spell).toBe(1);
    expect(parsed.by_type.monster).toBe(1);
  });
});
