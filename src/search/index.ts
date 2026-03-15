import { getManifest } from "../manifest/refresh.js";
import { fetchRaw } from "../github.js";
import { CONTENT_KEY_MAP } from "../translation/handlers/types.js";
import type { Ruleset } from "../types.js";

/**
 * Searches all files of a given content type folder (e.g. "spells") in the manifest,
 * fetches and filters entries by name substring match.
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
      const name = typeof entry.name === "string" ? entry.name : "";
      if (!lowerQuery || name.toLowerCase().includes(lowerQuery)) {
        results.push(entry);
      }
    }
  }

  return results;
}
