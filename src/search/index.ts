import { getManifest } from "../manifest/refresh.js";
import { fetchRaw } from "../github.js";
import { CONTENT_KEY_MAP } from "../translation/handlers/types.js";
import { stripInternalFields } from "../translation/strip.js";
import { resolveTagsDeep } from "../translation/tags.js";
import type { Ruleset } from "../types.js";

/** Named string fields always checked for query matches (in addition to name). */
const SEARCHABLE_FIELDS = ["source", "pantheon", "sourceAuthor"] as const;

/** All named fields explicitly checked — used to skip re-checking them in the general pass. */
const NAMED_CHECKED_FIELDS = new Set(["name", "source", "pantheon", "sourceAuthor"]);

/** Strips non-alphanumeric characters and lowercases — for matching concatenated source abbreviations. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Extracts the author portion from a homebrew filename like "Matthew Mercer; Widogast's Web of Fire.json". */
function parseSourceAuthor(filename: string): string | undefined {
  const semicolonIdx = filename.indexOf(";");
  if (semicolonIdx === -1) return undefined;
  return filename.slice(0, semicolonIdx).trim();
}

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
    } else if (key === "environment") {
      const envArray = entry.environment;
      if (!Array.isArray(envArray)) return false;
      const envValue = (value as string).toLowerCase();
      if (!envArray.some((e) => typeof e === "string" && e.toLowerCase().includes(envValue))) return false;
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
  const normalizedQuery = normalize(lowerQuery);
  // Check named string fields first (name, source, pantheon, sourceAuthor)
  for (const field of ["name", ...SEARCHABLE_FIELDS]) {
    const val = entry[field];
    if (typeof val === "string") {
      if (val.toLowerCase().includes(lowerQuery)) return true;
      // Normalized fallback: strips spaces/punctuation so "codex of waves" matches "WalrockHomebrewCodexOfWaves"
      if (field !== "name" && normalizedQuery && normalize(val).includes(normalizedQuery)) return true;
    }
  }
  // Check all top-level string fields not already checked above (group, rarity, tier, etc.)
  // and all top-level array-of-strings fields (property, damageInflict, environment, etc.)
  for (const [key, val] of Object.entries(entry)) {
    if (NAMED_CHECKED_FIELDS.has(key)) continue;
    if (typeof val === "string") {
      if (val.toLowerCase().includes(lowerQuery)) return true;
    } else if (Array.isArray(val)) {
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
/** Searches a list of manifest files and appends matching entries to results up to limit. */
async function searchFiles(
  files: { url: string; name?: string }[],
  contentKey: string,
  lowerQuery: string,
  filters: Record<string, unknown>,
  results: Record<string, unknown>[],
  limit: number,
): Promise<void> {
  for (const file of files) {
    if (results.length >= limit) break;

    const sourceAuthor = file.name ? parseSourceAuthor(file.name) : undefined;

    const data = (await fetchRaw(file.url)) as Record<string, unknown> | undefined;
    if (!data) continue;
    const entries = data[contentKey];
    if (!Array.isArray(entries)) continue;

    for (const entry of entries as Record<string, unknown>[]) {
      if (results.length >= limit) break;
      const augmented: Record<string, unknown> = sourceAuthor ? { ...entry, sourceAuthor } : entry;
      if ((!lowerQuery || entryMatchesQuery(augmented, lowerQuery)) && entryMatchesFilters(augmented, filters)) {
        const translated = resolveTagsDeep(stripInternalFields(augmented)) as Record<string, unknown>;
        results.push(translated);
      }
    }
  }
}

/**
 * Searches all files of a given content type folder (e.g. "spells") in the manifest,
 * fetches and filters entries by name, source, or pantheon substring match.
 * When include_homebrew is true, also searches homebrew files for the same content type.
 */
export async function searchContentType(
  contentTypeFolder: string,
  query: string,
  ruleset: Ruleset,
  limit = 20,
  filters: Record<string, unknown> = {},
  fields?: string[],
  include_homebrew = false,
): Promise<Record<string, unknown>[]> {
  const manifest = await getManifest(ruleset);

  const contentKey = CONTENT_KEY_MAP[contentTypeFolder];
  if (!contentKey) return [];

  const files = manifest.content[contentTypeFolder] ?? [];

  const lowerQuery = query.toLowerCase();
  const results: Record<string, unknown>[] = [];

  await searchFiles(files, contentKey, lowerQuery, filters, results, limit);

  if (include_homebrew && results.length < limit) {
    const homebrewFiles = manifest.homebrew[contentTypeFolder];
    if (homebrewFiles && homebrewFiles.length > 0) {
      await searchFiles(homebrewFiles, contentKey, lowerQuery, filters, results, limit);
    }
  }

  if (fields && fields.length > 0) {
    return results.map((r) =>
      Object.fromEntries(fields.filter((f) => f in r).map((f) => [f, r[f]])),
    );
  }
  return results;
}
