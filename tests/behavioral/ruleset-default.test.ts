/**
 * Behavioral test: setting DEFAULT_RULESET must change the default reported
 * by every tool that accepts a `ruleset` parameter, consistently. This is
 * the regression covered by issue #17 — calculators.ts previously hardcoded
 * "2014" as its default while the other five tool files hardcoded "2024",
 * and neither ever read DEFAULT_RULESET at all.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("../../src/search/index.js", () => ({ searchContentType: vi.fn() }));
vi.mock("../../src/search/get-entry.js", () => ({ getEntry: vi.fn() }));
vi.mock("../../src/search/omnisearch.js", () => ({ omnisearch: vi.fn() }));
vi.mock("../../src/search/book-content.js", () => ({ getBookContent: vi.fn() }));
vi.mock("../../src/manifest/refresh.js", () => ({ getManifest: vi.fn() }));
vi.mock("../../src/translation/index.js", () => ({
  hasTypedHandler: vi.fn(),
  translate: vi.fn(),
}));
vi.mock("../../src/github.js", () => ({ fetchRaw: vi.fn() }));
vi.mock("../../src/cache/index.js", () => ({ cacheGet: vi.fn(), cacheSet: vi.fn() }));
vi.mock("../../src/cache/keys.js", () => ({ contentKey: vi.fn() }));
vi.mock("../../src/calculators/cr.js", () => ({ calculateCr: vi.fn(), scaleCr: vi.fn() }));
vi.mock("../../src/calculators/encounter.js", () => ({ buildEncounter: vi.fn() }));
vi.mock("../../src/calculators/loot.js", () => ({ generateLoot: vi.fn() }));

function makeServer() {
  const tools: Record<string, unknown[]> = {};
  const server = {
    tool: vi.fn((...args: unknown[]) => {
      tools[args[0] as string] = args;
    }),
  } as unknown as McpServer;
  return { server, tools };
}

// Every tool in this codebase registers as tool(name, description, paramsShape, callback).
function paramsShapeOf(call: unknown[]): Record<string, { parse: (v: unknown) => unknown }> {
  return call[2] as Record<string, { parse: (v: unknown) => unknown }>;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function registerAllRulesetTools(server: McpServer) {
  const { registerMetaTools } = await import("../../src/tools/meta.js");
  const { registerCalculatorTools } = await import("../../src/tools/calculators.js");
  const { registerOmnisearchTool } = await import("../../src/tools/omnisearch.js");
  const { registerPassthroughTools } = await import("../../src/tools/passthrough.js");
  const { registerBookContentTool } = await import("../../src/tools/book-content.js");
  const { registerTypedTools } = await import("../../src/tools/typed.js");

  registerMetaTools(server);
  registerCalculatorTools(server);
  registerOmnisearchTool(server);
  registerPassthroughTools(server);
  registerBookContentTool(server);
  registerTypedTools(server);
}

describe("DEFAULT_RULESET propagation across all tools", () => {
  it("every tool's ruleset parameter defaults to '2014' when DEFAULT_RULESET=2014", async () => {
    vi.stubEnv("DEFAULT_RULESET", "2014");
    vi.resetModules();

    const { server, tools } = makeServer();
    await registerAllRulesetTools(server);

    const toolNamesWithRuleset = Object.keys(tools).filter(
      (name) => paramsShapeOf(tools[name]).ruleset !== undefined,
    );

    // Sanity check: this suite is only meaningful if it actually found
    // tools with a ruleset parameter across multiple files (incl. calculators).
    expect(toolNamesWithRuleset).toContain("encounter_build");
    expect(toolNamesWithRuleset.length).toBeGreaterThan(5);

    for (const name of toolNamesWithRuleset) {
      const ruleset = paramsShapeOf(tools[name]).ruleset;
      expect(ruleset.parse(undefined)).toBe("2014");
    }
  });

  it("every tool's ruleset parameter defaults to '2024' when DEFAULT_RULESET is unset", async () => {
    delete process.env.DEFAULT_RULESET;
    vi.resetModules();

    const { server, tools } = makeServer();
    await registerAllRulesetTools(server);

    const toolNamesWithRuleset = Object.keys(tools).filter(
      (name) => paramsShapeOf(tools[name]).ruleset !== undefined,
    );

    for (const name of toolNamesWithRuleset) {
      const ruleset = paramsShapeOf(tools[name]).ruleset;
      expect(ruleset.parse(undefined)).toBe("2024");
    }
  });
});
