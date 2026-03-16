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

// ─── Scenario G (filters): "level 3 fire spells" ─────────────────────────────

describe("user intent: find 3rd level fire spells", () => {
  it("returns only level 3 spells that deal fire damage", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("spells", "spells-phb.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      spell: [
        { name: "Fireball", source: "PHB", level: 3, school: "V", damageInflict: ["fire"] },
        { name: "Scorching Ray", source: "PHB", level: 2, school: "V", damageInflict: ["fire"] },
        { name: "Wall of Ice", source: "PHB", level: 6, school: "V", damageInflict: ["cold"] },
        { name: "Fly", source: "PHB", level: 3, school: "T" },
      ],
    });

    const results = await searchContentType("spells", "fire", "2024", 20, { level: 3 });
    const names = results.map((r) => r.name);
    expect(names).toContain("Fireball");
    expect(names).not.toContain("Scorching Ray");   // wrong level
    expect(names).not.toContain("Wall of Ice");     // wrong damage type
    expect(names).not.toContain("Fly");             // no fire damage
  });
});

// ─── Scenario H (filters): "wild shape forms for a 5th level druid" ──────────

describe("user intent: find wild shape forms for a 5th-level druid", () => {
  it("returns beasts with CR at most 1/2 (5th-level druid limit)", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("bestiary", "bestiary-mm.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        { name: "Wolf", source: "MM", type: "beast", cr: "1/4" },
        { name: "Black Bear", source: "MM", type: "beast", cr: "1/2" },
        { name: "Brown Bear", source: "MM", type: "beast", cr: "1" },
        { name: "Goblin", source: "MM", type: "humanoid", cr: "1/4" },
        { name: "Giant Eagle", source: "MM", type: "beast", cr: "1" },
      ],
    });

    // Level 5 druid: CR ≤ 1/2, beast type only
    const results = await searchContentType("bestiary", "", "2024", 20, {
      type: "beast",
      cr_max: "1/2",
    });
    const names = results.map((r) => r.name);
    expect(names).toContain("Wolf");
    expect(names).toContain("Black Bear");
    expect(names).not.toContain("Brown Bear");   // CR 1 exceeds limit
    expect(names).not.toContain("Goblin");       // not a beast
    expect(names).not.toContain("Giant Eagle");  // CR 1 exceeds limit
  });
});

// ─── Scenario I (filters): "legendary items" ─────────────────────────────────

describe("user intent: find legendary magic items", () => {
  it("returns only items with rarity 'legendary'", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("items", "items.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      item: [
        { name: "Vorpal Sword", source: "DMG", rarity: "legendary" },
        { name: "Cloak of Invisibility", source: "DMG", rarity: "legendary" },
        { name: "Flame Tongue", source: "DMG", rarity: "rare" },
        { name: "Bag of Holding", source: "PHB", rarity: "uncommon" },
      ],
    });

    const results = await searchContentType("items", "", "2024", 20, { rarity: "legendary" });
    const names = results.map((r) => r.name);
    expect(names).toContain("Vorpal Sword");
    expect(names).toContain("Cloak of Invisibility");
    expect(names).not.toContain("Flame Tongue");
    expect(names).not.toContain("Bag of Holding");
  });
});

// ─── Scenario K: environment filter for Nine Hells encounters ────────────────

