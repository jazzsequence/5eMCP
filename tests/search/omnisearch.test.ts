import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/search/index.js", () => ({
  searchContentType: vi.fn(),
}));

import { omnisearch } from "../../src/search/omnisearch.js";
import { searchContentType } from "../../src/search/index.js";

const mockSearch = vi.mocked(searchContentType);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("omnisearch", () => {
  it("searches across all content types and merges results", async () => {
    mockSearch
      .mockImplementation(async (folder) => {
        if (folder === "spells") return [{ name: "Fireball", source: "PHB", _type: "spell" }];
        if (folder === "bestiary") return [{ name: "Fire Giant", source: "MM", _type: "monster" }];
        return [];
      });

    const results = await omnisearch("fire", "2024");
    const names = results.map((r) => r.name);
    expect(names).toContain("Fireball");
    expect(names).toContain("Fire Giant");
  });

  it("adds entityType to each result", async () => {
    mockSearch.mockImplementation(async (folder) => {
      if (folder === "spells") return [{ name: "Fireball", source: "PHB" }];
      return [];
    });

    const results = await omnisearch("fire", "2024");
    const fireball = results.find((r) => r.name === "Fireball");
    expect(fireball).toBeDefined();
    expect(fireball!.entityType).toBe("spell");
  });

  it("respects perType limit to avoid huge results", async () => {
    const manySpells = Array.from({ length: 50 }, (_, i) => ({ name: `Spell${i}`, source: "PHB" }));
    mockSearch.mockResolvedValue(manySpells);

    const results = await omnisearch("spell", "2024");
    // With 22 content types each returning up to 5 results by default, max = 110
    expect(results.length).toBeLessThanOrEqual(110);
  });

  it("returns empty array when nothing matches", async () => {
    mockSearch.mockResolvedValue([]);
    const results = await omnisearch("xyzzy", "2024");
    expect(results).toHaveLength(0);
  });

  it("handles content types that error gracefully", async () => {
    mockSearch.mockImplementation(async (folder) => {
      if (folder === "spells") throw new Error("Network error");
      if (folder === "bestiary") return [{ name: "Goblin", source: "MM" }];
      return [];
    });

    const results = await omnisearch("goblin", "2024");
    const goblin = results.find((r) => r.name === "Goblin");
    expect(goblin).toBeDefined();
  });
});
