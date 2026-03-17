type CoinType = "cp" | "sp" | "ep" | "gp" | "pp";

interface LootTableRow {
  min: number;
  max: number;
  coins: Partial<Record<CoinType, string>>;
}

interface LootBracket {
  name: string;
  crMin: number;
  crMax: number;
  table: LootTableRow[];
}

/** Individual treasure tables from DMG Appendix A */
const LOOT_BRACKETS: LootBracket[] = [
  {
    name: "Challenge 0-4",
    crMin: 0,
    crMax: 4,
    table: [
      { min: 1,  max: 30,  coins: { cp: "5d6" } },
      { min: 31, max: 60,  coins: { sp: "4d6" } },
      { min: 61, max: 70,  coins: { ep: "3d6" } },
      { min: 71, max: 95,  coins: { gp: "3d6" } },
      { min: 96, max: 100, coins: { pp: "1d6" } },
    ],
  },
  {
    name: "Challenge 5-10",
    crMin: 5,
    crMax: 10,
    table: [
      { min: 1,  max: 30,  coins: { cp: "4d6*100", ep: "1d6*10" } },
      { min: 31, max: 60,  coins: { sp: "6d6*10",  gp: "2d6*10" } },
      { min: 61, max: 70,  coins: { ep: "3d6*10",  gp: "2d6*10" } },
      { min: 71, max: 95,  coins: { gp: "4d6*10" } },
      { min: 96, max: 100, coins: { gp: "2d6*10",  pp: "3d6" } },
    ],
  },
  {
    name: "Challenge 11-16",
    crMin: 11,
    crMax: 16,
    table: [
      { min: 1,  max: 20,  coins: { sp: "4d6*100", gp: "1d6*100" } },
      { min: 21, max: 35,  coins: { ep: "1d6*100", gp: "1d6*100" } },
      { min: 36, max: 75,  coins: { gp: "2d6*100", pp: "1d6*10" } },
      { min: 76, max: 100, coins: { gp: "2d6*100", pp: "2d6*10" } },
    ],
  },
  {
    name: "Challenge 17+",
    crMin: 17,
    crMax: Infinity,
    table: [
      { min: 1,  max: 15,  coins: { cp: "2d6*1000", sp: "8d6*100" } },
      { min: 16, max: 55,  coins: { ep: "1d6*1000", gp: "1d6*1000" } },
      { min: 56, max: 100, coins: { gp: "1d6*1000", pp: "1d6*100" } },
    ],
  },
];

/** Parse and evaluate a dice expression to its average value.
 *  Supports forms: "NdX" and "NdX*M" where N, X, M are positive integers.
 */
export function evalDiceAvg(expr: string): number {
  const match = expr.match(/^(\d+)d(\d+)(?:\*(\d+))?$/);
  if (!match) return 0;
  const numDice = parseInt(match[1], 10);
  const dieSides = parseInt(match[2], 10);
  const multiplier = match[3] ? parseInt(match[3], 10) : 1;
  return Math.round(numDice * (dieSides + 1) / 2) * multiplier;
}

export interface LootRow {
  range: { min: number; max: number };
  probability: number;
  coins: Partial<Record<CoinType, number>>;
}

export interface LootResult {
  cr: string;
  bracket: string;
  table: LootRow[];
}

function crToNumeric(cr: string | number): number {
  if (typeof cr === "number") return cr;
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  const n = parseFloat(cr);
  return isNaN(n) ? -1 : n;
}

function crToString(cr: string | number): string {
  if (typeof cr === "string") return cr;
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

const VALID_CR_NUMERICS = new Set([
  0, 0.125, 0.25, 0.5,
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
]);

export function generateLoot(cr: string | number): LootResult | null {
  const numeric = crToNumeric(typeof cr === "number" ? cr : cr);
  if (numeric < 0 || !VALID_CR_NUMERICS.has(numeric)) return null;

  const bracket = LOOT_BRACKETS.find((b) => numeric >= b.crMin && numeric <= b.crMax);
  if (!bracket) return null;

  const table: LootRow[] = bracket.table.map((row) => {
    const coins: Partial<Record<CoinType, number>> = {};
    for (const [coin, expr] of Object.entries(row.coins) as [CoinType, string][]) {
      coins[coin] = evalDiceAvg(expr);
    }
    return {
      range: { min: row.min, max: row.max },
      probability: row.max - row.min + 1,
      coins,
    };
  });

  return {
    cr: crToString(cr),
    bracket: bracket.name,
    table,
  };
}
