import { getManifest } from "../manifest/refresh.js";
import { fetchRaw } from "../github.js";
import { CONTENT_KEY_MAP } from "../translation/handlers/types.js";
import { stripInternalFields } from "../translation/strip.js";
import { resolveTagsDeep } from "../translation/tags.js";
import type { Ruleset } from "../types.js";

/** Fields checked for query matches in addition to name. */
const SEARCHABLE_FIELDS = ["source", "pantheon"] as const;

/** Parses a CR string ("1/4", "1/2", "5", etc.) to a number for comparison. */
function parseCR(cr: unknown): number {
  if (typeof cr !== "string") return NaN;
  if (cr.includes("/")) {
    const [num, den] = cr.split("/").map(Number);
    return num / den;
  }
  return Number(cr);
}

/** Extracts the type string from a 5etools monster type field (string or nested object). */
function extractType(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "type" in val) {
    const nested = (val as Record<string, unknown>).type;
    return typeof nested === "string" ? nested : "";
  }
  return "";
}

/**
 * Returns true if the entry passes all structured filters.
 * Supports: exact number match, string substring match, cr_max range, and type extraction.
 */
function entryMatchesFilters(entry: Record<string, unknown>, filters: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (key === "cr_max") {
      const max = parseCR(value);
      const entryCR = parseCR(entry.cr);
      if (isNaN(entryCR) || entryCR > max) return false;
    } else if (key === "type") {
      const entryType = extractType(entry.type);
      if (!entryType.toLowerCase().includes((value as string).toLowerCase())) return false;
    } else if (typeof value === "number") {
      if (entry[key] !== value) return false;
    } else if (typeof value === "string") {
      const entryVal = entry[key];
      if (typeof entryVal !== "string" || !entryVal.toLowerCase().includes(value.toLowerCase())) return false;
    }
  }
  return true;
}

/** Returns true if any searchable field on the entry contains the query string. */
function entryMatchesQuery(entry: Record<string, unknown>, lowerQuery: string): boolean {
  // Check named string fields first (name, source, pantheon)
  for (const field of ["name", ...SEARCHABLE_FIELDS]) {
    const val = entry[field];
    if (typeof val === "string" && val.toLowerCase().includes(lowerQuery)) return true;
  }
  // Check all top-level array-of-strings fields (property, damageInflict, environment, etc.)
  for (const val of Object.values(entry)) {
    if (Array.isArray(val)) {
      for (const el of val) {
        if (typeof el === "string" && el.toLowerCase().includes(lowerQuery)) return true;
      }
    }
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
  filters: Record<string, unknown> = {},
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

    const data = await fetchRaw(file.url) as Record<string, unknown> | undefined;
    if (!data) continue;
    const entries = data[contentKey];
    if (!Array.isArray(entries)) continue;

    for (const entry of entries as Record<string, unknown>[]) {
      if (results.length >= limit) break;
      if ((!lowerQuery || entryMatchesQuery(entry, lowerQuery)) && entryMatchesFilters(entry, filters)) {
        const translated = resolveTagsDeep(stripInternalFields(entry)) as Record<string, unknown>;
        results.push(translated);
      }
    }
  }

  return results;
}
