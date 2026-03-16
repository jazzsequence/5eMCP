import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { omnisearch } from "../search/omnisearch.js";

const RulesetSchema = z.enum(["2024", "2014"]).default("2024");
const DEFAULT_PER_TYPE = 5;

export function registerOmnisearchTool(server: McpServer): void {
  server.tool(
    "omnisearch",
    [
      "Search across ALL D&D 5e content types simultaneously.",
      "Returns matching spells, monsters, items, conditions, vehicles, and more in one call.",
      "Each result includes an entityType field indicating its content type.",
      "Use this when you don't know what type of thing the user is looking for.",
    ].join(" "),
    {
      query: z.string().describe("Name or partial name to search for across all content types"),
      ruleset: RulesetSchema.describe("Which ruleset to search"),
      per_type_limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(DEFAULT_PER_TYPE)
        .describe("Max results per content type (default 5)"),
      include_homebrew: z.boolean().default(true).describe(
        "Include TheGiddyLimit/homebrew content in results (default true — homebrew classes, spells, etc. are included by default)",
      ),
    },
    async ({ query, ruleset, per_type_limit, include_homebrew = true }) => {
      const results = await omnisearch(query, ruleset as "2024" | "2014", per_type_limit ?? DEFAULT_PER_TYPE, include_homebrew);

      // Summarize by entity type
      const byType: Record<string, number> = {};
      for (const r of results) {
        const type = typeof r.entityType === "string" ? r.entityType : "unknown";
        byType[type] = (byType[type] ?? 0) + 1;
      }

      const response = {
        query,
        ruleset,
        total: results.length,
        by_type: byType,
        results,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
      };
    },
  );
}
