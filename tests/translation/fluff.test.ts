import { describe, it, expect } from "vitest";
import { mergeFluffEntries } from "../../src/translation/fluff.js";

describe("mergeFluffEntries", () => {
  it("merges fluff entry by name+source", () => {
    const entries = [
      { name: "Fireball", source: "PHB", level: 3 },
    ];
    const fluffEntries = [
      { name: "Fireball", source: "PHB", entries: [{ type: "entries", name: "Description", entries: ["A bright streak flashes..."] }] },
    ];
    const result = mergeFluffEntries(entries, fluffEntries);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "Fireball", source: "PHB", level: 3 });
    expect(result[0].fluff).toBeDefined();
    expect((result[0].fluff as Record<string, unknown>).entries).toBeDefined();
  });

  it("returns entries unchanged when no fluff matches", () => {
    const entries = [
      { name: "Fireball", source: "PHB", level: 3 },
    ];
    const fluffEntries = [
      { name: "Magic Missile", source: "PHB", entries: [] },
    ];
    const result = mergeFluffEntries(entries, fluffEntries);
    expect(result).toHaveLength(1);
    expect(result[0].fluff).toBeUndefined();
  });

  it("matches on both name and source", () => {
    const entries = [
      { name: "Fireball", source: "PHB" },
      { name: "Fireball", source: "XGE" },
    ];
    const fluffEntries = [
      { name: "Fireball", source: "XGE", entries: ["XGE description"] },
    ];
    const result = mergeFluffEntries(entries, fluffEntries);
    expect(result[0].fluff).toBeUndefined();
    expect(result[1].fluff).toBeDefined();
  });

  it("handles empty fluff array", () => {
    const entries = [{ name: "Web", source: "PHB" }];
    const result = mergeFluffEntries(entries, []);
    expect(result[0].fluff).toBeUndefined();
  });

  it("handles empty entries array", () => {
    const result = mergeFluffEntries([], [{ name: "Fireball", source: "PHB" }]);
    expect(result).toHaveLength(0);
  });

  it("does not mutate original entries", () => {
    const entries = [{ name: "Fireball", source: "PHB", level: 3 }];
    const fluffEntries = [{ name: "Fireball", source: "PHB", entries: ["desc"] }];
    const original = JSON.parse(JSON.stringify(entries));
    mergeFluffEntries(entries, fluffEntries);
    expect(entries).toEqual(original);
  });
});
