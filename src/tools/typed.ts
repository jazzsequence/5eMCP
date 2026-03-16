import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchContentType } from "../search/index.js";
import { getEntry } from "../search/get-entry.js";

const RulesetSchema = z.enum(["2024", "2014"]).default("2024");
const DEFAULT_LIMIT = 20;

/** Maps full spell school names to 5etools single-letter abbreviations. */
const SPELL_SCHOOL_MAP: Record<string, string> = {
  abjuration: "A",
  conjuration: "C",
  divination: "D",
  enchantment: "E",
  evocation: "V",
  illusion: "I",
  necromancy: "N",
  transmutation: "T",
};

interface FilterSpec {
  schema: Record<string, z.ZodTypeAny>;
  build: (params: Record<string, unknown>) => Record<string, unknown>;
}

interface ContentToolConfig {
  /** Singular noun for the content type (e.g. "spell") */
  noun: string;
  /** Plural folder name in manifest (e.g. "spells") */
  folder: string;
  /** Human-readable description (e.g. "D&D 5e spell") */
  description: string;
  /** Whether to register a _get tool in addition to _search */
  hasGet?: boolean;
  /** Optional structured filter parameters for the _search tool */
  filters?: FilterSpec;
}

const CONTENT_TOOLS: ContentToolConfig[] = [
  {
    noun: "spell",
    folder: "spells",
    description: "D&D 5e spell",
    hasGet: true,
    filters: {
      schema: {
        level: z.number().int().min(0).max(9).optional().describe("Filter by spell level (0–9)"),
        school: z.string().optional().describe(
          "Filter by school of magic: abjuration, conjuration, divination, enchantment, evocation, illusion, necromancy, transmutation",
        ),
      },
      build: ({ level, school }) => {
        const filters: Record<string, unknown> = {};
        if (level !== undefined) filters.level = level as number;
        if (typeof school === "string" && school) {
          filters.school = SPELL_SCHOOL_MAP[school.toLowerCase()] ?? school;
        }
        return filters;
      },
    },
  },
  {
    noun: "monster",
    folder: "bestiary",
    description: "D&D 5e monster or creature",
    hasGet: true,
    filters: {
      schema: {
        type: z.string().optional().describe(
          "Filter by creature type (e.g. beast, humanoid, undead, dragon, fiend)",
        ),
        cr_max: z.string().optional().describe(
          "Filter by maximum challenge rating inclusive (e.g. '1/4', '1/2', '5', '20')",
        ),
        environment: z.string().optional().describe(
          "Filter by habitat/environment (e.g. 'underdark', 'forest', 'nine hells', 'arctic')",
        ),
      },
      build: ({ type, cr_max, environment }) => {
        const filters: Record<string, unknown> = {};
        if (typeof type === "string" && type) filters.type = type;
        if (typeof cr_max === "string" && cr_max) filters.cr_max = cr_max;
        if (typeof environment === "string" && environment) filters.environment = environment;
        return filters;
      },
    },
  },
  {
    noun: "item",
    folder: "items",
    description: "D&D 5e magic or mundane item",
    hasGet: true,
    filters: {
      schema: {
        rarity: z.string().optional().describe(
          "Filter by rarity: common, uncommon, rare, very rare, legendary, artifact",
        ),
        type: z.string().optional().describe(
          "Filter by item type (e.g. weapon, armor, wondrous, potion, ring, rod, staff, wand)",
        ),
      },
      build: ({ rarity, type }) => {
        const filters: Record<string, unknown> = {};
        if (typeof rarity === "string" && rarity) filters.rarity = rarity;
        if (typeof type === "string" && type) filters.type = type;
        return filters;
      },
    },
  },
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
  { noun: "race", folder: "races", description: "D&D 5e playable species or race", hasGet: true },
  { noun: "background", folder: "backgrounds", description: "D&D 5e character background", hasGet: true },
  { noun: "feat", folder: "feats", description: "D&D 5e feat", hasGet: true },
  { noun: "deity", folder: "deities", description: "D&D 5e deity or god" },
  { noun: "language", folder: "languages", description: "D&D 5e language" },
  { noun: "skill", folder: "skills", description: "D&D 5e skill" },
  { noun: "sense", folder: "senses", description: "D&D 5e sense (e.g. darkvision, tremorsense)" },
  { noun: "book", folder: "books", description: "D&D 5e sourcebook", hasGet: true },
  { noun: "adventure", folder: "adventures", description: "D&D 5e published adventure", hasGet: true },
  { noun: "class", folder: "class", description: "D&D 5e character class", hasGet: true },
  { noun: "subclass", folder: "subclass", description: "D&D 5e subclass or archetype", hasGet: true },
];

export function registerTypedTools(server: McpServer): void {
  for (const config of CONTENT_TOOLS) {
    const { noun, folder, description, hasGet, filters } = config;

    // Search tool
    const searchSchema = {
      query: z.string().describe(`Name or partial name to search for`),
      ruleset: RulesetSchema.describe("Which ruleset to search"),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT).describe("Max results to return"),
      fields: z.array(z.string()).optional().describe(
        "Fields to include in each result (default: all fields). E.g. [\"name\",\"cr\",\"source\"]",
      ),
      include_homebrew: z.boolean().default(false).describe(
        "When true, also search TheGiddyLimit/homebrew content alongside official results",
      ),
      ...(filters?.schema ?? {}),
    };

    server.tool(
      `${noun}_search`,
      `Search ${description}s by name. Returns a list of matching entries.`,
      searchSchema,
      async (params) => {
        const { query, ruleset, limit, fields, include_homebrew = false, ...rest } = params as {
          query: string;
          ruleset: "2024" | "2014";
          limit: number;
          fields?: string[];
          include_homebrew?: boolean;
          [key: string]: unknown;
        };
        const builtFilters = filters?.build(rest) ?? {};
        const results = await searchContentType(folder, query, ruleset, limit, builtFilters, fields, include_homebrew);
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
