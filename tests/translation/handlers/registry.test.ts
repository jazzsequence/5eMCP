import { describe, it, expect } from "vitest";
import { registeredHandlers, hasTypedHandler, translate } from "../../../src/translation/index.js";

describe("handler registry", () => {
  it("has spells handler registered", () => {
    expect(registeredHandlers()).toContain("spells");
  });

  it("has bestiary handler registered", () => {
    expect(registeredHandlers()).toContain("bestiary");
  });

  it("has items handler registered", () => {
    expect(registeredHandlers()).toContain("items");
  });

  it("has conditionsdiseases handler registered", () => {
    expect(registeredHandlers()).toContain("conditionsdiseases");
  });

  it("has vehicles handler registered", () => {
    expect(registeredHandlers()).toContain("vehicles");
  });

  it("has objects handler registered", () => {
    expect(registeredHandlers()).toContain("objects");
  });

  it("has trapshazards handler registered", () => {
    expect(registeredHandlers()).toContain("trapshazards");
  });

  it("has psionics handler registered", () => {
    expect(registeredHandlers()).toContain("psionics");
  });

  it("has decks handler registered", () => {
    expect(registeredHandlers()).toContain("decks");
  });

  it("has rewards handler registered", () => {
    expect(registeredHandlers()).toContain("rewards");
  });

  it("has optionalfeatures handler registered", () => {
    expect(registeredHandlers()).toContain("optionalfeatures");
  });

  it("has tables handler registered", () => {
    expect(registeredHandlers()).toContain("tables");
  });

  it("has variantrules handler registered", () => {
    expect(registeredHandlers()).toContain("variantrules");
  });

  it("hasTypedHandler returns true for spells", () => {
    expect(hasTypedHandler("spells")).toBe(true);
  });

  it("translate with spells returns an array", () => {
    const raw = { spell: [{ name: "Fireball", source: "PHB" }] };
    const result = translate("spells", raw);
    expect(Array.isArray(result)).toBe(true);
  });
});
