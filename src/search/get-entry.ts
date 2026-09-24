import { getManifest } from "../manifest/refresh.js";
import { fetchRaw } from "../github.js";
import { FLUFF_KEY_MAP, getContentKeys, getManifestFolder } from "../translation/handlers/types.js";
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
 * For class and subclass entries, a file often contains both the 2014 (classic)
 * and 2024 (one) editions. This picks the edition that best matches the ruleset.
 * Falls back to the first entry if no preferred edition is found.
 */
function pickBestEdition(matches: ContentEntry[], ruleset: Ruleset): ContentEntry {
  if (matches.length === 1) return matches[0];
  const preferredEdition = ruleset === "2024" ? "one" : "classic";
  return matches.find((e) => e.edition === preferredEdition) ?? matches[0];
}

/**
 * Fetches a single entry by exact name (case-insensitive), optionally filtered by source.
 * Applies full translation: strip internal fields, merge fluff, resolve tags.
 * Returns null if not found.
 *
 * For class entries: attaches resolvedFeatures (classFeature array filtered by classSource,
 * sorted by level) so callers get feature text rather than reference strings.
 * For class and subclass entries: picks the edition matching the ruleset when multiple
 * editions of the same entry exist in a single file.
 */
export async function getEntry(
  contentTypeFolder: string,
  name: string,
  source: string | undefined,
  ruleset: Ruleset,
): Promise<ContentEntry | null> {
  const manifest = await getManifest(ruleset);

  const contentKeys = getContentKeys(contentTypeFolder);
  if (contentKeys.length === 0) return null;

  const fluffKey = FLUFF_KEY_MAP[contentKeys[0]];
  const lowerName = name.toLowerCase();
  const lowerSource = source?.toLowerCase();

  const isEditionAware = contentTypeFolder === "class" || contentTypeFolder === "subclass";

  const searchFiles = async (files: ManifestFile[], sourceAuthorOverride?: string): Promise<ContentEntry | null> => {
    for (const file of files) {
      const data = await fetchRaw(file.url) as Record<string, unknown>;
      const entries = contentKeys.flatMap((key) => (data[key] ?? []) as ContentEntry[]);

      const matchPredicate = (e: ContentEntry): boolean => {
        const eName = typeof e.name === "string" ? e.name.toLowerCase() : "";
        if (eName !== lowerName) return false;
        if (lowerSource) {
          const eSource = typeof e.source === "string" ? e.source.toLowerCase() : "";
          return eSource === lowerSource;
        }
        return true;
      };

      let match: ContentEntry | undefined;
      if (isEditionAware) {
        const allMatches = entries.filter(matchPredicate);
        if (allMatches.length === 0) continue;
        match = pickBestEdition(allMatches, ruleset);
      } else {
        match = entries.find(matchPredicate);
        if (!match) continue;
      }

      const augmented: ContentEntry = sourceAuthorOverride ? { ...match, sourceAuthor: sourceAuthorOverride } : match;
      const stripped = stripInternalFields(augmented) as ContentEntry;

      // For class entries: attach resolved feature content sorted by level.
      // classFeature entries in the same file have classSource matching the class source.
      if (contentTypeFolder === "class") {
        const classFeatureArray = (data.classFeature as ContentEntry[] | undefined) ?? [];
        const resolvedFeatures = classFeatureArray
          .filter((f) => f.classSource === match!.source)
          .sort((a, b) => (a.level as number) - (b.level as number))
          .map((f) => resolveTagsDeep(stripInternalFields(f as Record<string, unknown>)));
        stripped.resolvedFeatures = resolvedFeatures;
      }

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

  // Use MANIFEST_FOLDER_MAP to locate the files (e.g. subclass data lives in class files)
  const manifestFolder = getManifestFolder(contentTypeFolder);
  const officialFiles = manifest.content[manifestFolder] ?? [];
  const officialResult = await searchFiles(officialFiles);
  if (officialResult) return officialResult;

  // Fall back to homebrew
  const homebrewFiles = manifest.homebrew[manifestFolder] ?? [];
  for (const file of homebrewFiles) {
    const sourceAuthor = parseSourceAuthor(file.name);
    const result = await searchFiles([file], sourceAuthor);
    if (result) return result;
  }

  return null;
}
