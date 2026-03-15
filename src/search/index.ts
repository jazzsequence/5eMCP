import { getManifest } from "../manifest/refresh.js";
import { fetchRaw } from "../github.js";
import { CONTENT_KEY_MAP } from "../translation/handlers/types.js";
import { stripInternalFields } from "../translation/strip.js";
import { resolveTagsDeep } from "../translation/tags.js";
import type { Ruleset } from "../types.js";

/** Fields checked for query matches in addition to name. */
const SEARCHABLE_FIELDS = ["source", "pantheon"] as const;

/** Returns true if any searchable field on the entry contains the query string. */
function entryMatchesQuery(entry: Record<string, unknown>, lowerQuery: string): boolean {
  for (const field of ["name", ...SEARCHABLE_FIELDS]) {
    const val = entry[field];
    if (typeof val === "string" && val.toLowerCase().includes(lowerQuery)) return true;
  }
  return false;
}

/**
 * Searches all files of a given content type folder (e.g. "spells") in the manifest,
 * fetches and filters entries by name, source, or pantheon substring match.
 */
export async function searchContentType(
  contentTypeFolder: string,
  query: string,
  ruleset: Ruleset,
  limit = 20,
): Promise<Record<string, unknown>[]> {
  const manifest = await getManifest(ruleset);
  const files = manifest.content[contentTypeFolder];
  if (!files || files.length === 0) return [];

  const contentKey = CONTENT_KEY_MAP[contentTypeFolder];
  if (!contentKey) return [];

  const lowerQuery = query.toLowerCase();
  const results: Record<string, unknown>[] = [];

  for (const file of files) {
    if (results.length >= limit) break;

    const data = await fetchRaw(file.url) as Record<string, unknown>;
    const entries = data[contentKey];
    if (!Array.isArray(entries)) continue;

    for (const entry of entries as Record<string, unknown>[]) {
      if (results.length >= limit) break;
      if (!lowerQuery || entryMatchesQuery(entry, lowerQuery)) {
        const translated = resolveTagsDeep(stripInternalFields(entry)) as Record<string, unknown>;
        results.push(translated);
      }
    }
  }

  return results;
}
