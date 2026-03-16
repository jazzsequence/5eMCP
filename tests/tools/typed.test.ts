import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("../../src/search/index.js", () => ({
  searchContentType: vi.fn().mockResolvedValue([
    { name: "Fireball", source: "PHB", level: 3 },
  ]),
}));

vi.mock("../../src/search/get-entry.js", () => ({
  getEntry: vi.fn().mockResolvedValue({ name: "Fireball", source: "PHB", level: 3 }),
}));

import { registerTypedTools } from "../../src/tools/typed.js";
import { searchContentType } from "../../src/search/index.js";
import { getEntry } from "../../src/search/get-entry.js";

const mockSearch = vi.mocked(searchContentType);
const mockGetEntry = vi.mocked(getEntry);

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

describe("registerTypedTools", () => {
  it("registers spell_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["spell_search"]).toBeDefined();
  });

  it("registers spell_get tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["spell_get"]).toBeDefined();
  });

  it("registers monster_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["monster_search"]).toBeDefined();
  });

  it("registers monster_get tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["monster_get"]).toBeDefined();
  });

  it("registers item_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["item_search"]).toBeDefined();
  });

  it("registers item_get tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["item_get"]).toBeDefined();
  });

  it("registers condition_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["condition_search"]).toBeDefined();
  });

  it("registers vehicle_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["vehicle_search"]).toBeDefined();
  });

  it("registers trap_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["trap_search"]).toBeDefined();
  });

  it("registers psionic_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["psionic_search"]).toBeDefined();
  });

  it("registers deck_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["deck_search"]).toBeDefined();
  });

  it("registers reward_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["reward_search"]).toBeDefined();
  });

  it("registers optfeature_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["optfeature_search"]).toBeDefined();
  });

  it("registers table_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["table_search"]).toBeDefined();
  });

  it("registers variantrule_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["variantrule_search"]).toBeDefined();
  });

  it("registers race_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["race_search"]).toBeDefined();
  });

  it("registers race_get tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["race_get"]).toBeDefined();
  });

  it("registers background_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["background_search"]).toBeDefined();
  });

  it("registers feat_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["feat_search"]).toBeDefined();
  });

  it("registers deity_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["deity_search"]).toBeDefined();
  });

  it("registers language_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["language_search"]).toBeDefined();
  });

  it("registers skill_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["skill_search"]).toBeDefined();
  });

  it("registers sense_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["sense_search"]).toBeDefined();
  });

  it("spell_search calls searchContentType with correct args", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["spell_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "fire", ruleset: "2024", limit: 10 });
    expect(mockSearch).toHaveBeenCalledWith("spells", "fire", "2024", 10, {}, undefined, false);
  });

  it("spell_search passes level filter to searchContentType", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["spell_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "fire", ruleset: "2024", limit: 10, level: 3 });
    expect(mockSearch).toHaveBeenCalledWith("spells", "fire", "2024", 10, { level: 3 }, undefined, false);
  });

  it("spell_search passes school filter mapped to abbreviation", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["spell_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "", ruleset: "2024", limit: 20, school: "evocation" });
    expect(mockSearch).toHaveBeenCalledWith("spells", "", "2024", 20, { school: "V" }, undefined, false);
  });

  it("monster_search passes type and cr_max filters", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["monster_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "", ruleset: "2024", limit: 20, type: "beast", cr_max: "1/2" });
    expect(mockSearch).toHaveBeenCalledWith("bestiary", "", "2024", 20, { type: "beast", cr_max: "1/2" }, undefined, false);
  });

  it("monster_search passes environment filter", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["monster_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "", ruleset: "2024", limit: 20, environment: "underdark" });
    expect(mockSearch).toHaveBeenCalledWith("bestiary", "", "2024", 20, { environment: "underdark" }, undefined, false);
  });

  it("item_search passes rarity filter", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["item_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "", ruleset: "2024", limit: 20, rarity: "legendary" });
    expect(mockSearch).toHaveBeenCalledWith("items", "", "2024", 20, { rarity: "legendary" }, undefined, false);
  });

  it("spell_search passes fields parameter to searchContentType", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["spell_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "fire", ruleset: "2024", limit: 10, fields: ["name", "source"] });
    expect(mockSearch).toHaveBeenCalledWith("spells", "fire", "2024", 10, {}, ["name", "source"], false);
  });

  it("monster_search passes fields parameter to searchContentType", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["monster_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "", ruleset: "2024", limit: 20, fields: ["name", "cr", "type"] });
    expect(mockSearch).toHaveBeenCalledWith("bestiary", "", "2024", 20, {}, ["name", "cr", "type"], false);
  });

  it("spell_get calls getEntry with correct args", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["spell_get"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ name: "Fireball", source: "PHB", ruleset: "2024" });
    expect(mockGetEntry).toHaveBeenCalledWith("spells", "Fireball", "PHB", "2024");
  });

  it("spell_search returns results as JSON text", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["spell_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    const result = await handler({ query: "fire", ruleset: "2024", limit: 10 });
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text as string);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("spell_get returns error when entry not found", async () => {
    mockGetEntry.mockResolvedValueOnce(null);
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["spell_get"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    const result = await handler({ name: "Nonexistent", ruleset: "2024" });
    expect(result.isError).toBe(true);
  });

  it("registers book_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["book_search"]).toBeDefined();
  });

  it("registers book_get tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["book_get"]).toBeDefined();
  });

  it("registers adventure_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["adventure_search"]).toBeDefined();
  });

  it("registers adventure_get tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["adventure_get"]).toBeDefined();
  });

  it("registers class_search tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["class_search"]).toBeDefined();
  });

  it("registers class_get tool", () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    expect(tools["class_get"]).toBeDefined();
  });

  it("class_search calls searchContentType with class folder", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["class_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "blood hunter", ruleset: "2014", limit: 10 });
    expect(mockSearch).toHaveBeenCalledWith("class", "blood hunter", "2014", 10, {}, undefined, false);
  });

  it("book_search calls searchContentType with books folder", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["book_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "player", ruleset: "2024", limit: 10 });
    expect(mockSearch).toHaveBeenCalledWith("books", "player", "2024", 10, {}, undefined, false);
  });

  it("spell_search passes include_homebrew to searchContentType", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["spell_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "fire", ruleset: "2024", limit: 10, include_homebrew: true });
    expect(mockSearch).toHaveBeenCalledWith("spells", "fire", "2024", 10, {}, undefined, true);
  });

  it("spell_search passes include_homebrew=false by default", async () => {
    const { server, tools } = makeServer();
    registerTypedTools(server);
    const [, , , handler] = tools["spell_search"] as [string, string, unknown, (...args: unknown[]) => Promise<unknown>];
    await handler({ query: "fire", ruleset: "2024", limit: 10 });
    expect(mockSearch).toHaveBeenCalledWith("spells", "fire", "2024", 10, {}, undefined, false);
  });
});
