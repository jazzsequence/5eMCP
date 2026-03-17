import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateCr, scaleCr } from "../calculators/cr.js";
import { buildEncounter } from "../calculators/encounter.js";
import { generateLoot } from "../calculators/loot.js";

const RulesetSchema = z.enum(["2014", "2024"]).default("2014");

const CR_VALUES = [
  "0", "1/8", "1/4", "1/2",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
];

export function registerCalculatorTools(server: McpServer): void {
  // ── cr_calculate ────────────────────────────────────────────────────────────
  server.tool(
    "cr_calculate",
    "Calculate the Challenge Rating (CR) for a custom monster given its defensive and offensive stats. " +
      "Uses the DMG Appendix B algorithm: defensive CR is derived from HP (adjusted for damage immunity, " +
      "resistance, or vulnerability) and AC; offensive CR is derived from DPR and attack bonus (or save DC). " +
      "The two are averaged to produce the final CR. Provide at least one of attackBonus or saveDc for the " +
      "offensive calculation.",
    {
      hp: z.number().int().min(1).describe("Monster's hit point total."),
      ac: z.number().int().min(1).describe("Monster's Armor Class."),
      dpr: z
        .number()
        .min(0)
        .describe(
          "Average damage per round (DPR). For multi-attack creatures, sum all attacks' average damage.",
        ),
      attackBonus: z
        .number()
        .int()
        .optional()
        .describe("Monster's attack bonus (e.g. +5 → 5). Takes precedence over saveDc."),
      saveDc: z
        .number()
        .int()
        .optional()
        .describe("Monster's spell/ability save DC. Used when attackBonus is not provided."),
      vulnerability: z
        .boolean()
        .optional()
        .describe(
          "Monster is vulnerable to a common damage type — effective HP is halved for CR purposes.",
        ),
      resistance: z
        .boolean()
        .optional()
        .describe(
          "Monster is resistant to a common damage type — effective HP is treated as 1.5× actual.",
        ),
      immunity: z
        .boolean()
        .optional()
        .describe(
          "Monster is immune to a common damage type — effective HP is doubled for CR purposes.",
        ),
    },
    async ({ hp, ac, dpr, attackBonus, saveDc, vulnerability, resistance, immunity }) => {
      const result = calculateCr({ hp, ac, dpr, attackBonus, saveDc, vulnerability, resistance, immunity });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── cr_scale ─────────────────────────────────────────────────────────────────
  server.tool(
    "cr_scale",
    "Look up the expected stat ranges for a given Challenge Rating from the DMG reference table. " +
      "Returns proficiency bonus, expected AC, HP range, attack bonus, DPR range, and save DC. " +
      "Useful for scaling a homebrew monster up or down to a target CR, or for quickly checking " +
      "whether a monster's stats are appropriate for its intended CR.",
    {
      cr: z
        .string()
        .describe(
          `Target Challenge Rating. Accepts '0', '1/8', '1/4', '1/2', or integers 1–30. Valid values: ${CR_VALUES.join(", ")}.`,
        ),
    },
    async ({ cr }) => {
      const result = scaleCr(cr);
      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid CR "${cr}". Valid values: ${CR_VALUES.join(", ")}`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── encounter_build ──────────────────────────────────────────────────────────
  server.tool(
    "encounter_build",
    "Evaluate the difficulty of a D&D 5e encounter given the party composition and monster CRs. " +
      "Supports both 2014 (classic) and 2024 (one D&D) rulesets. " +
      "2014 mode: uses four difficulty tiers (easy/medium/hard/deadly) with a monster count XP multiplier. " +
      "2024 mode: uses three difficulty tiers (low/moderate/high) with no multiplier. " +
      "Both modes add a 'trivial' tier below easy/low and an 'absurd' tier above deadly/high. " +
      "Returns total XP, adjusted XP (2014 only), difficulty label, and full threshold breakdown.",
    {
      partyLevels: z
        .array(z.number().int().min(1).max(20))
        .min(1)
        .describe(
          "Array of character levels in the party (one entry per character). " +
            "Example: [5, 5, 4, 4] for a four-person party at levels 5/5/4/4.",
        ),
      monsterCrs: z
        .array(z.string())
        .min(1)
        .describe(
          `Array of monster CR strings (one entry per monster). Example: ["5", "3", "1/2"]. ` +
            `Valid CR values: ${CR_VALUES.join(", ")}.`,
        ),
      ruleset: RulesetSchema.describe(
        "Which ruleset to use: '2014' (classic, with XP multiplier) or '2024' (no multiplier). Defaults to '2014'.",
      ),
    },
    async ({ partyLevels, monsterCrs, ruleset }) => {
      const result = buildEncounter({ partyLevels, monsterCrs, ruleset });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── loot_generate ────────────────────────────────────────────────────────────
  server.tool(
    "loot_generate",
    "Generate individual treasure loot for a monster of a given Challenge Rating, " +
      "based on the DMG individual treasure tables. Returns all possible outcomes for the " +
      "appropriate CR bracket (Challenge 0-4, 5-10, 11-16, or 17+) with their d100 range, " +
      "probability percentage, and average coin amounts (using dice average values). " +
      "Roll a d100 to select a row, or use the average coins for a quick reference.",
    {
      cr: z
        .string()
        .describe(
          `Monster's Challenge Rating. Accepts '0', '1/8', '1/4', '1/2', or integers 1–30. ` +
            `Valid values: ${CR_VALUES.join(", ")}.`,
        ),
    },
    async ({ cr }) => {
      const result = generateLoot(cr);
      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid CR "${cr}". Valid values: ${CR_VALUES.join(", ")}`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