describe("user intent: find monsters that live in the nine hells", () => {
  it("returns only monsters with 'nine hells' environment using structured filter", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("bestiary", "bestiary-mm.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        { name: "Imp", source: "MM", type: "fiend", cr: "1", environment: ["nine hells"] },
        { name: "Pit Fiend", source: "MM", type: "fiend", cr: "20", environment: ["nine hells"] },
        { name: "Balor", source: "MM", type: "fiend", cr: "19", environment: ["abyss"] },
        { name: "Brown Bear", source: "MM", type: "beast", cr: "1", environment: ["forest"] },
      ],
    });

    const results = await searchContentType("bestiary", "", "2014", 20, { environment: "nine hells" });
    const names = results.map((r) => r.name);
    expect(names).toContain("Imp");
    expect(names).toContain("Pit Fiend");
    expect(names).not.toContain("Balor");       // abyss, not nine hells
    expect(names).not.toContain("Brown Bear");  // forest, not nine hells
  });

  it("combines environment filter with type and cr_max for encounter building", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("bestiary", "bestiary-mm.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        { name: "Imp", source: "MM", type: "fiend", cr: "1", environment: ["nine hells"] },
        { name: "Chain Devil", source: "MM", type: "fiend", cr: "8", environment: ["nine hells"] },
        { name: "Pit Fiend", source: "MM", type: "fiend", cr: "20", environment: ["nine hells"] },
        { name: "Balor", source: "MM", type: "fiend", cr: "19", environment: ["abyss"] },
      ],
    });

    // Level 10 party: CR ≤ 10, fiend type, nine hells environment
    const results = await searchContentType("bestiary", "", "2014", 20, {
      type: "fiend",
      cr_max: "10",
      environment: "nine hells",
    });
    const names = results.map((r) => r.name);
    expect(names).toContain("Imp");
    expect(names).toContain("Chain Devil");
    expect(names).not.toContain("Pit Fiend");  // CR 20 exceeds limit
    expect(names).not.toContain("Balor");      // wrong environment
  });
});

// ─── Scenario L: fields projection for large result sets ─────────────────────

describe("user intent: get a summary list of monsters without full stat blocks", () => {
  it("returns only requested fields when fields parameter is provided", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("bestiary", "bestiary-mm.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        { name: "Imp", source: "MM", type: "fiend", cr: "1", ac: [{ ac: 13 }], hp: { average: 10 }, speed: { walk: 20 }, environment: ["nine hells"] },
        { name: "Chain Devil", source: "MM", type: "fiend", cr: "8", ac: [{ ac: 16 }], hp: { average: 85 }, speed: { walk: 30 }, environment: ["nine hells"] },
      ],
    });

    const results = await searchContentType("bestiary", "", "2014", 20, {}, ["name", "cr", "source", "type"]);
    expect(results).toHaveLength(2);
    // Only requested fields present
    expect(results[0]).toHaveProperty("name");
    expect(results[0]).toHaveProperty("cr");
    expect(results[0]).toHaveProperty("source");
    expect(results[0]).toHaveProperty("type");
    // Full stat block fields stripped
    expect(results[0]).not.toHaveProperty("ac");
    expect(results[0]).not.toHaveProperty("hp");
    expect(results[0]).not.toHaveProperty("speed");
    expect(results[0]).not.toHaveProperty("environment");
  });
});

// ─── Scenario M: homebrew search ─────────────────────────────────────────────

describe("user intent: find homebrew spells", () => {
  it("returns homebrew spells alongside official spells when include_homebrew=true", async () => {
    mockGetManifest.mockResolvedValue({
      ruleset: "2014" as const,
      built_at: Date.now(),
      content: {
        spells: [{ name: "spells-phb.json", path: "spells/spells-phb.json", url: "https://raw.example.com/spells-phb.json", sha: "phb1" }],
      },
      homebrew: {
        spells: [{ name: "spells-mercer.json", path: "spells/spells-mercer.json", url: "https://raw.example.com/spells-mercer.json", sha: "hb1" }],
      },
    } as never);

    mockFetchRaw
      .mockResolvedValueOnce({ spell: [{ name: "Fireball", source: "PHB", level: 3 }] })
      .mockResolvedValueOnce({ spell: [{ name: "Blood Curse of the Eyeless", source: "BMT", level: 1 }] });

    const results = await searchContentType("spells", "", "2014", 20, {}, undefined, true);
    const names = results.map((r) => r.name);
    expect(names).toContain("Fireball");
    expect(names).toContain("Blood Curse of the Eyeless");
  });

  it("returns only official spells when include_homebrew=false", async () => {
    mockGetManifest.mockResolvedValue({
      ruleset: "2014" as const,
      built_at: Date.now(),
      content: {
        spells: [{ name: "spells-phb.json", path: "spells/spells-phb.json", url: "https://raw.example.com/spells-phb.json", sha: "phb1" }],
      },
      homebrew: {
        spells: [{ name: "spells-mercer.json", path: "spells/spells-mercer.json", url: "https://raw.example.com/spells-mercer.json", sha: "hb1" }],
      },
    } as never);

    mockFetchRaw.mockResolvedValueOnce({ spell: [{ name: "Fireball", source: "PHB", level: 3 }] });

    const results = await searchContentType("spells", "", "2014");
    const names = results.map((r) => r.name);
    expect(names).toContain("Fireball");
    expect(mockFetchRaw).toHaveBeenCalledTimes(1);  // only official file fetched
  });
});

