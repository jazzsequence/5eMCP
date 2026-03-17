import { getCrRow } from "./cr.js";

/** XP thresholds per player level — 2014 ruleset (index = level, 0 unused) */
const XP_THRESHOLDS_2014: Record<"easy" | "medium" | "hard" | "deadly", number[]> = {
  easy:   [0, 25,  50,  75,  125, 250, 300, 350, 450, 550, 600, 800, 1000, 1100, 1250, 1400, 1600, 2000, 2100, 2400, 2800],
  medium: [0, 50,  100, 150, 250, 500, 600, 750, 900, 1100, 1200, 1600, 2000, 2200, 2500, 2800, 3200, 3900, 4100, 4900, 5700],
  hard:   [0, 75,  150, 225, 375, 750, 900, 1100, 1400, 1600, 1900, 2400, 3000, 3400, 3800, 4300, 4800, 5900, 6300, 7300, 8500],
  deadly: [0, 100, 200, 400, 500, 1100, 1400, 1700, 2100, 2400, 2800, 3600, 4500, 5100, 5700, 6400, 7200, 8800, 9500, 10900, 12700],
};

/** XP thresholds per player level — 2024 ruleset (index = level, 0 unused) */
const XP_THRESHOLDS_2024: Record<"low" | "moderate" | "high", number[]> = {
  low:      [0, 50,  100, 150, 250, 500, 600, 750, 1000, 1300, 1600, 1900, 2200, 2600, 2900, 3300, 3800, 4500, 5000, 5500, 6400],
  moderate: [0, 75,  150, 225, 375, 750, 1000, 1300, 1700, 2000, 2300, 2900, 3700, 4200, 4900, 5400, 6100, 7200, 8700, 10700, 13200],
  high:     [0, 100, 200, 400, 500, 1100, 1400, 1700, 2100, 2600, 3100, 4100, 4700, 5400, 6200, 7800, 9800, 11700, 14200, 17200, 22000],
};

/** Monster count multipliers for 2014 ruleset */
const MONSTER_MULTIPLIERS: Array<{ maxCount: number; multiplier: number }> = [
  { maxCount: 1,  multiplier: 1 },
  { maxCount: 2,  multiplier: 1.5 },
  { maxCount: 6,  multiplier: 2 },
  { maxCount: 10, multiplier: 2.5 },
  { maxCount: 14, multiplier: 3 },
  { maxCount: Infinity, multiplier: 4 },
];

export function getCrXp(cr: string): number {
  return getCrRow(cr)?.xp ?? 0;
}

export interface EncounterOptions {
  partyLevels: number[];
  monsterCrs: string[];
  ruleset?: "2014" | "2024";
}

export interface EncounterResult {
  ruleset: "2014" | "2024";
  partySize: number;
  monsterCount: number;
  totalXp: number;
  adjustedXp: number;
  multiplier?: number;
  difficulty: string;
  thresholds: Record<string, number>;
}

function getMultiplier2014(monsterCount: number, partySize: number): number {
  const base = MONSTER_MULTIPLIERS.find((m) => monsterCount <= m.maxCount)!.multiplier;
  const idx = MONSTER_MULTIPLIERS.findIndex((m) => monsterCount <= m.maxCount);
  // Adjust for party size
  if (partySize < 3) return MONSTER_MULTIPLIERS[Math.min(idx + 1, MONSTER_MULTIPLIERS.length - 1)].multiplier;
  if (partySize > 5) return MONSTER_MULTIPLIERS[Math.max(idx - 1, 0)].multiplier;
  return base;
}

function buildResult2014(options: EncounterOptions): EncounterResult {
  const { partyLevels, monsterCrs } = options;
  const partySize = partyLevels.length;
  const monsterCount = monsterCrs.length;

  const totalXp = monsterCrs.reduce((sum, cr) => sum + getCrXp(cr), 0);
  const multiplier = getMultiplier2014(monsterCount, partySize);
  const adjustedXp = Math.round(totalXp * multiplier);

  const thresholds: Record<string, number> = {
    easy:   partyLevels.reduce((sum, lvl) => sum + (XP_THRESHOLDS_2014.easy[lvl] ?? 0), 0),
    medium: partyLevels.reduce((sum, lvl) => sum + (XP_THRESHOLDS_2014.medium[lvl] ?? 0), 0),
    hard:   partyLevels.reduce((sum, lvl) => sum + (XP_THRESHOLDS_2014.hard[lvl] ?? 0), 0),
    deadly: partyLevels.reduce((sum, lvl) => sum + (XP_THRESHOLDS_2014.deadly[lvl] ?? 0), 0),
  };

  let difficulty: string;
  if (adjustedXp >= thresholds.deadly * 2) difficulty = "absurd";
  else if (adjustedXp >= thresholds.deadly) difficulty = "deadly";
  else if (adjustedXp >= thresholds.hard) difficulty = "hard";
  else if (adjustedXp >= thresholds.medium) difficulty = "medium";
  else if (adjustedXp >= thresholds.easy) difficulty = "easy";
  else difficulty = "trivial";

  return {
    ruleset: "2014",
    partySize,
    monsterCount,
    totalXp,
    adjustedXp,
    multiplier,
    difficulty,
    thresholds,
  };
}

function buildResult2024(options: EncounterOptions): EncounterResult {
  const { partyLevels, monsterCrs } = options;
  const partySize = partyLevels.length;
  const monsterCount = monsterCrs.length;

  const totalXp = monsterCrs.reduce((sum, cr) => sum + getCrXp(cr), 0);

  const thresholds: Record<string, number> = {
    low:      partyLevels.reduce((sum, lvl) => sum + (XP_THRESHOLDS_2024.low[lvl] ?? 0), 0),
    moderate: partyLevels.reduce((sum, lvl) => sum + (XP_THRESHOLDS_2024.moderate[lvl] ?? 0), 0),
    high:     partyLevels.reduce((sum, lvl) => sum + (XP_THRESHOLDS_2024.high[lvl] ?? 0), 0),
  };

  let difficulty: string;
  if (totalXp >= thresholds.high * 2) difficulty = "absurd";
  else if (totalXp >= thresholds.high) difficulty = "high";
  else if (totalXp >= thresholds.moderate) difficulty = "moderate";
  else if (totalXp >= thresholds.low) difficulty = "low";
  else difficulty = "trivial";

  return {
    ruleset: "2024",
    partySize,
    monsterCount,
    totalXp,
    adjustedXp: totalXp,
    difficulty,
    thresholds,
  };
}

export function buildEncounter(options: EncounterOptions): EncounterResult {
  const ruleset = options.ruleset ?? "2014";
  return ruleset === "2024" ? buildResult2024(options) : buildResult2014(options);
}
