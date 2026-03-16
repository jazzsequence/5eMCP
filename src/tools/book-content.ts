import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBookContent } from "../search/book-content.js";

const RulesetSchema = z.enum(["2024", "2014"]).default("2024");

export function registerBookContentTool(server: McpServer): void {
  server.tool(
    "book_get",
    "Get content from a D&D 5e sourcebook or adventure by source abbreviation (e.g. SCC, EGW, PHB). " +
      "Without a section filter, returns a table of contents listing top-level chapter/section names. " +
      "With a section filter, returns the full text of the matching section (case-insensitive substring match). " +
      "Supports both book sources (PHB, DMG, SCC, EGW…) and adventure content files (SCC-CK, COS…).",
    {
      source: z.string().describe(
        "Source abbreviation for the book or adventure (e.g. 'SCC', 'EGW', 'SCC-CK'). Case-insensitive.",
      ),
      section: z.string().optional().describe(
        "Optional section name filter (case-insensitive substring match). " +
          "Omit to get a table of contents. Provide to get a specific chapter or section.",
      ),
      ruleset: RulesetSchema.describe("Which ruleset to use: '2024' (default) or '2014'."),
    },
    async ({ source, section, ruleset }) => {
      const result = await getBookContent(source, section, ruleset);

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
