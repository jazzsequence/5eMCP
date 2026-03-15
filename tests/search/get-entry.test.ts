import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEntry } from "../../src/search/get-entry.js";

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
      {
        name: "spells-phb.json",
        path: "spells/spells-phb.json",
        url: "https://raw.example.com/spells-phb.json",
        sha: "abc123",
        fluff_url: "https://raw.example.com/fluff-spells-phb.json",
        fluff_sha: "fluffabc",
      },
    ],
  },
  homebrew: {},
};

const PHB_FILE = {
  spell: [
    { name: "Fireball", source: "PHB", level: 3, school: "V" },
    { name: "Magic Missile", source: "PHB", level: 1, school: "V" },
  ],
};

const PHB_FLUFF = {
  spellFluff: [
    { name: "Fireball", source: "PHB", entries: ["A bright streak..."] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetManifest.mockResolvedValue(FAKE_MANIFEST as never);
});

describe("getEntry", () => {
  it("returns the matching entry by name (case-insensitive)", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_FILE).mockResolvedValueOnce(PHB_FLUFF);
    const result = await getEntry("spells", "fireball", undefined, "2024");
    expect(result).not.toBeNull();
    expect((result as Record<string, unknown>).name).toBe("Fireball");
  });

  it("returns null when entry not found", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_FILE);
    const result = await getEntry("spells", "nonexistent spell", undefined, "2024");
    expect(result).toBeNull();
  });

  it("filters by source when provided", async () => {
    const manifest = {
      ...FAKE_MANIFEST,
      content: {
        spells: [
          { name: "spells-phb.json", path: "", url: "https://raw.example.com/spells-phb.json", sha: "a1" },
          { name: "spells-xge.json", path: "", url: "https://raw.example.com/spells-xge.json", sha: "a2" },
        ],
      },
    };
    mockGetManifest.mockResolvedValue(manifest as never);
    mockFetchRaw
      .mockResolvedValueOnce({ spell: [{ name: "Fireball", source: "PHB", level: 3 }] })
      .mockResolvedValueOnce({ spell: [{ name: "Fireball", source: "XGE", level: 3, schoolVariant: true }] });

    const result = await getEntry("spells", "Fireball", "XGE", "2024");
    expect(result).not.toBeNull();
    expect((result as Record<string, unknown>).source).toBe("XGE");
  });

  it("returns null when content type not in manifest", async () => {
    const result = await getEntry("unknown", "Fireball", undefined, "2024");
    expect(result).toBeNull();
  });

  it("strips internal fields from the result", async () => {
    mockFetchRaw
      .mockResolvedValueOnce({ spell: [{ name: "Fireball", source: "PHB", _internal: "hidden" }] })
      .mockResolvedValueOnce({ spellFluff: [] });
    const result = await getEntry("spells", "Fireball", undefined, "2024") as Record<string, unknown>;
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("_internal");
  });

  it("resolves tags in the result", async () => {
    mockFetchRaw
      .mockResolvedValueOnce({ spell: [{ name: "Fireball", source: "PHB", desc: "{@b bold}" }] })
      .mockResolvedValueOnce({ spellFluff: [] });
    const result = await getEntry("spells", "Fireball", undefined, "2024") as Record<string, unknown>;
    expect(result.desc).toBe("**bold**");
  });

  it("merges fluff into the result", async () => {
    mockFetchRaw.mockResolvedValueOnce(PHB_FILE).mockResolvedValueOnce(PHB_FLUFF);
    const result = await getEntry("spells", "Fireball", undefined, "2024") as Record<string, unknown>;
    expect(result.fluff).toBeDefined();
  });
});
