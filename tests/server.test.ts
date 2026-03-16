import { describe, it, expect } from "vitest";
import { createServer } from "../src/server.js";

/**
 * Integration test: verifies createServer() registers all tools without conflict.
 * The MCP SDK throws synchronously on duplicate tool names, so this catches
 * any name collision introduced by future tool additions.
 */
describe("createServer", () => {
  it("registers all tools without duplicate name collisions", () => {
    expect(() => createServer()).not.toThrow();
  });

  it("registers a non-zero number of tools", () => {
    const server = createServer();
    // McpServer exposes registered tools via _registeredTools (internal map)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (server as any)._registeredTools as Record<string, unknown>;
    expect(Object.keys(tools).length).toBeGreaterThan(0);
  });

  it("registers expected core tools", () => {
    const server = createServer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (server as any)._registeredTools as Record<string, unknown>;
    const toolNames = Object.keys(tools);

    // Meta tools
    expect(toolNames).toContain("manifest_status");
    expect(toolNames).toContain("list_sources");

    // Passthrough tool
    expect(toolNames).toContain("fetch_content");

    // Omnisearch
    expect(toolNames).toContain("omnisearch");

    // Representative typed search tools
    expect(toolNames).toContain("spell_search");
    expect(toolNames).toContain("monster_search");
    expect(toolNames).toContain("item_search");

    // Representative typed get tools
    expect(toolNames).toContain("spell_get");
    expect(toolNames).toContain("monster_get");

    // Book/adventure index tools (from typed.ts — these conflict with book_content_get if misnamed)
    expect(toolNames).toContain("book_get");
    expect(toolNames).toContain("adventure_get");

    // Sourcebook prose tool
    expect(toolNames).toContain("book_content_get");
  });

  it("has no duplicate tool names", () => {
    const server = createServer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (server as any)._registeredTools as Record<string, unknown>;
    const toolNames = Object.keys(tools);

    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const name of toolNames) {
      if (seen.has(name)) duplicates.push(name);
      seen.add(name);
    }
    expect(duplicates).toEqual([]);
  });
});
