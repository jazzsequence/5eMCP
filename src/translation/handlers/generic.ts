import { stripInternalFields } from "../strip.js";
import { resolveTagsDeep } from "../tags.js";
import { mergeFluffEntries } from "../fluff.js";

type ContentEntry = Record<string, unknown>;

/**
 * Factory that creates a typed handler for a specific content type.
 *
 * @param contentKeys - JSON array key(s) inside the data file (e.g. "spell", or
 *                      ["condition", "disease", "status"] for files with sibling arrays)
 * @param fluffKey    - JSON array key inside the fluff file (e.g. "spellFluff"); omit if no fluff
 */
export function createTypedHandler(contentKeys: string | string[], fluffKey?: string) {
  const keys = Array.isArray(contentKeys) ? contentKeys : [contentKeys];
  return function handler(raw: unknown, fluff?: unknown): ContentEntry[] {
    const rawObj = raw as Record<string, unknown>;
    const entries = keys.flatMap((key) => (rawObj[key] ?? []) as ContentEntry[]);

    const stripped = entries.map((e) => stripInternalFields(e) as ContentEntry);

    let merged: ContentEntry[] = stripped;
    if (fluff !== undefined && fluff !== null && fluffKey) {
      const fluffObj = fluff as Record<string, unknown>;
      const fluffEntries = (fluffObj[fluffKey] ?? []) as ContentEntry[];
      const strippedFluff = fluffEntries.map((f) => stripInternalFields(f) as ContentEntry);
      merged = mergeFluffEntries(stripped, strippedFluff);
    }

    return merged.map((e) => resolveTagsDeep(e) as ContentEntry);
  };
}
