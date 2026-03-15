import { describe, it, expect } from "vitest";
import { createTypedHandler } from "../../../src/translation/handlers/generic.js";

describe("createTypedHandler", () => {
  it("extracts entries by content key", () => {
    const handler = createTypedHandler("spell");
    const raw = {
      spell: [
        { name: "Fireball", source: "PHB", _internalField: "strip me" },
      ],
    };
    const result = handler(raw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Fireball");
  });

  it("strips internal fields from entries", () => {
    const handler = createTypedHandler("spell");
    const raw = {
      spell: [{ name: "Fireball", source: "PHB", _internalField: "hidden" }],
    };
    const result = handler(raw);
    expect(result[0]).not.toHaveProperty("_internalField");
  });

  it("resolves tags in entry fields", () => {
    const handler = createTypedHandler("spell");
    const raw = {
      spell: [
        {
          name: "Fireball",
          source: "PHB",
          entries: ["{@b bold text}"],
        },
      ],
    };
    const result = handler(raw);
    expect((result[0].entries as string[])[0]).toBe("**bold text**");
  });

  it("merges fluff when fluffKey provided and fluff exists", () => {
    const handler = createTypedHandler("spell", "spellFluff");
    const raw = {
      spell: [{ name: "Fireball", source: "PHB", level: 3 }],
    };
    const fluff = {
      spellFluff: [
        { name: "Fireball", source: "PHB", entries: [{ type: "entries", name: "Desc", entries: ["A bright streak..."] }] },
      ],
    };
    const result = handler(raw, fluff);
    expect(result[0].fluff).toBeDefined();
  });

  it("does not merge fluff when no fluffKey", () => {
    const handler = createTypedHandler("trap");
    const raw = {
      trap: [{ name: "Pit Trap", source: "DMG" }],
    };
    const fakeFluff = { trapFluff: [{ name: "Pit Trap", source: "DMG", entries: [] }] };
    const result = handler(raw, fakeFluff);
    expect(result[0].fluff).toBeUndefined();
  });

  it("does not merge fluff when fluff arg is absent", () => {
    const handler = createTypedHandler("spell", "spellFluff");
    const raw = { spell: [{ name: "Fireball", source: "PHB" }] };
    const result = handler(raw);
    expect(result[0].fluff).toBeUndefined();
  });

  it("strips internal fields from fluff entries before merge", () => {
    const handler = createTypedHandler("spell", "spellFluff");
    const raw = { spell: [{ name: "Fireball", source: "PHB" }] };
    const fluff = {
      spellFluff: [
        { name: "Fireball", source: "PHB", _internalFluffField: "hidden", entries: [] },
      ],
    };
    const result = handler(raw, fluff);
    const merged = result[0].fluff as Record<string, unknown>;
    expect(merged).not.toHaveProperty("_internalFluffField");
  });

  it("returns empty array for empty content key", () => {
    const handler = createTypedHandler("spell");
    const result = handler({ spell: [] });
    expect(result).toHaveLength(0);
  });

  it("returns empty array when content key missing", () => {
    const handler = createTypedHandler("spell");
    const result = handler({ monster: [{ name: "Goblin" }] });
    expect(result).toHaveLength(0);
  });

  it("handles multiple entries", () => {
    const handler = createTypedHandler("monster");
    const raw = {
      monster: [
        { name: "Goblin", source: "MM", type: "humanoid" },
        { name: "Orc", source: "MM", type: "humanoid" },
      ],
    };
    const result = handler(raw);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(["Goblin", "Orc"]);
  });
});
