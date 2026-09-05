import { describe, it, expect, afterEach, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("DEFAULT_RULESET", () => {
  it("falls back to 2024 when DEFAULT_RULESET is unset", async () => {
    delete process.env.DEFAULT_RULESET;
    vi.resetModules();
    const { DEFAULT_RULESET } = await import("../src/types.js");
    expect(DEFAULT_RULESET).toBe("2024");
  });

  it("reads 2014 from the environment", async () => {
    vi.stubEnv("DEFAULT_RULESET", "2014");
    vi.resetModules();
    const { DEFAULT_RULESET } = await import("../src/types.js");
    expect(DEFAULT_RULESET).toBe("2014");
  });

  it("reads 2024 from the environment explicitly", async () => {
    vi.stubEnv("DEFAULT_RULESET", "2024");
    vi.resetModules();
    const { DEFAULT_RULESET } = await import("../src/types.js");
    expect(DEFAULT_RULESET).toBe("2024");
  });

  it("falls back to 2024 for an invalid value", async () => {
    vi.stubEnv("DEFAULT_RULESET", "3024");
    vi.resetModules();
    const { DEFAULT_RULESET } = await import("../src/types.js");
    expect(DEFAULT_RULESET).toBe("2024");
  });

  it("trims whitespace before validating", async () => {
    vi.stubEnv("DEFAULT_RULESET", "  2014  ");
    vi.resetModules();
    const { DEFAULT_RULESET } = await import("../src/types.js");
    expect(DEFAULT_RULESET).toBe("2014");
  });
});

describe("RulesetSchema", () => {
  it("defaults to the configured DEFAULT_RULESET when omitted", async () => {
    vi.stubEnv("DEFAULT_RULESET", "2014");
    vi.resetModules();
    const { RulesetSchema } = await import("../src/types.js");
    expect(RulesetSchema.parse(undefined)).toBe("2014");
  });

  it("still accepts an explicit override", async () => {
    vi.stubEnv("DEFAULT_RULESET", "2014");
    vi.resetModules();
    const { RulesetSchema } = await import("../src/types.js");
    expect(RulesetSchema.parse("2024")).toBe("2024");
  });
});

describe("rulesetDescription", () => {
  it("names the configured default and the override value", async () => {
    vi.stubEnv("DEFAULT_RULESET", "2014");
    vi.resetModules();
    const { rulesetDescription } = await import("../src/types.js");
    const text = rulesetDescription("search");
    expect(text).toContain("search");
    expect(text).toContain('"2014"');
    expect(text).toContain('"2024"');
  });

  it("swaps which value is the override when the default is 2024", async () => {
    vi.stubEnv("DEFAULT_RULESET", "2024");
    vi.resetModules();
    const { rulesetDescription } = await import("../src/types.js");
    const text = rulesetDescription("query");
    expect(text).toContain("query");
    expect(text).toContain('"2024"');
    expect(text).toContain('"2014"');
  });
});
