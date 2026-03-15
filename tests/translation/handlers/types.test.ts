import { describe, it, expect } from "vitest";
import {
  CONTENT_KEY_MAP,
  FLUFF_KEY_MAP,
  getContentKey,
  getFluffKey,
} from "../../../src/translation/handlers/types.js";

describe("CONTENT_KEY_MAP", () => {
  it("maps spells to spell", () => {
    expect(CONTENT_KEY_MAP["spells"]).toBe("spell");
  });

  it("maps bestiary to monster", () => {
    expect(CONTENT_KEY_MAP["bestiary"]).toBe("monster");
  });

  it("maps items to item", () => {
    expect(CONTENT_KEY_MAP["items"]).toBe("item");
  });

  it("maps conditionsdiseases to condition", () => {
    expect(CONTENT_KEY_MAP["conditionsdiseases"]).toBe("condition");
  });

  it("maps vehicles to vehicle", () => {
    expect(CONTENT_KEY_MAP["vehicles"]).toBe("vehicle");
  });

  it("maps objects to object", () => {
    expect(CONTENT_KEY_MAP["objects"]).toBe("object");
  });

  it("maps trapshazards to trap", () => {
    expect(CONTENT_KEY_MAP["trapshazards"]).toBe("trap");
  });

  it("maps psionics to psionic", () => {
    expect(CONTENT_KEY_MAP["psionics"]).toBe("psionic");
  });

  it("maps decks to deck", () => {
    expect(CONTENT_KEY_MAP["decks"]).toBe("deck");
  });

  it("maps rewards to reward", () => {
    expect(CONTENT_KEY_MAP["rewards"]).toBe("reward");
  });

  it("maps optionalfeatures to optfeature", () => {
    expect(CONTENT_KEY_MAP["optionalfeatures"]).toBe("optfeature");
  });

  it("maps tables to table", () => {
    expect(CONTENT_KEY_MAP["tables"]).toBe("table");
  });

  it("maps variantrules to variantrule", () => {
    expect(CONTENT_KEY_MAP["variantrules"]).toBe("variantrule");
  });
});

describe("FLUFF_KEY_MAP", () => {
  it("maps spell to spellFluff", () => {
    expect(FLUFF_KEY_MAP["spell"]).toBe("spellFluff");
  });

  it("maps monster to monsterFluff", () => {
    expect(FLUFF_KEY_MAP["monster"]).toBe("monsterFluff");
  });

  it("maps item to itemFluff", () => {
    expect(FLUFF_KEY_MAP["item"]).toBe("itemFluff");
  });

  it("maps condition to conditionFluff", () => {
    expect(FLUFF_KEY_MAP["condition"]).toBe("conditionFluff");
  });

  it("maps vehicle to vehicleFluff", () => {
    expect(FLUFF_KEY_MAP["vehicle"]).toBe("vehicleFluff");
  });

  it("maps object to objectFluff", () => {
    expect(FLUFF_KEY_MAP["object"]).toBe("objectFluff");
  });
});

describe("getContentKey", () => {
  it("returns the array key for a known folder", () => {
    expect(getContentKey("spells")).toBe("spell");
  });

  it("returns undefined for unknown folder", () => {
    expect(getContentKey("unknown")).toBeUndefined();
  });
});

describe("getFluffKey", () => {
  it("returns the fluff array key for a content key with fluff", () => {
    expect(getFluffKey("monster")).toBe("monsterFluff");
  });

  it("returns undefined for content key without fluff", () => {
    expect(getFluffKey("trap")).toBeUndefined();
  });
});
