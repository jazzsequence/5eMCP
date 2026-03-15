import { describe, it, expect } from "vitest";
import { passthroughTranslate } from "../../src/translation/passthrough.js";

describe("passthroughTranslate", () => {
  it("resolves tags in raw content", () => {
    const raw = { name: "Goblin", desc: "A {@creature goblin}." };
    const result = passthroughTranslate(raw) as Record<string, unknown>;
    expect(result.desc).toBe("A goblin.");
  });

  it("strips internal fields", () => {
    const raw = { name: "Spell", _isMixed: true, level: 1 };
    const result = passthroughTranslate(raw) as Record<string, unknown>;
    expect("_isMixed" in result).toBe(false);
    expect(result.name).toBe("Spell");
    expect(result.level).toBe(1);
  });

  it("merges fluff when provided", () => {
    const raw = { name: "Goblin" };
    const fluff = { entries: ["Goblins are small creatures."] };
    const result = passthroughTranslate(raw, fluff) as Record<string, unknown>;
    expect(result.name).toBe("Goblin");
    // fluff is merged under "fluff" key (no underscore — would be stripped otherwise)
    expect(result.fluff).toEqual(fluff);
  });

  it("skips fluff when not provided", () => {
    const raw = { name: "Goblin" };
    const result = passthroughTranslate(raw) as Record<string, unknown>;
    expect("_fluff" in result).toBe(false);
  });

  it("handles arrays as raw content", () => {
    const raw = [{ name: "{@b Bold}" }];
    const result = passthroughTranslate(raw) as Array<Record<string, unknown>>;
    expect(result[0].name).toBe("**Bold**");
  });
});
