import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchContentType } from "../../src/search/index.js";

// Mock dependencies
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

const FAKE_MANIFEST = {
  ruleset: "2024" as const,
  built_at: Date.now(),
  content: {
    spells: [
      { name: "spells-phb.json", path: "spells/spells-phb.json", url: "https://raw.example.com/spells-phb.json", sha: "abc123" },
      { name: "spells-xge.json", path: "spells/spells-xge.json", url: "https://raw.example.com/spells-xge.json", sha: "def456" },
    ],
    deities: [
      { name: "deities.json", path: "deities.json", url: "https://raw.example.com/deities.json", sha: "deity1" },
    ],
    items: [
      { name: "items.json", path: "items.json", url: "https://raw.example.com/items.json", sha: "item1" },
    ],
    bestiary: [
      { name: "bestiary-mm.json", path: "bestiary/bestiary-mm.json", url: "https://raw.example.com/bestiary-mm.json", sha: "mm1" },
    ],
  },
  homebrew: {
    spells: [
      { name: "homebrew-spells.json", path: "spells/homebrew-spells.json", url: "https://raw.example.com/homebrew-spells.json", sha: "hb1" },
    ],
  },
};

const PHB_SPELLS = {
  spell: [
    { name: "Fireball", source: "PHB", level: 3, school: "V" },
    { name: "Magic Missile", source: "PHB", level: 1, school: "V" },
    { name: "Fire Shield", source: "PHB", level: 4, school: "A" },
  ],
};

const XGE_SPELLS = {
  spell: [
    { name: "Firestorm", source: "XGE", level: 7, school: "V" },
    { name: "Ice Storm", source: "XGE", level: 4, school: "V" },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockGetManifest.mockResolvedValue(FAKE_MANIFEST as never);
});

