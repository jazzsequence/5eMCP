import { describe, it, expect } from "vitest";
import { resolveTagsInString, resolveTagsDeep } from "../../src/translation/tags.js";

describe("resolveTagsInString", () => {
  it("resolves bold formatting", () => {
    expect(resolveTagsInString("{@b bold text}")).toBe("**bold text**");
  });

  it("resolves italic formatting", () => {
    expect(resolveTagsInString("{@i italic text}")).toBe("_italic text_");
  });

  it("resolves creature reference to display name only", () => {
    expect(resolveTagsInString("{@creature goblin}")).toBe("goblin");
    expect(resolveTagsInString("{@creature goblin|MM}")).toBe("goblin");
  });

  it("resolves spell reference to display name only", () => {
    expect(resolveTagsInString("{@spell fireball|PHB}")).toBe("fireball");
  });

  it("resolves dice notation", () => {
    expect(resolveTagsInString("{@dice 2d6+3}")).toBe("2d6+3");
    expect(resolveTagsInString("{@damage 8d6}")).toBe("8d6");
  });

  it("resolves hit bonus", () => {
    expect(resolveTagsInString("{@hit 5}")).toBe("+5");
    expect(resolveTagsInString("{@hit -1}")).toBe("+-1");
  });

  it("resolves DC", () => {
    expect(resolveTagsInString("{@dc 15}")).toBe("DC 15");
  });

  it("resolves attack types", () => {
    expect(resolveTagsInString("{@atk mw}")).toBe("Melee Weapon Attack");
    expect(resolveTagsInString("{@atk rw}")).toBe("Ranged Weapon Attack");
    expect(resolveTagsInString("{@atk mw,rw}")).toBe("Melee or Ranged Weapon Attack");
  });

  it("strips filter tags", () => {
    expect(resolveTagsInString("{@filter some filter stuff}")).toBe("");
  });

  it("handles unknown tags by returning display name", () => {
    expect(resolveTagsInString("{@unknowntag foo|bar}")).toBe("foo");
  });

  it("handles multiple tags in a string", () => {
    const result = resolveTagsInString("Deals {@damage 2d6} {@condition poisoned|PHB} damage.");
    expect(result).toBe("Deals 2d6 poisoned damage.");
  });

  it("returns plain strings unchanged", () => {
    expect(resolveTagsInString("no tags here")).toBe("no tags here");
  });

  it("handles empty string", () => {
    expect(resolveTagsInString("")).toBe("");
  });
});

describe("resolveTagsDeep", () => {
  it("resolves tags in nested objects", () => {
    const input = { name: "{@b Fireball}", desc: "Deals {@damage 8d6} fire damage." };
    const result = resolveTagsDeep(input) as Record<string, unknown>;
    expect(result.name).toBe("**Fireball**");
    expect(result.desc).toBe("Deals 8d6 fire damage.");
  });

  it("resolves tags in arrays", () => {
    const input = ["{@b bold}", "{@i italic}"];
    expect(resolveTagsDeep(input)).toEqual(["**bold**", "_italic_"]);
  });

  it("passes through non-string primitives", () => {
    expect(resolveTagsDeep(42)).toBe(42);
    expect(resolveTagsDeep(true)).toBe(true);
    expect(resolveTagsDeep(null)).toBe(null);
  });

  it("handles deeply nested structures", () => {
    const input = { a: { b: { c: "{@creature goblin}" } } };
    const result = resolveTagsDeep(input) as { a: { b: { c: string } } };
    expect(result.a.b.c).toBe("goblin");
  });
});
