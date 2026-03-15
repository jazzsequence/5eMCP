import { describe, it, expect } from "vitest";
import { contentKey, manifestKey } from "../../src/cache/keys.js";

describe("contentKey", () => {
  it("prefixes with content:", () => {
    expect(contentKey("abc123")).toBe("content:abc123");
  });

  it("includes the full sha", () => {
    const sha = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
    expect(contentKey(sha)).toBe(`content:${sha}`);
  });
});

describe("manifestKey", () => {
  it("prefixes with manifest:", () => {
    expect(manifestKey("2024")).toBe("manifest:2024");
    expect(manifestKey("2014")).toBe("manifest:2014");
  });
});