describe("searchContentType", () => {
  it("returns entries matching query (case-insensitive)", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "fire", "2024");
    const names = results.map((r) => r.name);
    expect(names).toContain("Fireball");
    expect(names).toContain("Fire Shield");
    expect(names).toContain("Firestorm");
    expect(names).not.toContain("Magic Missile");
    expect(names).not.toContain("Ice Storm");
  });

  it("matches query case-insensitively", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "FIREBALL", "2024");
    expect(results.map((r) => r.name)).toContain("Fireball");
  });

  it("returns all entries when query is empty string", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "", "2024");
    expect(results).toHaveLength(5);
  });

  it("respects the limit parameter", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "", "2024", 2);
    expect(results).toHaveLength(2);
  });

  it("returns empty array when content type not in manifest", async () => {
    const results = await searchContentType("unknown", "fire", "2024");
    expect(results).toHaveLength(0);
  });

  it("returns empty array when query matches nothing", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "xyzzy", "2024");
    expect(results).toHaveLength(0);
  });

  it("matches on source field", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "XGE", "2024");
    const names = results.map((r) => r.name);
    expect(names).toContain("Firestorm");
    expect(names).toContain("Ice Storm");
    expect(names).not.toContain("Fireball");
  });

  it("matches on pantheon field", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      deity: [
        { name: "Avandra", source: "EGW", pantheon: "Exandria" },
        { name: "Pelor", source: "PHB", pantheon: "Forgotten Realms" },
      ],
    });
    const results = await searchContentType("deities", "exandria", "2024");
    expect(results.map((r) => r.name)).toContain("Avandra");
    expect(results.map((r) => r.name)).not.toContain("Pelor");
  });

  it("strips internal fields from results", async () => {
    const spellsWithInternal = {
      spell: [{ name: "Fireball", source: "PHB", _internalField: "hidden" }],
    };
    mockFetchRaw.mockResolvedValueOnce(spellsWithInternal).mockResolvedValueOnce({ spell: [] });
    const results = await searchContentType("spells", "fire", "2024");
    expect(results[0]).not.toHaveProperty("_internalField");
  });

  it("resolves tags in results", async () => {
    const spellsWithTags = {
      spell: [{ name: "Fireball", source: "PHB", entries: ["{@b bold text}"] }],
    };
    mockFetchRaw.mockResolvedValueOnce(spellsWithTags).mockResolvedValueOnce({ spell: [] });
    const results = await searchContentType("spells", "fire", "2024");
    expect((results[0].entries as string[])[0]).toBe("**bold text**");
  });

  it("fetches each file in the content type exactly once", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    await searchContentType("spells", "", "2024");
    expect(mockFetchRaw).toHaveBeenCalledTimes(2);
    expect(mockFetchRaw).toHaveBeenCalledWith("https://raw.example.com/spells-phb.json");
    expect(mockFetchRaw).toHaveBeenCalledWith("https://raw.example.com/spells-xge.json");
  });

  // Array field search
  it("matches on top-level array-of-strings field (property)", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      item: [
        { name: "Vestige Blade", source: "EGW", property: ["Vst|EGW", "F"] },
        { name: "Longsword", source: "PHB", property: ["V"] },
      ],
    });
    const results = await searchContentType("items", "vst", "2024");
    expect(results.map((r) => r.name)).toContain("Vestige Blade");
    expect(results.map((r) => r.name)).not.toContain("Longsword");
  });

  it("matches on damageInflict array field when name does not contain the query", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      spell: [
        { name: "Scorching Ray", source: "PHB", damageInflict: ["fire"] },
        { name: "Chill Touch", source: "PHB", damageInflict: ["cold"] },
      ],
    });
    const results = await searchContentType("spells", "cold", "2024");
    expect(results.map((r) => r.name)).toContain("Chill Touch");
    expect(results.map((r) => r.name)).not.toContain("Scorching Ray");
  });

  it("matches on environment array field", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        { name: "Drow Elite Warrior", source: "MM", environment: ["underdark"] },
        { name: "Brown Bear", source: "MM", environment: ["forest", "hill"] },
      ],
    });
    const results = await searchContentType("bestiary", "underdark", "2024");
    expect(results.map((r) => r.name)).toContain("Drow Elite Warrior");
    expect(results.map((r) => r.name)).not.toContain("Brown Bear");
  });

  it("does not match text nested inside objects within arrays", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        {
          name: "Ice Toad",
          source: "MM",
          action: [{ name: "Bite", entries: ["The toad breathes fire."] }],
        },
      ],
    });
    const results = await searchContentType("bestiary", "fire", "2024");
    expect(results.map((r) => r.name)).not.toContain("Ice Toad");
  });

  it("does not match non-string array elements", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      item: [{ name: "Magic Helm", source: "PHB", bonuses: [1, 2, 3] }],
    });
    const results = await searchContentType("items", "1", "2024");
    expect(results.map((r) => r.name)).not.toContain("Magic Helm");
  });

  it("handles empty array fields without error", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      item: [{ name: "Plain Dagger", source: "PHB", property: [] }],
    });
    const results = await searchContentType("items", "finesse", "2024");
    expect(results).toHaveLength(0);
  });

  // Fields projection
  it("projects only requested fields when fields parameter is provided", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "fireball", "2024", 20, {}, ["name", "source"]);
    expect(results[0]).toHaveProperty("name");
    expect(results[0]).toHaveProperty("source");
    expect(results[0]).not.toHaveProperty("level");
    expect(results[0]).not.toHaveProperty("school");
  });

  it("returns all fields when fields parameter is omitted", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "fireball", "2024");
    expect(results[0]).toHaveProperty("level");
    expect(results[0]).toHaveProperty("school");
  });

  it("returns all fields when fields parameter is empty array", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS).mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "fireball", "2024", 20, {}, []);
    expect(results[0]).toHaveProperty("level");
  });

  // Structured filters
  it("filters by exact numeric field (level)", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      spell: [
        { name: "Fireball", source: "PHB", level: 3 },
        { name: "Magic Missile", source: "PHB", level: 1 },
      ],
    });
    mockFetchRaw.mockResolvedValueOnce({ spell: [] });
    const results = await searchContentType("spells", "", "2024", 20, { level: 3 });
    expect(results.map((r) => r.name)).toContain("Fireball");
    expect(results.map((r) => r.name)).not.toContain("Magic Missile");
  });

  it("filters by string substring field (rarity)", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      item: [
        { name: "Sword of Legend", source: "DMG", rarity: "legendary" },
        { name: "Potion of Healing", source: "PHB", rarity: "common" },
      ],
    });
    const results = await searchContentType("items", "", "2024", 20, { rarity: "legendary" });
    expect(results.map((r) => r.name)).toContain("Sword of Legend");
    expect(results.map((r) => r.name)).not.toContain("Potion of Healing");
  });

  it("filters by cr_max (fractional CR support)", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        { name: "Wolf", source: "MM", type: "beast", cr: "1/4" },
        { name: "Brown Bear", source: "MM", type: "beast", cr: "1" },
        { name: "Giant Ape", source: "MM", type: "beast", cr: "7" },
      ],
    });
    const results = await searchContentType("bestiary", "", "2024", 20, { cr_max: "1/2" });
    expect(results.map((r) => r.name)).toContain("Wolf");
    expect(results.map((r) => r.name)).not.toContain("Brown Bear");
    expect(results.map((r) => r.name)).not.toContain("Giant Ape");
  });

  it("filters monster type handling nested type objects", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        { name: "Goblin", source: "MM", type: "humanoid" },
        { name: "Doppelganger", source: "MM", type: { type: "monstrosity", tags: ["shapechanger"] } },
        { name: "Wolf", source: "MM", type: "beast" },
      ],
    });
    const results = await searchContentType("bestiary", "", "2024", 20, { type: "humanoid" });
    expect(results.map((r) => r.name)).toContain("Goblin");
    expect(results.map((r) => r.name)).not.toContain("Doppelganger");
    expect(results.map((r) => r.name)).not.toContain("Wolf");
  });

  it("filters by environment array field", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      monster: [
        { name: "Drow Elite Warrior", source: "MM", environment: ["underdark"] },
        { name: "Mind Flayer", source: "MM", environment: ["underdark", "urban"] },
        { name: "Brown Bear", source: "MM", environment: ["forest"] },
      ],
    });
    const results = await searchContentType("bestiary", "", "2024", 20, { environment: "underdark" });
    const names = results.map((r) => r.name);
    expect(names).toContain("Drow Elite Warrior");
    expect(names).toContain("Mind Flayer");
    expect(names).not.toContain("Brown Bear");
  });

  it("combines query and filters (AND logic)", async () => {
    mockFetchRaw.mockResolvedValueOnce({
      spell: [
        { name: "Fireball", source: "PHB", level: 3, damageInflict: ["fire"] },
        { name: "Scorching Ray", source: "PHB", level: 2, damageInflict: ["fire"] },
        { name: "Wall of Ice", source: "PHB", level: 6, damageInflict: ["cold"] },
      ],
    });
    mockFetchRaw.mockResolvedValueOnce({ spell: [] });
    const results = await searchContentType("spells", "fire", "2024", 20, { level: 3 });
    expect(results.map((r) => r.name)).toContain("Fireball");
    expect(results.map((r) => r.name)).not.toContain("Scorching Ray");
    expect(results.map((r) => r.name)).not.toContain("Wall of Ice");
  });

  // Homebrew search
  it("includes homebrew results when include_homebrew is true", async () => {
    // official PHB spells first, then homebrew
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS);
    mockFetchRaw.mockResolvedValueOnce(XGE_SPELLS);
    mockFetchRaw.mockResolvedValueOnce({
      spell: [{ name: "Homebrew Fire Blast", source: "HB", level: 2, school: "V" }],
    });
    const results = await searchContentType("spells", "fire", "2024", 20, {}, undefined, true);
    const names = results.map((r) => r.name);
    expect(names).toContain("Fireball");
    expect(names).toContain("Firestorm");
    expect(names).toContain("Homebrew Fire Blast");
  });

  it("does not include homebrew results when include_homebrew is false (default)", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS);
    mockFetchRaw.mockResolvedValueOnce(XGE_SPELLS);
    const results = await searchContentType("spells", "fire", "2024", 20, {}, undefined, false);
    const names = results.map((r) => r.name);
    expect(names).toContain("Fireball");
    expect(names).not.toContain("Homebrew Fire Blast");
    // homebrew file should not have been fetched
    expect(mockFetchRaw).toHaveBeenCalledTimes(2);
  });

  it("respects limit across combined official and homebrew results", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS);
    mockFetchRaw.mockResolvedValueOnce(XGE_SPELLS);
    mockFetchRaw.mockResolvedValueOnce({
      spell: [{ name: "Homebrew Fire Blast", source: "HB", level: 2, school: "V" }],
    });
    // limit=3 means 3 results total from both official (3 fire) and homebrew
    const results = await searchContentType("spells", "fire", "2024", 3, {}, undefined, true);
    expect(results).toHaveLength(3);
  });

  it("returns empty homebrew array gracefully when no homebrew for content type", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_SPELLS);
    mockFetchRaw.mockResolvedValueOnce(XGE_SPELLS);
    // bestiary has no homebrew in FAKE_MANIFEST
    const results = await searchContentType("bestiary", "fire", "2024", 20, {}, undefined, true);
    expect(Array.isArray(results)).toBe(true);
  });
});
