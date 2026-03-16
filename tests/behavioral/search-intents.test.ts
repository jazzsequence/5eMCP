/**
 * Behavioral tests — named after user intents, not implementation details.
 *
 * Each test scenario represents a realistic question a user might ask the MCP.
 * Mock data uses authentic 5etools field shapes so that regressions in search
 * behavior are caught before they reach users.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchContentType } from "../../src/search/index.js";

vi.mock("../../src/manifest/refresh.js", () => ({
  getManifest: vi.fn(),
}));

vi.mock("../../src/cache/index.js", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/github.js", () => ({
  fetchRaw: vi.fn(),
}));

import { getManifest } from "../../src/manifest/refresh.js";
import { fetchRaw } from "../../src/github.js";

const mockGetManifest = vi.mocked(getManifest);
const mockFetchRaw = vi.mocked(fetchRaw);

function makeManifest(contentType: string, fileName = "data.json") {
  return {
    ruleset: "2014" as const,
    built_at: Date.now(),
    content: {
      [contentType]: [
        {
          name: fileName,
          path: fileName,
          url: `https://raw.example.com/${fileName}`,
          sha: "abc123",
        },
      ],
    },
    homebrew: {},
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Scenario A: "find vestiges of divergence" ───────────────────────────────

describe("user intent: find vestiges of divergence", () => {
  it("returns items tagged Vst|EGW when searching 'vst'", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("items", "items.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      item: [
        { name: "Danoth's Visor", source: "EGW", rarity: "legendary", property: ["Vst|EGW"], wondrous: true },
        { name: "Infiltrator's Key", source: "EGW", rarity: "legendary", property: ["Vst|EGW"], wondrous: true },
        { name: "Longsword", source: "PHB", rarity: "none", property: ["V"], type: "M" },
      ],
    });

    const results = await searchContentType("items", "vst", "2014");
    const names = results.map((r) => r.name);
    expect(names).toContain("Danoth's Visor");
    expect(names).toContain("Infiltrator's Key");
    expect(names).not.toContain("Longsword");
  });

  it("returns Arms of the Betrayers (also tagged Vst|EGW) when searching 'vst'", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("items", "items.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      item: [
        { name: "Grovelthrash (Dormant)", source: "EGW", rarity: "artifact", property: ["V", "Vst|EGW"], type: "M" },
        { name: "Warhammer", source: "PHB", rarity: "none", property: ["V"], type: "M" },
      ],
    });

    const results = await searchContentType("items", "vst", "2014");
    const names = results.map((r) => r.name);
    expect(names).toContain("Grovelthrash (Dormant)");
    expect(names).not.toContain("Warhammer");
  });
});

// ─── Scenario B: "find fire spells" ──────────────────────────────────────────

describe("user intent: find fire spells", () => {
  it("returns spells with fire in damageInflict even when 'fire' is not in the name", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("spells", "spells-phb.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      spell: [
        { name: "Scorching Ray", source: "PHB", level: 2, school: "V", damageInflict: ["fire"] },
        { name: "Acid Arrow", source: "PHB", level: 2, school: "V", damageInflict: ["acid"] },
        { name: "Fireball", source: "PHB", level: 3, school: "V", damageInflict: ["fire"] },
      ],
    });

    const results = await searchContentType("spells", "fire", "2024");
    const names = results.map((r) => r.name);
    expect(names).toContain("Scorching Ray");
    expect(names).toContain("Fireball");
    expect(names).not.toContain("Acid Arrow");
  });
});

// ─── Scenario C: "find spells that inflict a condition" ──────────────────────

describe("user intent: find spells that poison targets", () => {
  it("returns spells with 'poisoned' in conditionInflict", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("spells", "spells-phb.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      spell: [
        { name: "Stinking Cloud", source: "PHB", level: 3, school: "C", conditionInflict: ["poisoned"] },
        { name: "Ray of Frost", source: "PHB", level: 0, school: "V", conditionInflict: ["restrained"] },
        { name: "Fireball", source: "PHB", level: 3, school: "V", damageInflict: ["fire"] },
      ],
    });

    const results = await searchContentType("spells", "poisoned", "2024");
    const names = results.map((r) => r.name);
    expect(names).toContain("Stinking Cloud");
    expect(names).not.toContain("Ray of Frost");
    expect(names).not.toContain("Fireball");
  });
});

// ─── Scenario D: "find underdark monsters" ───────────────────────────────────

describe("user intent: find monsters that live in the underdark", () => {
  it("returns monsters with 'underdark' in environment", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("bestiary", "bestiary-mm.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        { name: "Drow Elite Warrior", source: "MM", type: "humanoid", cr: "5", environment: ["underdark"] },
        { name: "Mind Flayer", source: "MM", type: "aberration", cr: "7", environment: ["underdark", "urban"] },
        { name: "Brown Bear", source: "MM", type: "beast", cr: "1", environment: ["forest", "hill"] },
      ],
    });

    const results = await searchContentType("bestiary", "underdark", "2024");
    const names = results.map((r) => r.name);
    expect(names).toContain("Drow Elite Warrior");
    expect(names).toContain("Mind Flayer");
    expect(names).not.toContain("Brown Bear");
  });
});

// ─── Scenario E: "find gods of faerun" ───────────────────────────────────────

describe("user intent: find gods of Faerun (Forgotten Realms pantheon)", () => {
  it("returns deities with pantheon matching 'forgotten realms'", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("deities", "deities.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      deity: [
        { name: "Tyr", source: "PHB", pantheon: "Forgotten Realms", alignment: ["L", "G"] },
        { name: "Moradin", source: "PHB", pantheon: "Forgotten Realms", alignment: ["L", "G"] },
        { name: "Avandra", source: "EGW", pantheon: "Exandria", alignment: ["C", "G"] },
      ],
    });

    const results = await searchContentType("deities", "forgotten realms", "2024");
    const names = results.map((r) => r.name);
    expect(names).toContain("Tyr");
    expect(names).toContain("Moradin");
    expect(names).not.toContain("Avandra");
  });

  it("returns deities when searching by setting name ('exandria')", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("deities", "deities.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      deity: [
        { name: "Avandra", source: "EGW", pantheon: "Exandria", alignment: ["C", "G"] },
        { name: "Tyr", source: "PHB", pantheon: "Forgotten Realms", alignment: ["L", "G"] },
      ],
    });

    const results = await searchContentType("deities", "exandria", "2024");
    const names = results.map((r) => r.name);
    expect(names).toContain("Avandra");
    expect(names).not.toContain("Tyr");
  });
});

// ─── Scenario F: "find finesse weapons" ──────────────────────────────────────

describe("user intent: find weapons with the finesse property", () => {
  it("returns items with 'F' in property array", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("items", "items.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      item: [
        { name: "Rapier", source: "PHB", type: "M", property: ["F"] },
        { name: "Shortsword", source: "PHB", type: "M", property: ["F", "L"] },
        { name: "Longsword", source: "PHB", type: "M", property: ["V"] },
        { name: "Greataxe", source: "PHB", type: "M", property: ["H", "2H"] },
      ],
    });

    const results = await searchContentType("items", "F", "2024");
    const names = results.map((r) => r.name);
    expect(names).toContain("Rapier");
    expect(names).toContain("Shortsword");
    expect(names).not.toContain("Greataxe");
  });
});

// ─── Scenario G: no deep recursion into nested entries ───────────────────────

describe("user intent: search does not match deeply nested text", () => {
  it("does not return a monster just because 'fire' appears inside an action description", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("bestiary", "bestiary-oota.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        {
          name: "Ice Toad",
          source: "OotA",
          type: "beast",
          environment: ["underdark"],
          action: [{ name: "Bite", entries: ["The toad breathes fire."] }],
        },
      ],
    });

    const results = await searchContentType("bestiary", "fire", "2024");
    expect(results.map((r) => r.name)).not.toContain("Ice Toad");
  });
});
