import { getManifest } from "../manifest/refresh.js";
import { fetchRaw } from "../github.js";
import { stripInternalFields } from "../translation/strip.js";
import { resolveTagsDeep } from "../translation/tags.js";
import { renderEntriesToMarkdown } from "../translation/render.js";
import type { Ruleset } from "../types.js";

type SectionNode = {
  type?: string;
  name?: string;
  entries?: unknown[];
  [key: string]: unknown;
};

/** Collects all top-level section names from data array. */
function collectTopLevelSections(data: SectionNode[]): string[] {
  return data
    .filter((node) => node.type === "section" && typeof node.name === "string")
    .map((node) => node.name as string);
}

/** Recursively searches for a section whose name contains the filter (case-insensitive). */
function findSection(nodes: unknown[], filter: string): SectionNode | null {
  const lower = filter.toLowerCase();
  for (const node of nodes) {
    if (typeof node !== "object" || node === null) continue;
    const n = node as SectionNode;
    if (typeof n.name === "string" && n.name.toLowerCase().includes(lower)) {
      return n;
    }
    if (Array.isArray(n.entries)) {
      const found = findSection(n.entries, filter);
      if (found) return found;
    }
  }
  return null;
}

export type BookContentResult =
  | { source: string; sections: string[]; text?: never; section?: never; error?: never }
  | { source: string; section: string; text: string; sections?: never; error?: never }
  | { source: string; error: string; sections: string[]; text?: never; section?: never };

/**
 * Fetches content from a book or adventure source by abbreviation.
 * - No section filter → returns TOC (list of top-level section names).
 * - Section filter provided → returns rendered markdown text of that section.
 * - Section not found → returns error + available sections.
 * Searches manifest.content.book first, then manifest.content.adventure.
 */
export async function getBookContent(
  source: string,
  section: string | undefined,
  ruleset: Ruleset,
): Promise<BookContentResult | null> {
  const manifest = await getManifest(ruleset);
  const lowerSource = source.toLowerCase();

  // Search book content first, then adventure content
  const bookFiles = manifest.content["book"] ?? [];
  const adventureFiles = manifest.content["adventure"] ?? [];
  const allFiles = [...bookFiles, ...adventureFiles];

  const file = allFiles.find((f) => {
    const fileSource = typeof f.source === "string" ? f.source : f.name;
    return typeof fileSource === "string" && fileSource.toLowerCase() === lowerSource;
  });

  if (!file) return null;

  const data = await fetchRaw(file.url) as Record<string, unknown>;
  const rawData = (data["data"] ?? []) as SectionNode[];
  const resolvedSource = typeof file.source === "string" ? file.source : source.toUpperCase();

  if (!section) {
    return {
      source: resolvedSource,
      sections: collectTopLevelSections(rawData),
    };
  }

  const found = findSection(rawData, section);
  if (!found) {
    return {
      source: resolvedSource,
      error: `Section "${section}" not found in ${source.toUpperCase()}`,
      sections: collectTopLevelSections(rawData),
    };
  }

  const stripped = stripInternalFields(found) as SectionNode;
  const resolved = resolveTagsDeep(stripped) as SectionNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = renderEntriesToMarkdown((resolved.entries ?? []) as any);

  return {
    source: resolvedSource,
    section: found.name as string,
    text,
  };
}
