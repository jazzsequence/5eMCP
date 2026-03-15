import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchContentType } from "../search/index.js";
import { getEntry } from "../search/get-entry.js";

const RulesetSchema = z.enum(["2024", "2014"]).default("2024");
const DEFAULT_LIMIT = 20;

interface ContentToolConfig {
  /** Singular noun for the content type (e.g. "spell") */
  noun: string;
  /** Plural folder name in manifest (e.g. "spells") */
  folder: string;
  /** Human-readable description (e.g. "D&D 5e spell") */
  description: string;
  /** Whether to register a _get tool in addition to _search */
  hasGet?: boolean;
}

const CONTENT_TOOLS: ContentToolConfig[] = [
  { noun: "spell", folder: "spells", description: "D&D 5e spell", hasGet: true },
  { noun: "monster", folder: "bestiary", description: "D&D 5e monster or creature", hasGet: true },
  { noun: "item", folder: "items", description: "D&D 5e magic or mundane item", hasGet: true },
  { noun: "condition", folder: "conditionsdiseases", description: "D&D 5e condition or disease" },
  { noun: "vehicle", folder: "vehicles", description: "D&D 5e vehicle or vessel" },
  { noun: "object", folder: "objects", description: "D&D 5e object" },
  { noun: "trap", folder: "trapshazards", description: "D&D 5e trap or hazard" },
  { noun: "psionic", folder: "psionics", description: "D&D 5e psionic power or discipline" },
  { noun: "deck", folder: "decks", description: "D&D 5e deck (e.g. Deck of Many Things)" },
  { noun: "reward", folder: "rewards", description: "D&D 5e supernatural gift or boon" },
  { noun: "optfeature", folder: "optionalfeatures", description: "D&D 5e optional class feature or invocation" },
  { noun: "table", folder: "tables", description: "D&D 5e random table" },
  { noun: "variantrule", folder: "variantrules", description: "D&D 5e variant rule" },
];

export function registerTypedTools(server: McpServer): void {
  for (const config of CONTENT_TOOLS) {
    const { noun, folder, description, hasGet } = config;

    // Search tool
    server.tool(
      `${noun}_search`,
      `Search ${description}s by name. Returns a list of matching entries.`,
      {
        query: z.string().describe(`Name or partial name to search for`),
        ruleset: RulesetSchema.describe("Which ruleset to search"),
        limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT).describe("Max results to return"),
      },
      async ({ query, ruleset, limit }) => {
        const results = await searchContentType(folder, query, ruleset as "2024" | "2014", limit);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      },
    );

    // Get tool (for types that support exact lookup)
    if (hasGet) {
      server.tool(
        `${noun}_get`,
        `Get a specific ${description} by exact name. Returns full entry with fluff/description merged.`,
        {
          name: z.string().describe(`Exact name of the ${noun} (case-insensitive)`),
          source: z.string().optional().describe("Source abbreviation to disambiguate (e.g. PHB, XGE)"),
          ruleset: RulesetSchema.describe("Which ruleset to search"),
        },
        async ({ name, source, ruleset }) => {
          const entry = await getEntry(folder, name, source, ruleset as "2024" | "2014");
          if (!entry) {
            return {
              content: [{ type: "text", text: `${description} '${name}' not found.` }],
              isError: true,
            };
          }
          return {
            content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
          };
        },
      );
    }
  }
}
