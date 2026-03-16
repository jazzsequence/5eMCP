/**
 * Maps 5etools folder names (manifest content keys) to the JSON array key
 * found inside the data files for that folder.
 */
export const CONTENT_KEY_MAP: Record<string, string> = {
  spells: "spell",
  bestiary: "monster",
  items: "item",
  conditionsdiseases: "condition",
  vehicles: "vehicle",
  objects: "object",
  trapshazards: "trap",
  psionics: "psionic",
  decks: "deck",
  rewards: "reward",
  optionalfeatures: "optfeature",
  tables: "table",
  variantrules: "variantrule",
  races: "race",
  backgrounds: "background",
  feats: "feat",
  deities: "deity",
  languages: "language",
  skills: "skill",
  senses: "sense",
  books: "book",
  adventures: "adventure",
  class: "class",
  subclass: "subclass",
};

/**
 * Maps a content key (e.g. "spell") to the fluff array key in paired fluff files.
 * Only content types that have fluff files are listed here.
 */
export const FLUFF_KEY_MAP: Record<string, string> = {
  spell: "spellFluff",
  monster: "monsterFluff",
  item: "itemFluff",
  condition: "conditionFluff",
  vehicle: "vehicleFluff",
  object: "objectFluff",
  race: "raceFluff",
  background: "backgroundFluff",
};

/** Returns the JSON array key for a given 5etools folder name, or undefined. */
export function getContentKey(folder: string): string | undefined {
  return CONTENT_KEY_MAP[folder];
}

/** Returns the fluff JSON array key for a given content key, or undefined. */
export function getFluffKey(contentKey: string): string | undefined {
  return FLUFF_KEY_MAP[contentKey];
}
