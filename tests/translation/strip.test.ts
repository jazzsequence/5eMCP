import { describe, it, expect } from "vitest";
import { stripInternalFields } from "../../src/translation/strip.js";

describe("stripInternalFields", () => {
  it("removes underscore-prefixed fields", () => {
    const input = { name: "Goblin", _isMixed: true, hp: 7 };
    const result = stripInternalFields(input) as Record<string, unknown>;
    expect(result.name).toBe("Goblin");
    expect(result.hp).toBe(7);
    expect("_isMixed" in result).toBe(false);
  });

  it("removes all known internal fields", () => {
    const input = {
      name: "test",
      _copy: {},
      _versions: [],
      _mod: {},
      _preserve: {},
      _rawName: "test",
      _isEnhanced: false,
      _dpt: "something",
    };
    const result = stripInternalFields(input) as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(["name"]);
  });

  it("strips from nested objects", () => {
    const input = { outer: { _internal: true, value: "keep" } };
    const result = stripInternalFields(input) as { outer: Record<string, unknown> };
    expect(result.outer.value).toBe("keep");
    expect("_internal" in result.outer).toBe(false);
  });

  it("strips from objects inside arrays", () => {
    const input = [{ name: "a", _hidden: true }, { name: "b", _hidden: false }];
    const result = stripInternalFields(input) as Array<Record<string, unknown>>;
    expect(result[0]).toEqual({ name: "a" });
    expect(result[1]).toEqual({ name: "b" });
  });

  it("passes through primitives unchanged", () => {
    expect(stripInternalFields("string")).toBe("string");
    expect(stripInternalFields(42)).toBe(42);
    expect(stripInternalFields(null)).toBe(null);
    expect(stripInternalFields(true)).toBe(true);
  });

  it("keeps non-underscore fields intact", () => {
    const input = { name: "Fireball", level: 3, school: "evocation" };
    expect(stripInternalFields(input)).toEqual(input);
  });
});
