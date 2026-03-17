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

/** Collects names of direct named children within a section node's entries. */
function collectSubsections(node: SectionNode): string[] {
  return (node.entries ?? [])
    .filter(
      (e): e is SectionNode =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as SectionNode).name === "string",
    )
    .map((e) => (e as SectionNode).name as string);
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

/** Renders a section node to markdown text. */
function renderSection(node: SectionNode): string {
  const stripped = stripInternalFields(node) as SectionNode;
  const resolved = resolveTagsDeep(stripped) as SectionNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderEntriesToMarkdown((resolved.entries ?? []) as any);
}

export type BookContentResult =
  // Top-level TOC
  | { source: string; sections: string[] }
  // Section has named subsections → subsection list
  | { source: string; section: string; subsections: string[] }
  // Leaf section (no named children) → full text
  | { source: string; section: string; text: string }
  // Specific subsection text
  | { source: string; section: string; subsection: string; text: string }
  // Source not found
  | { source: string; error: string; sections?: string[] }
  // Section not found
  | { source: string; error: string; sections: string[] }
  // Subsection not found
  | { source: string; section: string; error: string; subsections: string[] };

/**
 * Fetches content from a book or adventure source by abbreviation.
 *
 * Drill-down navigation model (minimises token usage):
 * - No section/subsection → top-level TOC: { source, sections }
 * - section only, has named children → subsection list: { source, section, subsections }
 * - section only, leaf (no named children) → rendered text: { source, section, text }
 * - section + subsection → specific subsection text: { source, section, subsection, text }
 * - Not found → error + available names at that level
 */
export async function getBookContent(
  source: string,
  section: string | undefined,
  subsection: string | undefined,
  ruleset: Ruleset,
): Promise<BookContentResult | null> {
  const manifest = await getManifest(ruleset);
  const lowerSource = source.toLowerCase();

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

  // No section → top-level TOC
  if (!section) {
    return {
      source: resolvedSource,
      sections: collectTopLevelSections(rawData),
    };
  }

  // Find the requested section
  const sectionNode = findSection(rawData, section);
  if (!sectionNode) {
    return {
      source: resolvedSource,
      error: `Section "${section}" not found in ${source.toUpperCase()}`,
      sections: collectTopLevelSections(rawData),
    };
  }

  const sectionName = sectionNode.name as string;

  // Section found, no subsection requested
  if (!subsection) {
    const subsectionNames = collectSubsections(sectionNode);
    // If section has named children, return subsection TOC
    if (subsectionNames.length > 0) {
      return {
        source: resolvedSource,
        section: sectionName,
        subsections: subsectionNames,
      };
    }
    // Leaf section — return rendered text directly
    return {
      source: resolvedSource,
      section: sectionName,
      text: renderSection(sectionNode),
    };
  }

  // Section + subsection requested — search within section's entries
  const entries = sectionNode.entries ?? [];
  const subsectionNode = findSection(entries, subsection);
  if (!subsectionNode) {
    return {
      source: resolvedSource,
      section: sectionName,
      error: `Subsection "${subsection}" not found in "${sectionName}"`,
      subsections: collectSubsections(sectionNode),
    };
  }

  return {
    source: resolvedSource,
    section: sectionName,
    subsection: subsectionNode.name as string,
    text: renderSection(subsectionNode),
  };
}
