import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildLocalContent } from "../../src/manifest/local-builder.js";

describe("buildLocalContent", () => {
  let dataDir: string;

  beforeAll(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "5emcp-local-"));

    // Subdirectory content type: data/spells/{spells-phb.json, fluff-spells-phb.json}
    await mkdir(path.join(dataDir, "spells"), { recursive: true });
    await writeFile(
      path.join(dataDir, "spells", "spells-phb.json"),
      JSON.stringify({ spell: [{ name: "Fireball" }] }),
    );
    await writeFile(
      path.join(dataDir, "spells", "fluff-spells-phb.json"),
      JSON.stringify({ spellFluff: [{ name: "Fireball", entries: ["lore"] }] }),
    );

    // Another subdirectory, no fluff pairing
    await mkdir(path.join(dataDir, "bestiary"), { recursive: true });
    await writeFile(
      path.join(dataDir, "bestiary", "bestiary-mm.json"),
      JSON.stringify({ monster: [{ name: "Goblin" }] }),
    );

    // A flat top-level file (content type == file name minus .json)
    await writeFile(
      path.join(dataDir, "books.json"),
      JSON.stringify({ book: [{ name: "Player's Handbook" }] }),
    );

    // Non-JSON entries should be ignored
    await writeFile(path.join(dataDir, "README.txt"), "ignore me");
  });

  afterAll(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("indexes subdirectory content types with source inferred from filename", async () => {
    const content = await buildLocalContent(dataDir);
    expect(content.spells).toHaveLength(1);
    expect(content.spells[0]).toMatchObject({
      name: "spells-phb.json",
      path: "data/spells/spells-phb.json",
      source: "PHB",
    });
    expect(content.spells[0].url).toMatch(/^file:\/\/.*spells-phb\.json$/);
    expect(content.spells[0].sha).toMatch(/^\d+(\.\d+)?:\d+$/);
  });

  it("pairs fluff-*.json files with their mechanical counterpart", async () => {
    const content = await buildLocalContent(dataDir);
    expect(content.spells[0].fluff_url).toMatch(/^file:\/\/.*fluff-spells-phb\.json$/);
    expect(content.spells[0].fluff_sha).toBeDefined();
  });

  it("indexes a subdirectory with no fluff file", async () => {
    const content = await buildLocalContent(dataDir);
    expect(content.bestiary).toHaveLength(1);
    expect(content.bestiary[0].fluff_url).toBeUndefined();
  });

  it("indexes flat top-level json files without inferring a source", async () => {
    const content = await buildLocalContent(dataDir);
    expect(content.books).toHaveLength(1);
    expect(content.books[0]).toMatchObject({ name: "books.json", path: "data/books.json" });
    expect(content.books[0].source).toBeUndefined();
  });

  it("ignores non-JSON files", async () => {
    const content = await buildLocalContent(dataDir);
    const allFiles = Object.values(content).flat();
    expect(allFiles.some((f) => f.name === "README.txt")).toBe(false);
  });
});
