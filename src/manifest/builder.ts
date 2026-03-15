import { fetchContents, rawUrl } from "../github.js";
import type { Manifest, ManifestFile } from "./schema.js";
import type { Ruleset, GitHubContentsItem } from "../types.js";
import { REPOS, HOMEBREW_REPO } from "../types.js";

function inferSource(filename: string): string | undefined {
  // e.g. "spells-phb.json" → "PHB", "bestiary-mm.json" → "MM"
  // e.g. "spells-xge.json" → "XGE"
  const base = filename.replace(/\.json$/i, "");
  const dashIdx = base.indexOf("-");
  if (dashIdx === -1) return undefined;
  return base.slice(dashIdx + 1).toUpperCase();
}

function isFluffFile(name: string): boolean {
  return name.startsWith("fluff-");
}

async function buildDirectoryContent(
  owner: string,
  repo: string,
  branch: string,
  dirPath: string,
): Promise<ManifestFile[]> {
  const items = await fetchContents(owner, repo, dirPath);

  // Index fluff files by their paired mechanical filename
  const fluffIndex = new Map<string, GitHubContentsItem>();
  for (const item of items) {
    if (item.type === "file" && item.name.endsWith(".json") && isFluffFile(item.name)) {
      const mechanicalName = item.name.replace(/^fluff-/, "");
      fluffIndex.set(mechanicalName, item);
    }
  }

  const mechanical = items.filter(
    (item) => item.type === "file" && item.name.endsWith(".json") && !isFluffFile(item.name),
  );

  return mechanical.map((item) => {
    const fluff = fluffIndex.get(item.name);
    const file: ManifestFile = {
      name: item.name,
      path: item.path,
      url: rawUrl(owner, repo, branch, item.path),
      sha: item.sha,
      source: inferSource(item.name),
    };
    if (fluff) {
      file.fluff_url = rawUrl(owner, repo, branch, fluff.path);
      file.fluff_sha = fluff.sha;
    }
    return file;
  });
}

export async function buildManifest(ruleset: Ruleset): Promise<Manifest> {
  const { owner, repo, branch } = REPOS[ruleset];
  const content: Record<string, ManifestFile[]> = {};

  const dataItems = await fetchContents(owner, repo, "data");

  // Separate flat files and directories
  const flatMechanical: GitHubContentsItem[] = [];
  const flatFluffIndex = new Map<string, GitHubContentsItem>();
  const subdirPromises: Promise<void>[] = [];

  for (const item of dataItems) {
    if (item.type === "dir") {
      const dirName = item.name;
      const promise = buildDirectoryContent(owner, repo, branch, item.path)
        .then((files) => {
          if (files.length > 0) {
            content[dirName] = files;
          }
        })
        .catch((err: unknown) => {
          console.error(`Failed to index directory ${item.path}:`, err);
        });
      subdirPromises.push(promise);
    } else if (item.type === "file" && item.name.endsWith(".json")) {
      if (isFluffFile(item.name)) {
        const mechanicalName = item.name.replace(/^fluff-/, "");
        flatFluffIndex.set(mechanicalName, item);
      } else {
        flatMechanical.push(item);
      }
    }
  }

  await Promise.all(subdirPromises);

  // Add flat files, pairing with fluff where available
  for (const item of flatMechanical) {
    const contentType = item.name.replace(/\.json$/i, "");
    const fluff = flatFluffIndex.get(item.name);
    const file: ManifestFile = {
      name: item.name,
      path: item.path,
      url: rawUrl(owner, repo, branch, item.path),
      sha: item.sha,
    };
    if (fluff) {
      file.fluff_url = rawUrl(owner, repo, branch, fluff.path);
      file.fluff_sha = fluff.sha;
    }
    if (!content[contentType]) {
      content[contentType] = [];
    }
    content[contentType].push(file);
  }

  // Build homebrew manifest
  const homebrew: Record<string, ManifestFile[]> = {};
  try {
    await buildHomebrewManifest(homebrew);
  } catch (err) {
    console.error("Failed to build homebrew manifest:", err);
  }

  return {
    ruleset,
    built_at: Date.now(),
    content,
    homebrew,
  };
}

async function buildHomebrewManifest(homebrew: Record<string, ManifestFile[]>): Promise<void> {
  const { owner, repo, branch } = HOMEBREW_REPO;
  const rootItems = await fetchContents(owner, repo, "");

  const categoryPromises: Promise<void>[] = [];

  for (const item of rootItems) {
    if (item.type === "dir" && !item.name.startsWith(".")) {
      const category = item.name;
      const promise = fetchContents(owner, repo, item.path)
        .then((files) => {
          const jsonFiles = files.filter(
            (f) => f.type === "file" && f.name.endsWith(".json"),
          );
          if (jsonFiles.length > 0) {
            homebrew[category] = jsonFiles.map((f) => ({
              name: f.name,
              path: f.path,
              url: rawUrl(owner, repo, branch, f.path),
              sha: f.sha,
            }));
          }
        })
        .catch((err: unknown) => {
          console.error(`Failed to index homebrew category ${category}:`, err);
        });
      categoryPromises.push(promise);
    }
  }

  await Promise.all(categoryPromises);
}