// ─── Scenario N: book search ──────────────────────────────────────────────────

describe("user intent: find available sourcebooks", () => {
  it("returns sourcebook entries when searching books by name", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("books", "books.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      book: [
        { name: "Player's Handbook", id: "PHB", source: "PHB", published: "2014-08-19" },
        { name: "Xanathar's Guide to Everything", id: "XGE", source: "XGE", published: "2017-11-21" },
        { name: "Tasha's Cauldron of Everything", id: "TCE", source: "TCE", published: "2020-11-17" },
      ],
    });

    const results = await searchContentType("books", "xanathar", "2014");
    expect(results.map((r) => r.name)).toContain("Xanathar's Guide to Everything");
    expect(results.map((r) => r.name)).not.toContain("Player's Handbook");
  });

  it("returns adventures when searching by name", async () => {
    mockGetManifest.mockResolvedValue(makeManifest("adventures", "adventures.json") as never);
    mockFetchRaw.mockResolvedValueOnce({
      adventure: [
        { name: "Lost Mine of Phandelver", id: "LMoP", source: "LMoP", published: "2014-07-15" },
        { name: "Curse of Strahd", id: "CoS", source: "CoS", published: "2016-03-15" },
      ],
    });

    const results = await searchContentType("adventures", "strahd", "2014");
    expect(results.map((r) => r.name)).toContain("Curse of Strahd");
    expect(results.map((r) => r.name)).not.toContain("Lost Mine of Phandelver");
  });
});

// ─── Scenario O: homebrew class search via omnisearch ────────────────────────

describe("user intent: find the blood hunter class", () => {
  it("returns homebrew class when searching with include_homebrew=true", async () => {
    mockGetManifest.mockResolvedValue({
      ruleset: "2014" as const,
      built_at: Date.now(),
      content: { class: [] },
      homebrew: {
        class: [{ name: "Matthew Mercer; Blood Hunter (2022).json", path: "class/Matthew Mercer; Blood Hunter (2022).json", url: "https://raw.example.com/blood-hunter.json", sha: "bh1" }],
      },
    } as never);

    mockFetchRaw.mockResolvedValueOnce({
      class: [{ name: "Blood Hunter", source: "BH2022", hd: { number: 1, faces: 10 } }],
    });

    const results = await searchContentType("class", "blood hunter", "2014", 20, {}, undefined, true);
    expect(results.map((r) => r.name)).toContain("Blood Hunter");
  });

  it("returns empty when searching classes without include_homebrew (official only)", async () => {
    mockGetManifest.mockResolvedValue({
      ruleset: "2014" as const,
      built_at: Date.now(),
      content: { class: [] },  // no official blood hunter
      homebrew: {
        class: [{ name: "Matthew Mercer; Blood Hunter (2022).json", path: "class/Matthew Mercer; Blood Hunter (2022).json", url: "https://raw.example.com/blood-hunter.json", sha: "bh1" }],
      },
    } as never);

    const results = await searchContentType("class", "blood hunter", "2014");
    expect(results).toHaveLength(0);
  });
});

// ─── Scenario J: no deep recursion into nested entries ───────────────────────

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
