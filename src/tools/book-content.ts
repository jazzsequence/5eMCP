import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBookContent } from "../search/book-content.js";

const RulesetSchema = z.enum(["2024", "2014"]).default("2024");

export function registerBookContentTool(server: McpServer): void {
  server.tool(
    "book_content_get",
    "Get content from a D&D 5e sourcebook or adventure by source abbreviation (e.g. SCC, EGW, PHB). " +
      "Uses a drill-down navigation model to minimise token usage — fetch only what you need:\n" +
      "  1. Omit section → returns top-level section/chapter names (TOC).\n" +
      "  2. Provide section only → if the section has subsections, returns their names; " +
      "if it is a leaf (no subsections), returns its full text.\n" +
      "  3. Provide section + subsection → returns the rendered text of just that subsection.\n" +
      "  4. Not found → returns an error and the available names at that level.\n" +
      "Supports book sources (PHB, DMG, SCC, EGW…) and adventure content (SCC-CK, COS…). " +
      "Section and subsection filters are case-insensitive substring matches.",
    {
      source: z.string().describe(
        "Source abbreviation for the book or adventure (e.g. 'SCC', 'EGW', 'SCC-CK'). Case-insensitive.",
      ),
      section: z.string().optional().describe(
        "Top-level section or chapter name (case-insensitive substring match). " +
          "Omit to get a table of contents.",
      ),
      subsection: z.string().optional().describe(
        "Named subsection within the matched section (case-insensitive substring match). " +
          "Requires section to be set. Returns rendered text of just this subsection.",
      ),
      ruleset: RulesetSchema.describe("Which ruleset to use: '2024' (default) or '2014'."),
    },
    async ({ source, section, subsection, ruleset }) => {
      const result = await getBookContent(source, section, subsection, ruleset);

      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Source "${source}" not found in book or adventure content. Use list_sources to see available sources.`,
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
