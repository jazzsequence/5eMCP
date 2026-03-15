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
  },
  homebrew: {},
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
  vi.clearAllMocks();
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
});
