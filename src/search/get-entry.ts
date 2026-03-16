import { getManifest } from "../manifest/refresh.js";
import { fetchRaw } from "../github.js";
import { CONTENT_KEY_MAP, FLUFF_KEY_MAP } from "../translation/handlers/types.js";
import { stripInternalFields } from "../translation/strip.js";
import { resolveTagsDeep } from "../translation/tags.js";
import { mergeFluffEntries } from "../translation/fluff.js";
import type { Ruleset } from "../types.js";
import type { ManifestFile } from "../manifest/schema.js";

/** Extracts the author portion from a homebrew filename like "Matthew Mercer; Blood Hunter.json". */
function parseSourceAuthor(filename: string): string | undefined {
  const idx = filename.indexOf(";");
  if (idx === -1) return undefined;
  return filename.slice(0, idx).trim();
}

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

  const contentKey = CONTENT_KEY_MAP[contentTypeFolder];
  if (!contentKey) return null;

  const fluffKey = FLUFF_KEY_MAP[contentKey];
  const lowerName = name.toLowerCase();
  const lowerSource = source?.toLowerCase();

  const searchFiles = async (files: ManifestFile[], sourceAuthorOverride?: string): Promise<ContentEntry | null> => {
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

      const augmented: ContentEntry = sourceAuthorOverride ? { ...match, sourceAuthor: sourceAuthorOverride } : match;
      const stripped = stripInternalFields(augmented) as ContentEntry;

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
  };

  // Try official content first
  const officialFiles = manifest.content[contentTypeFolder] ?? [];
  const officialResult = await searchFiles(officialFiles);
  if (officialResult) return officialResult;

  // Fall back to homebrew
  const homebrewFiles = manifest.homebrew[contentTypeFolder] ?? [];
  for (const file of homebrewFiles) {
    const sourceAuthor = parseSourceAuthor(file.name);
    const result = await searchFiles([file], sourceAuthor);
    if (result) return result;
  }

  return null;
}
