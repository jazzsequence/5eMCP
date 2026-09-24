/**
 * Maps 5etools folder names (manifest content keys) to the JSON array key(s)
 * found inside the data files for that folder. Most files hold a single array;
 * a few (conditionsdiseases, trapshazards) hold multiple sibling arrays that
 * all need to be searched.
 */
export const CONTENT_KEY_MAP: Record<string, string | string[]> = {
  spells: "spell",
  bestiary: "monster",
  items: "item",
  conditionsdiseases: ["condition", "disease", "status"],
  vehicles: "vehicle",
  objects: "object",
  trapshazards: ["trap", "hazard"],
  psionics: "psionic",
  decks: "deck",
  rewards: "reward",
  optionalfeatures: "optionalfeature",
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
  // class features and subclass features are embedded in class files
  classfeatures: "classFeature",
  subclassfeatures: "subclassFeature",
};

/**
 * Maps content type folder names to the manifest folder where their files live.
 * Most types are stored in their own folder, but class-related subtypes are
 * embedded in class files rather than having their own files.
 */
export const MANIFEST_FOLDER_MAP: Record<string, string> = {
  subclass: "class",
  classfeatures: "class",
  subclassfeatures: "class",
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

/**
 * Returns the primary JSON array key for a given 5etools folder name, or undefined.
 * For folders with multiple sibling arrays, returns the first (primary) one —
 * use getContentKeys to get all of them.
 */
export function getContentKey(folder: string): string | undefined {
  const value = CONTENT_KEY_MAP[folder];
  return Array.isArray(value) ? value[0] : value;
}

/** Returns all JSON array keys for a given 5etools folder name (empty array if unknown). */
export function getContentKeys(folder: string): string[] {
  const value = CONTENT_KEY_MAP[folder];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Returns the fluff JSON array key for a given content key, or undefined. */
export function getFluffKey(contentKey: string): string | undefined {
  return FLUFF_KEY_MAP[contentKey];
}

/**
 * Returns the manifest folder where files for this content type live.
 * Most types use their own folder; class subtypes (subclass, classfeatures,
 * subclassfeatures) are embedded in class files.
 */
export function getManifestFolder(contentTypeFolder: string): string {
  return MANIFEST_FOLDER_MAP[contentTypeFolder] ?? contentTypeFolder;
}
