/** CR reference table from DMG Appendix B (Monster Statistics by Challenge Rating) */
export interface CrRow {
  cr: string;
  xp: number;
  pb: number;
  ac: number;
  hpMin: number;
  hpMax: number;
  attackBonus: number;
  dprMin: number;
  dprMax: number;
  saveDc: number;
}

export const CR_TABLE: CrRow[] = [
  { cr: "0",   xp: 10,     pb: 2, ac: 13, hpMin: 1,   hpMax: 6,   attackBonus: 3,  dprMin: 0,   dprMax: 1,   saveDc: 13 },
  { cr: "1/8", xp: 25,     pb: 2, ac: 13, hpMin: 7,   hpMax: 35,  attackBonus: 3,  dprMin: 2,   dprMax: 3,   saveDc: 13 },
  { cr: "1/4", xp: 50,     pb: 2, ac: 13, hpMin: 36,  hpMax: 49,  attackBonus: 3,  dprMin: 4,   dprMax: 5,   saveDc: 13 },
  { cr: "1/2", xp: 100,    pb: 2, ac: 13, hpMin: 50,  hpMax: 70,  attackBonus: 3,  dprMin: 6,   dprMax: 8,   saveDc: 13 },
  { cr: "1",   xp: 200,    pb: 2, ac: 13, hpMin: 71,  hpMax: 85,  attackBonus: 3,  dprMin: 9,   dprMax: 14,  saveDc: 13 },
  { cr: "2",   xp: 450,    pb: 2, ac: 13, hpMin: 86,  hpMax: 100, attackBonus: 3,  dprMin: 15,  dprMax: 20,  saveDc: 13 },
  { cr: "3",   xp: 700,    pb: 2, ac: 13, hpMin: 101, hpMax: 115, attackBonus: 4,  dprMin: 21,  dprMax: 26,  saveDc: 13 },
  { cr: "4",   xp: 1100,   pb: 2, ac: 14, hpMin: 116, hpMax: 130, attackBonus: 5,  dprMin: 27,  dprMax: 32,  saveDc: 14 },
  { cr: "5",   xp: 1800,   pb: 3, ac: 15, hpMin: 131, hpMax: 145, attackBonus: 6,  dprMin: 33,  dprMax: 38,  saveDc: 15 },
  { cr: "6",   xp: 2300,   pb: 3, ac: 15, hpMin: 146, hpMax: 160, attackBonus: 6,  dprMin: 39,  dprMax: 44,  saveDc: 15 },
  { cr: "7",   xp: 2900,   pb: 3, ac: 15, hpMin: 161, hpMax: 175, attackBonus: 6,  dprMin: 45,  dprMax: 50,  saveDc: 15 },
  { cr: "8",   xp: 3900,   pb: 3, ac: 16, hpMin: 176, hpMax: 190, attackBonus: 7,  dprMin: 51,  dprMax: 56,  saveDc: 16 },
  { cr: "9",   xp: 5000,   pb: 4, ac: 16, hpMin: 191, hpMax: 205, attackBonus: 7,  dprMin: 57,  dprMax: 62,  saveDc: 16 },
  { cr: "10",  xp: 5900,   pb: 4, ac: 17, hpMin: 206, hpMax: 220, attackBonus: 7,  dprMin: 63,  dprMax: 68,  saveDc: 16 },
  { cr: "11",  xp: 7200,   pb: 4, ac: 17, hpMin: 221, hpMax: 235, attackBonus: 8,  dprMin: 69,  dprMax: 74,  saveDc: 17 },
  { cr: "12",  xp: 8400,   pb: 4, ac: 17, hpMin: 236, hpMax: 250, attackBonus: 8,  dprMin: 75,  dprMax: 80,  saveDc: 17 },
  { cr: "13",  xp: 10000,  pb: 5, ac: 18, hpMin: 251, hpMax: 265, attackBonus: 8,  dprMin: 81,  dprMax: 86,  saveDc: 18 },
  { cr: "14",  xp: 11500,  pb: 5, ac: 18, hpMin: 266, hpMax: 280, attackBonus: 8,  dprMin: 87,  dprMax: 92,  saveDc: 18 },
  { cr: "15",  xp: 13000,  pb: 5, ac: 18, hpMin: 281, hpMax: 295, attackBonus: 8,  dprMin: 93,  dprMax: 98,  saveDc: 18 },
  { cr: "16",  xp: 15000,  pb: 5, ac: 18, hpMin: 296, hpMax: 310, attackBonus: 9,  dprMin: 99,  dprMax: 104, saveDc: 18 },
  { cr: "17",  xp: 18000,  pb: 6, ac: 19, hpMin: 311, hpMax: 325, attackBonus: 10, dprMin: 105, dprMax: 110, saveDc: 19 },
  { cr: "18",  xp: 20000,  pb: 6, ac: 19, hpMin: 326, hpMax: 340, attackBonus: 10, dprMin: 111, dprMax: 116, saveDc: 19 },
  { cr: "19",  xp: 22000,  pb: 6, ac: 19, hpMin: 341, hpMax: 355, attackBonus: 10, dprMin: 117, dprMax: 122, saveDc: 19 },
  { cr: "20",  xp: 25000,  pb: 6, ac: 19, hpMin: 356, hpMax: 400, attackBonus: 10, dprMin: 123, dprMax: 140, saveDc: 19 },
  { cr: "21",  xp: 33000,  pb: 7, ac: 19, hpMin: 401, hpMax: 445, attackBonus: 11, dprMin: 141, dprMax: 158, saveDc: 20 },
  { cr: "22",  xp: 41000,  pb: 7, ac: 19, hpMin: 446, hpMax: 490, attackBonus: 11, dprMin: 159, dprMax: 176, saveDc: 20 },
  { cr: "23",  xp: 50000,  pb: 7, ac: 19, hpMin: 491, hpMax: 535, attackBonus: 11, dprMin: 177, dprMax: 194, saveDc: 20 },
  { cr: "24",  xp: 62000,  pb: 7, ac: 19, hpMin: 536, hpMax: 580, attackBonus: 11, dprMin: 195, dprMax: 212, saveDc: 21 },
  { cr: "25",  xp: 75000,  pb: 8, ac: 19, hpMin: 581, hpMax: 625, attackBonus: 12, dprMin: 213, dprMax: 230, saveDc: 21 },
  { cr: "26",  xp: 90000,  pb: 8, ac: 19, hpMin: 626, hpMax: 670, attackBonus: 12, dprMin: 231, dprMax: 248, saveDc: 21 },
  { cr: "27",  xp: 105000, pb: 8, ac: 22, hpMin: 671, hpMax: 715, attackBonus: 13, dprMin: 249, dprMax: 266, saveDc: 22 },
  { cr: "28",  xp: 120000, pb: 8, ac: 23, hpMin: 716, hpMax: 760, attackBonus: 13, dprMin: 267, dprMax: 284, saveDc: 22 },
  { cr: "29",  xp: 135000, pb: 9, ac: 23, hpMin: 761, hpMax: 805, attackBonus: 13, dprMin: 285, dprMax: 302, saveDc: 22 },
  { cr: "30",  xp: 155000, pb: 9, ac: 23, hpMin: 806, hpMax: 850, attackBonus: 13, dprMin: 303, dprMax: 320, saveDc: 23 },
];

