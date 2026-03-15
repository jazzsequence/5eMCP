import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getManifest } from "../manifest/refresh.js";
import { hasTypedHandler } from "../translation/index.js";

const RulesetSchema = z.enum(["2024", "2014"]).default("2024");

export function registerMetaTools(server: McpServer): void {
  server.tool(
    "manifest_status",
    "Returns the manifest build time, file counts by content type, and any unknown content types (those without typed handlers).",
    {
      ruleset: RulesetSchema.describe("Which ruleset to query"),
    },
    async ({ ruleset }) => {
      const manifest = await getManifest(ruleset as "2024" | "2014");

      const contentCounts: Record<string, number> = {};
      const unknownTypes: string[] = [];

      for (const [type, files] of Object.entries(manifest.content)) {
        contentCounts[type] = files.length;
        if (!hasTypedHandler(type)) {
          unknownTypes.push(type);
        }
      }

      const homebrewCounts: Record<string, number> = {};
      for (const [cat, files] of Object.entries(manifest.homebrew)) {
        homebrewCounts[cat] = files.length;
      }

      const totalFiles = Object.values(manifest.content).reduce(
        (n, files) => n + files.length,
        0,
      );

      const status = {
        ruleset: manifest.ruleset,
        built_at: new Date(manifest.built_at).toISOString(),
        age_seconds: Math.floor((Date.now() - manifest.built_at) / 1000),
        total_files: totalFiles,
        content_types: contentCounts,
        homebrew_categories: homebrewCounts,
        unknown_types: unknownTypes,
        note: unknownTypes.length > 0
          ? `${unknownTypes.length} content types use the passthrough handler. Use fetch_content to access them.`
          : "All content types have typed handlers.",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    },
  );

  server.tool(
    "list_sources",
    "List all available source abbreviations with their content types and files. Optionally filter by content type.",
    {
      ruleset: RulesetSchema.describe("Which ruleset to query"),
      content_type: z
        .string()
        .optional()
        .describe("Filter to a specific content type (e.g. 'spells', 'bestiary')"),
      homebrew: z.boolean().default(false).describe("List homebrew sources instead"),
    },
    async ({ ruleset, content_type, homebrew }) => {
      const manifest = await getManifest(ruleset as "2024" | "2014");

      const contentMap = homebrew ? manifest.homebrew : manifest.content;
      const entries = content_type
        ? Object.entries(contentMap).filter(([type]) => type === content_type)
        : Object.entries(contentMap);

      const sources: Record<string, { content_types: string[]; file_count: number }> = {};

      for (const [type, files] of entries) {
        for (const file of files) {
          const source = file.source ?? "(none)";
          if (!sources[source]) {
            sources[source] = { content_types: [], file_count: 0 };
          }
          if (!sources[source].content_types.includes(type)) {
            sources[source].content_types.push(type);
          }
          sources[source].file_count++;
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(sources, null, 2) }],
      };
    },
  );
}
