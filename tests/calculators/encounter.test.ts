import { describe, it, expect } from "vitest";
import { buildEncounter, getCrXp } from "../../src/calculators/encounter.js";

describe("getCrXp", () => {
  it("returns correct XP for integer CRs", () => {
    expect(getCrXp("1")).toBe(200);
    expect(getCrXp("5")).toBe(1800);
    expect(getCrXp("10")).toBe(5900);
  });

  it("returns correct XP for fractional CRs", () => {
    expect(getCrXp("0")).toBe(10);
    expect(getCrXp("1/8")).toBe(25);
    expect(getCrXp("1/4")).toBe(50);
    expect(getCrXp("1/2")).toBe(100);
  });

  it("returns 0 for unknown CR", () => {
    expect(getCrXp("99")).toBe(0);
    expect(getCrXp("invalid")).toBe(0);
  });
});

describe("buildEncounter (2014 ruleset)", () => {
  it("calculates medium difficulty for 4 level-3 party vs 2 CR-1 monsters", () => {
    // Each CR 1 = 200 XP; 2 monsters × 1.5 = 600 adjusted XP
    // Level 3 thresholds: easy=75, medium=150, hard=225, deadly=400 per player
    // Party totals: easy=300, medium=600, hard=900, deadly=1600
    // 600 >= medium(600) and < hard(900) → medium
    const result = buildEncounter({
      partyLevels: [3, 3, 3, 3],
      monsterCrs: ["1", "1"],
      ruleset: "2014",
    });
    expect(result.difficulty).toBe("medium");
    expect(result.totalXp).toBe(400);
    expect(result.multiplier).toBe(1.5);
    expect(result.adjustedXp).toBe(600);
    expect(result.monsterCount).toBe(2);
    expect(result.partySize).toBe(4);
    expect(result.ruleset).toBe("2014");
  });

  it("calculates easy difficulty", () => {
    // 4 × L5 party: easy=1000, medium=2000. 1 CR 5 monster = 1800 XP × 1 = 1800 → easy
    const result = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["5"],
      ruleset: "2014",
    });
    expect(result.difficulty).toBe("easy");
    expect(result.totalXp).toBe(1800);
    expect(result.multiplier).toBe(1);
  });

  it("calculates deadly difficulty", () => {
    // 4 × L1 party: deadly=400, deadly×2=800. 2 CR-1 monsters = 400 XP × 1.5 = 600 → deadly
    const result = buildEncounter({
      partyLevels: [1, 1, 1, 1],
      monsterCrs: ["1", "1"],
      ruleset: "2014",
    });
    expect(result.difficulty).toBe("deadly");
    expect(result.adjustedXp).toBe(600);
  });

  it("calculates trivial when XP is below easy threshold", () => {
    // 4 × L5 party: easy=1000. 1 CR 0 monster = 10 XP × 1 = 10 → trivial
    const result = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["0"],
      ruleset: "2014",
    });
    expect(result.difficulty).toBe("trivial");
  });

  it("uses monster count multiplier correctly", () => {
    // Use a party of 4 to avoid party-size adjustments
    // 1 monster → multiplier 1
    const one = buildEncounter({ partyLevels: [5, 5, 5, 5], monsterCrs: ["5"], ruleset: "2014" });
    expect(one.multiplier).toBe(1);

    // 2 monsters → multiplier 1.5
    const two = buildEncounter({ partyLevels: [5, 5, 5, 5], monsterCrs: ["5", "5"], ruleset: "2014" });
    expect(two.multiplier).toBe(1.5);

    // 4 monsters → multiplier 2
    const four = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["1", "1", "1", "1"],
      ruleset: "2014",
    });
    expect(four.multiplier).toBe(2);

    // 8 monsters → multiplier 2.5
    const eight = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["1", "1", "1", "1", "1", "1", "1", "1"],
      ruleset: "2014",
    });
    expect(eight.multiplier).toBe(2.5);
  });

  it("includes all 4 difficulty thresholds", () => {
    const result = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["1"],
      ruleset: "2014",
    });
    expect(result.thresholds).toHaveProperty("easy");
    expect(result.thresholds).toHaveProperty("medium");
    expect(result.thresholds).toHaveProperty("hard");
    expect(result.thresholds).toHaveProperty("deadly");
    // Level 5 per-player: easy=250, medium=500, hard=750, deadly=1100 × 4 players
    expect(result.thresholds.easy).toBe(1000);
    expect(result.thresholds.medium).toBe(2000);
    expect(result.thresholds.hard).toBe(3000);
    expect(result.thresholds.deadly).toBe(4400);
  });

  it("defaults to 2014 ruleset when not specified", () => {
    const result = buildEncounter({
      partyLevels: [3, 3, 3, 3],
      monsterCrs: ["1", "1"],
    });
    expect(result.ruleset).toBe("2014");
  });
});

describe("buildEncounter (2024 ruleset)", () => {
  it("calculates low difficulty for 4 level-5 party vs 3 CR-3 monsters", () => {
    // CR 3 = 700 XP × 3 = 2100 total (no multiplier in 2024)
    // Level 5 thresholds (per player): low=500, moderate=750, high=1100
    // Party total: low=2000, moderate=3000, high=4400
    // 2100 >= low(2000) and < moderate(3000) → low
    const result = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["3", "3", "3"],
      ruleset: "2024",
    });
    expect(result.difficulty).toBe("low");
    expect(result.totalXp).toBe(2100);
    expect(result.adjustedXp).toBe(2100);
    expect(result.multiplier).toBeUndefined();
    expect(result.ruleset).toBe("2024");
  });

  it("has no multiplier in 2024 mode", () => {
    const result = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["3", "3", "3", "3", "3", "3", "3", "3"],
      ruleset: "2024",
    });
    expect(result.multiplier).toBeUndefined();
  });

  it("uses low/moderate/high thresholds in 2024 mode", () => {
    const result = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["1"],
      ruleset: "2024",
    });
    expect(result.thresholds).toHaveProperty("low");
    expect(result.thresholds).toHaveProperty("moderate");
    expect(result.thresholds).toHaveProperty("high");
    expect(result.thresholds).not.toHaveProperty("easy");
    expect(result.thresholds).not.toHaveProperty("deadly");
  });

  it("calculates trivial when below low threshold", () => {
    // 4 × L5: low=2000. 1 CR 0 = 10 XP → trivial
    const result = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["0"],
      ruleset: "2024",
    });
    expect(result.difficulty).toBe("trivial");
  });

  it("calculates high difficulty", () => {
    // 4 × L5: high=4400. need XP >= 4400
    // CR 5 = 1800 XP × 3 = 5400 → above high → deadly/absurd? → "high" or above
    const result = buildEncounter({
      partyLevels: [5, 5, 5, 5],
      monsterCrs: ["5", "5", "5"],
      ruleset: "2024",
    });
    // 5400 >= high(4400) → at least "high"
    expect(["high", "absurd"]).toContain(result.difficulty);
  });
});
