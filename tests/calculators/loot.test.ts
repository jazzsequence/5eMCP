import { describe, it, expect } from "vitest";
import { evalDiceAvg, generateLoot } from "../../src/calculators/loot.js";

describe("evalDiceAvg", () => {
  it("evaluates simple dice expressions", () => {
    // 1d6 → avg 3.5 → Math.round = 4
    expect(evalDiceAvg("1d6")).toBe(4);
    // 3d6 → avg 10.5 → Math.round = 11
    expect(evalDiceAvg("3d6")).toBe(11);
    // 5d6 → avg 17.5 → Math.round = 18
    expect(evalDiceAvg("5d6")).toBe(18);
    // 4d6 → avg 14.0 → 14
    expect(evalDiceAvg("4d6")).toBe(14);
  });

  it("evaluates dice with multiplier", () => {
    // 4d6*100 → Math.round(4 × 3.5) × 100 = 14 × 100 = 1400
    expect(evalDiceAvg("4d6*100")).toBe(1400);
    // 2d6*1000 → Math.round(2 × 3.5) × 1000 = 7 × 1000 = 7000
    expect(evalDiceAvg("2d6*1000")).toBe(7000);
    // 1d6*10 → Math.round(3.5) × 10 = 4 × 10 = 40
    expect(evalDiceAvg("1d6*10")).toBe(40);
    // 6d6*10 → Math.round(21) × 10 = 210
    expect(evalDiceAvg("6d6*10")).toBe(210);
    // 8d6*100 → Math.round(28) × 100 = 2800
    expect(evalDiceAvg("8d6*100")).toBe(2800);
  });

  it("evaluates different die sizes", () => {
    // 1d4 → avg 2.5 → 3
    expect(evalDiceAvg("1d4")).toBe(3);
    // 1d8 → avg 4.5 → 5
    expect(evalDiceAvg("1d8")).toBe(5);
    // 2d10 → avg 11 → 11
    expect(evalDiceAvg("2d10")).toBe(11);
  });

  it("returns 0 for invalid expressions", () => {
    expect(evalDiceAvg("invalid")).toBe(0);
    expect(evalDiceAvg("")).toBe(0);
    expect(evalDiceAvg("5")).toBe(0);
  });
});

describe("generateLoot", () => {
  it("returns loot for CR 0 (Challenge 0-4 bracket)", () => {
    const result = generateLoot("0");
    expect(result).not.toBeNull();
    expect(result?.bracket).toContain("0");
    expect(result?.table).toBeInstanceOf(Array);
    expect(result?.table.length).toBeGreaterThan(0);
  });

  it("returns loot for CR 1/4 (Challenge 0-4 bracket)", () => {
    const result = generateLoot("1/4");
    expect(result).not.toBeNull();
    expect(result?.cr).toBe("1/4");
    expect(result?.bracket).toContain("0");
  });

  it("returns loot for CR 5 (Challenge 5-10 bracket)", () => {
    const result = generateLoot("5");
    expect(result).not.toBeNull();
    expect(result?.cr).toBe("5");
    expect(result?.bracket).toContain("5");
  });

  it("returns loot for CR 12 (Challenge 11-16 bracket)", () => {
    const result = generateLoot("12");
    expect(result).not.toBeNull();
    expect(result?.bracket).toContain("11");
  });

  it("returns loot for CR 20 (Challenge 17+ bracket)", () => {
    const result = generateLoot("20");
    expect(result).not.toBeNull();
    expect(result?.bracket).toContain("17");
  });

  it("each table row has required fields", () => {
    const result = generateLoot("1");
    expect(result).not.toBeNull();
    for (const row of result!.table) {
      expect(row).toHaveProperty("range");
      expect(row.range).toHaveProperty("min");
      expect(row.range).toHaveProperty("max");
      expect(row).toHaveProperty("probability");
      expect(row.probability).toBeGreaterThan(0);
      expect(row.probability).toBeLessThanOrEqual(100);
      expect(row).toHaveProperty("coins");
    }
  });

  it("table rows cover the full d100 range", () => {
    const result = generateLoot("1");
    expect(result).not.toBeNull();
    const total = result!.table.reduce(
      (sum, row) => sum + (row.range.max - row.range.min + 1),
      0,
    );
    expect(total).toBe(100);
  });

  it("coin values are positive integers (averages)", () => {
    const result = generateLoot("1");
    for (const row of result!.table) {
      for (const [, amount] of Object.entries(row.coins)) {
        expect(amount).toBeGreaterThan(0);
        expect(Number.isInteger(amount)).toBe(true);
      }
    }
  });

  it("returns null for unknown CR", () => {
    expect(generateLoot("99")).toBeNull();
    expect(generateLoot("invalid")).toBeNull();
  });

  it("accepts numeric CR values", () => {
    const result = generateLoot(5);
    expect(result).not.toBeNull();
    expect(result?.cr).toBe("5");
  });
});
