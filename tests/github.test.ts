import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rawUrl } from "../src/github.js";

describe("rawUrl", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.LOCAL_BASE_URL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("builds a raw.githubusercontent.com URL when LOCAL_BASE_URL is unset", () => {
    const url = rawUrl("5etools-mirror-3", "5etools-src", "main", "data/spells/spells-phb.json");
    expect(url).toBe(
      "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-phb.json",
    );
  });

  it("redirects to the local mirror for the 2024 ruleset repo when LOCAL_BASE_URL is set", () => {
    process.env.LOCAL_BASE_URL = "https://5e.home.monk.cloud";
    const url = rawUrl("5etools-mirror-3", "5etools-src", "main", "data/spells/spells-phb.json");
    expect(url).toBe("https://5e.home.monk.cloud/data/spells/spells-phb.json");
  });

  it("redirects to the local mirror for the 2014 ruleset repo when LOCAL_BASE_URL is set", () => {
    process.env.LOCAL_BASE_URL = "https://5e.home.monk.cloud";
    const url = rawUrl(
      "5etools-mirror-3",
      "5etools-2014-src",
      "main",
      "data/spells/spells-phb.json",
    );
    expect(url).toBe("https://5e.home.monk.cloud/data/spells/spells-phb.json");
  });

  it("strips a trailing slash from LOCAL_BASE_URL", () => {
    process.env.LOCAL_BASE_URL = "https://5e.home.monk.cloud/";
    const url = rawUrl("5etools-mirror-3", "5etools-src", "main", "data/spells/spells-phb.json");
    expect(url).toBe("https://5e.home.monk.cloud/data/spells/spells-phb.json");
  });

  it("does NOT redirect homebrew content even when LOCAL_BASE_URL is set", () => {
    process.env.LOCAL_BASE_URL = "https://5e.home.monk.cloud";
    const url = rawUrl("TheGiddyLimit", "homebrew", "master", "Spells/spells-homebrew.json");
    expect(url).toBe(
      "https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/Spells/spells-homebrew.json",
    );
  });

  it("ignores an empty-string LOCAL_BASE_URL", () => {
    process.env.LOCAL_BASE_URL = "";
    const url = rawUrl("5etools-mirror-3", "5etools-src", "main", "data/spells/spells-phb.json");
    expect(url).toBe(
      "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-phb.json",
    );
  });
});

describe("fetchRaw with file:// URLs", () => {
  it("reads and parses a local JSON file instead of making a network request", async () => {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const { pathToFileURL } = await import("node:url");
    const { fetchRaw } = await import("../src/github.js");

    const dir = await mkdtemp(path.join(tmpdir(), "5emcp-fetchraw-"));
    const filePath = path.join(dir, "spell.json");
    await writeFile(filePath, JSON.stringify({ name: "Fireball", level: 3 }));

    try {
      const data = await fetchRaw(pathToFileURL(filePath).href);
      expect(data).toEqual({ name: "Fireball", level: 3 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a file:// URL that doesn't exist", async () => {
    const { pathToFileURL } = await import("node:url");
    const { fetchRaw } = await import("../src/github.js");

    await expect(fetchRaw(pathToFileURL("/nonexistent/spell.json").href)).rejects.toThrow();
  });
});
