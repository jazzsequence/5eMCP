import { buildManifest } from "./builder.js";
import { cacheSet, cacheGetWithTTL } from "../cache/index.js";
import { manifestKey } from "../cache/keys.js";
import type { Manifest } from "./schema.js";
import type { Ruleset } from "../types.js";

const TTL_SECONDS = Number(process.env.MANIFEST_TTL_SECONDS ?? 3600);

// In-memory cache — avoids disk read on every tool call
const manifests = new Map<Ruleset, Manifest>();

export async function getManifest(ruleset: Ruleset): Promise<Manifest> {
  // Check in-memory first
  const inMemory = manifests.get(ruleset);
  if (inMemory) {
    const ageSeconds = (Date.now() - inMemory.built_at) / 1000;
    if (ageSeconds < TTL_SECONDS) {
      return inMemory;
    }
  }

  // Check disk cache with TTL
  const key = manifestKey(ruleset);
  const cached = await cacheGetWithTTL<Manifest>(key, TTL_SECONDS);
  if (cached) {
    manifests.set(ruleset, cached);
    return cached;
  }

  // Build fresh
  console.error(`Building manifest for ruleset ${ruleset}...`);
  const manifest = await buildManifest(ruleset);
  manifests.set(ruleset, manifest);
  await cacheSet(key, manifest);

  const typeCount = Object.keys(manifest.content).length;
  const fileCount = Object.values(manifest.content).reduce((n, files) => n + files.length, 0);
  console.error(`Manifest built: ${typeCount} content types, ${fileCount} files`);

  return manifest;
}

export function startRefreshLoop(rulesets: Ruleset[] = ["2024"]): void {
  const intervalMs = TTL_SECONDS * 1000;

  setInterval(() => {
    for (const ruleset of rulesets) {
      buildManifest(ruleset)
        .then((manifest) => {
          manifests.set(ruleset, manifest);
          return cacheSet(manifestKey(ruleset), manifest);
        })
        .catch((err: unknown) => {
          console.error(`Failed to refresh manifest for ${ruleset}:`, err);
        });
    }
  }, intervalMs).unref(); // Don't keep the process alive just for the interval
}
