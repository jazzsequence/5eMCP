import { getManifest } from "../manifest/refresh.js";
import { fetchRaw } from "../github.js";
import { CONTENT_KEY_MAP, FLUFF_KEY_MAP } from "../translation/handlers/types.js";
import { stripInternalFields } from "../translation/strip.js";
import { resolveTagsDeep } from "../translation/tags.js";
import { mergeFluffEntries } from "../translation/fluff.js";
import type { Ruleset } from "../types.js";

type ContentEntry = Record<string, unknown>;

/**
 * Fetches a single entry by exact name (case-insensitive), optionally filtered by source.
 * Applies full translation: strip internal fields, merge fluff, resolve tags.
 * Returns null if not found.
 */
export async function getEntry(
  contentTypeFolder: string,
  name: string,
  source: string | undefined,
  ruleset: Ruleset,
): Promise<ContentEntry | null> {
  const manifest = await getManifest(ruleset);
  const files = manifest.content[contentTypeFolder];
  if (!files || files.length === 0) return null;

  const contentKey = CONTENT_KEY_MAP[contentTypeFolder];
  if (!contentKey) return null;

  const fluffKey = FLUFF_KEY_MAP[contentKey];
  const lowerName = name.toLowerCase();
  const lowerSource = source?.toLowerCase();

  for (const file of files) {
    const data = await fetchRaw(file.url) as Record<string, unknown>;
    const entries = (data[contentKey] ?? []) as ContentEntry[];

    const match = entries.find((e) => {
      const eName = typeof e.name === "string" ? e.name.toLowerCase() : "";
      if (eName !== lowerName) return false;
      if (lowerSource) {
        const eSource = typeof e.source === "string" ? e.source.toLowerCase() : "";
        return eSource === lowerSource;
      }
      return true;
    });

    if (!match) continue;

    const stripped = stripInternalFields(match) as ContentEntry;

    // Fetch and merge fluff if available
    if (file.fluff_url && fluffKey) {
      const fluffData = await fetchRaw(file.fluff_url) as Record<string, unknown>;
      const fluffEntries = (fluffData[fluffKey] ?? []) as ContentEntry[];
      const strippedFluff = fluffEntries.map((f) => stripInternalFields(f) as ContentEntry);
      const merged = mergeFluffEntries([stripped], strippedFluff);
      return resolveTagsDeep(merged[0]) as ContentEntry;
    }

    return resolveTagsDeep(stripped) as ContentEntry;
  }

  return null;
}
