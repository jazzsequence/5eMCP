import { searchContentType } from "./index.js";
import { CONTENT_KEY_MAP } from "../translation/handlers/types.js";
import type { Ruleset } from "../types.js";

/** Maps manifest folder name to the singular noun used as entityType */
const FOLDER_TO_NOUN: Record<string, string> = {
  spells: "spell",
  bestiary: "monster",
  items: "item",
  conditionsdiseases: "condition",
  vehicles: "vehicle",
  objects: "object",
  trapshazards: "trap",
  psionics: "psionic",
  decks: "deck",
  rewards: "reward",
  optionalfeatures: "optfeature",
  tables: "table",
  variantrules: "variantrule",
};

const PER_TYPE_LIMIT = 5;

/**
 * Searches all known content types simultaneously and merges results.
 * Each result gets an `entityType` field indicating its content type.
 * Content type errors are silently skipped so partial results are returned.
 */
export async function omnisearch(
  query: string,
  ruleset: Ruleset,
  perTypeLimit = PER_TYPE_LIMIT,
): Promise<Record<string, unknown>[]> {
  const folders = Object.keys(CONTENT_KEY_MAP);

  const settled = await Promise.allSettled(
    folders.map(async (folder) => {
      const noun = FOLDER_TO_NOUN[folder] ?? folder;
      const entries = await searchContentType(folder, query, ruleset, perTypeLimit);
      return entries.slice(0, perTypeLimit).map((e) => ({ ...e, entityType: noun }));
    }),
  );

  const results: Record<string, unknown>[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value);
    }
  }

  return results;
}
