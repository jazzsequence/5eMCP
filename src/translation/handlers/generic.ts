import { stripInternalFields } from "../strip.js";
import { resolveTagsDeep } from "../tags.js";
import { mergeFluffEntries } from "../fluff.js";

type ContentEntry = Record<string, unknown>;

/**
 * Factory that creates a typed handler for a specific content type.
 *
 * @param contentKey  - JSON array key inside the data file (e.g. "spell")
 * @param fluffKey    - JSON array key inside the fluff file (e.g. "spellFluff"); omit if no fluff
 */
export function createTypedHandler(contentKey: string, fluffKey?: string) {
  return function handler(raw: unknown, fluff?: unknown): ContentEntry[] {
    const rawObj = raw as Record<string, unknown>;
    const entries = (rawObj[contentKey] ?? []) as ContentEntry[];

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