const CR_INDEX = new Map<string, number>(CR_TABLE.map((row, i) => [row.cr, i]));

export function getCrRow(cr: string): CrRow | undefined {
  const idx = CR_INDEX.get(cr);
  return idx !== undefined ? CR_TABLE[idx] : undefined;
}

export interface ScaleCrResult {
  cr: string;
  xp: number;
  proficiencyBonus: number;
  expectedAc: number;
  hpRange: { min: number; max: number };
  attackBonus: number;
  dprRange: { min: number; max: number };
  saveDc: number;
}

export function scaleCr(cr: string): ScaleCrResult | null {
  const row = getCrRow(cr);
  if (!row) return null;
  return {
    cr: row.cr,
    xp: row.xp,
    proficiencyBonus: row.pb,
    expectedAc: row.ac,
    hpRange: { min: row.hpMin, max: row.hpMax },
    attackBonus: row.attackBonus,
    dprRange: { min: row.dprMin, max: row.dprMax },
    saveDc: row.saveDc,
  };
}

export interface CalculateCrOptions {
  hp: number;
  ac: number;
  dpr: number;
  attackBonus?: number;
  saveDc?: number;
  vulnerability?: boolean;
  resistance?: boolean;
  immunity?: boolean;
}

export interface CalculateCrResult {
  cr: string;
  xp: number;
  defensiveCr: string;
  offensiveCr: string;
  adjustedHp: number;
}

function applyHpAdjustment(
  hp: number,
  opts: Pick<CalculateCrOptions, "vulnerability" | "resistance" | "immunity">,
): number {
  if (opts.immunity) return Math.round(hp * 2);
  if (opts.resistance) return Math.round(hp * 1.5);
  if (opts.vulnerability) return Math.round(hp * 0.5);
  return hp;
}

function findHpIndex(hp: number): number {
  for (let i = 0; i < CR_TABLE.length; i++) {
    if (hp >= CR_TABLE[i].hpMin && hp <= CR_TABLE[i].hpMax) return i;
  }
  return CR_TABLE.length - 1;
}

function findDprIndex(dpr: number): number {
  for (let i = 0; i < CR_TABLE.length; i++) {
    if (dpr >= CR_TABLE[i].dprMin && dpr <= CR_TABLE[i].dprMax) return i;
  }
  // dpr of 0 falls in CR 0
  if (dpr <= 0) return 0;
  return CR_TABLE.length - 1;
}

function clampIndex(idx: number): number {
  return Math.max(0, Math.min(CR_TABLE.length - 1, idx));
}

function acModifier(baseIndex: number, monsterAc: number): number {
  const expectedAc = CR_TABLE[clampIndex(baseIndex)].ac;
  const diff = monsterAc - expectedAc;
  return Math.floor(Math.abs(diff) / 2) * Math.sign(diff);
}

function attackModifier(baseIndex: number, monsterAttack: number): number {
  const expectedAttack = CR_TABLE[clampIndex(baseIndex)].attackBonus;
  const diff = monsterAttack - expectedAttack;
  return Math.floor(Math.abs(diff) / 2) * Math.sign(diff);
}

export function calculateCr(options: CalculateCrOptions): CalculateCrResult {
  const adjustedHp = applyHpAdjustment(options.hp, options);

  // Defensive CR
  const hpIndex = findHpIndex(adjustedHp);
  const defensiveIndex = clampIndex(hpIndex + acModifier(hpIndex, options.ac));

  // Offensive CR — prefer attackBonus; fall back to saveDc approximation
  const effectiveAttack =
    options.attackBonus ?? (options.saveDc !== undefined ? options.saveDc - 8 : 0);
  const dprIndex = findDprIndex(options.dpr);
  const offensiveIndex = clampIndex(dprIndex + attackModifier(dprIndex, effectiveAttack));

  const finalIndex = clampIndex(Math.round((defensiveIndex + offensiveIndex) / 2));
  const row = CR_TABLE[finalIndex];

  return {
    cr: row.cr,
    xp: row.xp,
    defensiveCr: CR_TABLE[defensiveIndex].cr,
    offensiveCr: CR_TABLE[offensiveIndex].cr,
    adjustedHp,
  };
}
