import { describe, it, expect } from "vitest";
import { getCrRow, calculateCr, scaleCr } from "../../src/calculators/cr.js";

describe("getCrRow", () => {
  it("returns data for integer CRs", () => {
    const row = getCrRow("5");
    expect(row).toBeDefined();
    expect(row?.cr).toBe("5");
    expect(row?.xp).toBe(1800);
    expect(row?.pb).toBe(3);
    expect(row?.ac).toBe(15);
    expect(row?.hpMin).toBe(131);
    expect(row?.hpMax).toBe(145);
    expect(row?.attackBonus).toBe(6);
    expect(row?.dprMin).toBe(33);
    expect(row?.dprMax).toBe(38);
    expect(row?.saveDc).toBe(15);
  });

  it("returns data for fractional CRs", () => {
    const quarter = getCrRow("1/4");
    expect(quarter).toBeDefined();
    expect(quarter?.cr).toBe("1/4");
    expect(quarter?.xp).toBe(50);

    const half = getCrRow("1/2");
    expect(half).toBeDefined();
    expect(half?.cr).toBe("1/2");
    expect(half?.xp).toBe(100);

    const eighth = getCrRow("1/8");
    expect(eighth).toBeDefined();
    expect(eighth?.cr).toBe("1/8");
    expect(eighth?.xp).toBe(25);
  });

  it("returns data for CR 0", () => {
    const row = getCrRow("0");
    expect(row).toBeDefined();
    expect(row?.xp).toBe(10);
  });

  it("returns data for CR 30", () => {
    const row = getCrRow("30");
    expect(row).toBeDefined();
    expect(row?.xp).toBe(155000);
  });

  it("returns undefined for unknown CR", () => {
    expect(getCrRow("99")).toBeUndefined();
    expect(getCrRow("invalid")).toBeUndefined();
    expect(getCrRow("1/3")).toBeUndefined();
  });
});

describe("scaleCr", () => {
  it("returns stat ranges for a valid integer CR", () => {
    const result = scaleCr("5");
    expect(result).not.toBeNull();
    expect(result?.cr).toBe("5");
    expect(result?.xp).toBe(1800);
    expect(result?.proficiencyBonus).toBe(3);
    expect(result?.expectedAc).toBe(15);
    expect(result?.hpRange).toEqual({ min: 131, max: 145 });
    expect(result?.attackBonus).toBe(6);
    expect(result?.dprRange).toEqual({ min: 33, max: 38 });
    expect(result?.saveDc).toBe(15);
  });

  it("returns stat ranges for a fractional CR", () => {
    const result = scaleCr("1/2");
    expect(result).not.toBeNull();
    expect(result?.cr).toBe("1/2");
    expect(result?.xp).toBe(100);
    expect(result?.proficiencyBonus).toBe(2);
  });

  it("returns null for invalid CR", () => {
    expect(scaleCr("invalid")).toBeNull();
    expect(scaleCr("99")).toBeNull();
  });
});

describe("calculateCr", () => {
  it("calculates CR for a goblin-like creature", () => {
    // HP 7 (CR 1/8 range), AC 15 (+1 from expected 13), DPR 5 (CR 1/4), attack +4 (+1 from expected +3)
    const result = calculateCr({ hp: 7, ac: 15, dpr: 5, attackBonus: 4 });
    expect(result.cr).toBe("1/4");
    expect(result.defensiveCr).toBe("1/4");
    expect(result.offensiveCr).toBe("1/4");
    expect(result.adjustedHp).toBe(7);
  });

  it("calculates CR for a mid-range creature", () => {
    // HP 138 (CR 5 range), AC 15 (exactly expected), DPR 35 (CR 5), attack +6 (exactly expected)
    const result = calculateCr({ hp: 138, ac: 15, dpr: 35, attackBonus: 6 });
    expect(result.cr).toBe("5");
    expect(result.xp).toBe(1800);
  });

  it("raises effective HP for immune creature", () => {
    // HP 78, immunity → adjusted HP 156 (×2)
    const result = calculateCr({ hp: 78, ac: 13, dpr: 11, attackBonus: 3, immunity: true });
    expect(result.adjustedHp).toBe(156);
    // Immunity raises effective HP significantly — CR should be higher than without immunity
    const baseline = calculateCr({ hp: 78, ac: 13, dpr: 11, attackBonus: 3 });
    const baselineIndex = crToNumeric(baseline.cr);
    const immuneIndex = crToNumeric(result.cr);
    expect(immuneIndex).toBeGreaterThan(baselineIndex);
  });

  it("raises effective HP for resistant creature", () => {
    // HP 100, resistance → adjusted HP 150 (×1.5)
    const result = calculateCr({ hp: 100, ac: 13, dpr: 20, attackBonus: 3, resistance: true });
    expect(result.adjustedHp).toBe(150);
    const baseline = calculateCr({ hp: 100, ac: 13, dpr: 20, attackBonus: 3 });
    const baselineNumeric = crToNumeric(baseline.cr);
    const resistNumeric = crToNumeric(result.cr);
    expect(resistNumeric).toBeGreaterThanOrEqual(baselineNumeric);
  });

  it("lowers effective HP for vulnerable creature", () => {
    // HP 100, vulnerability → adjusted HP 50 (×0.5)
    const result = calculateCr({ hp: 100, ac: 13, dpr: 20, attackBonus: 3, vulnerability: true });
    expect(result.adjustedHp).toBe(50);
    const baseline = calculateCr({ hp: 100, ac: 13, dpr: 20, attackBonus: 3 });
    const baselineNumeric = crToNumeric(baseline.cr);
    const vulnNumeric = crToNumeric(result.cr);
    expect(vulnNumeric).toBeLessThanOrEqual(baselineNumeric);
  });

  it("uses saveDc when attackBonus is not provided", () => {
    // saveDc 13 corresponds to expected attack for lower CRs
    const result = calculateCr({ hp: 78, ac: 13, dpr: 11, saveDc: 13 });
    expect(result).toBeDefined();
    expect(result.cr).toBeTruthy();
  });

  it("clamps CR to valid range (does not go below CR 0 or above CR 30)", () => {
    // Absurdly weak creature
    const weak = calculateCr({ hp: 1, ac: 5, dpr: 0, attackBonus: 0 });
    expect(weak.cr).toBe("0");

    // Absurdly strong creature
    const strong = calculateCr({ hp: 9999, ac: 30, dpr: 500, attackBonus: 20 });
    expect(strong.cr).toBe("30");
  });

  it("returns the expected XP for the computed CR", () => {
    const result = calculateCr({ hp: 138, ac: 15, dpr: 35, attackBonus: 6 });
    const row = getCrRow(result.cr);
    expect(result.xp).toBe(row?.xp);
  });
});

/** Helper for comparing relative CR values in tests */
function crToNumeric(cr: string): number {
  if (cr === "0") return 0;
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  return parseFloat(cr);
}
