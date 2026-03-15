type TagResolver = (tag: string, content: string) => string;

const ATK_MAP: Record<string, string> = {
  mw: "Melee Weapon Attack",
  rw: "Ranged Weapon Attack",
  ms: "Melee Spell Attack",
  rs: "Ranged Spell Attack",
  "mw,rw": "Melee or Ranged Weapon Attack",
  "ms,rs": "Melee or Ranged Spell Attack",
};

// Tags that resolve to their display name (before first |)
const REFERENCE_TAGS = new Set([
  "creature", "spell", "item", "class", "subclass", "race", "background",
  "condition", "disease", "status", "action", "feat", "reward", "vehicle",
  "object", "trap", "hazard", "skill", "sense", "table", "book", "adventure",
  "area", "variantrule", "optfeature", "psionictype", "psionic",
  "deck", "card", "char",
]);

const RESOLVERS: Record<string, TagResolver> = {
  // Formatting
  b: (_, c) => `**${c}**`,
  bold: (_, c) => `**${c}**`,
  i: (_, c) => `_${c}_`,
  italic: (_, c) => `_${c}_`,
  u: (_, c) => `__${c}__`,
  s: (_, c) => `~~${c}~~`,
  strike: (_, c) => `~~${c}~~`,
  code: (_, c) => `\`${c}\``,

  // Dice / numbers
  dice: (_, c) => c.split("|")[0],
  damage: (_, c) => c.split("|")[0],
  scaledice: (_, c) => c.split("|")[0],
  scaledamage: (_, c) => c.split("|")[0],
  d20: (_, c) => c.split("|")[0],
  hit: (_, c) => `+${c.trim()}`,
  dc: (_, c) => `DC ${c.trim()}`,
  chance: (_, c) => `${c.trim()}%`,
  recharge: (_, c) => `(Recharge ${c.trim()})`,

  // Attack types
  atk: (_, c) => ATK_MAP[c.trim()] ?? c.trim(),

  // Stripped / simplified
  filter: () => "",
  footnote: (_, c) => c.split("|")[0],
  link: (_, c) => c.split("|")[0],
  quickref: (_, c) => c.split("|")[0],
  "5etools": (_, c) => c.split("|")[0],
  coinflip: () => "(flip a coin)",
  color: (_, c) => c.split("|")[0],
  highlight: (_, c) => c.split("|")[0],
  help: (_, c) => c.split("|")[0],
  note: (_, c) => c,
  homebrew: (_, c) => c.split("|")[0],
  classFeature: (_, c) => c.split("|")[0],
  subclassFeature: (_, c) => c.split("|")[0],
  learnpsr: (_, c) => c.split("|")[0],
  itemEntry: (_, c) => c.split("|")[0],
};

// Register all reference tags with the same handler
for (const tag of REFERENCE_TAGS) {
  RESOLVERS[tag] = (_, c) => c.split("|")[0];
}

// Pattern matches {@tag content} — non-greedy, no newlines in tag
const TAG_RE = /\{@(\w+)([^}]*?)\}/g;

function resolveTag(tag: string, rest: string): string {
  const content = rest.trim();
  const resolver = RESOLVERS[tag];
  if (resolver) {
    return resolver(tag, content);
  }
  // Unknown tag — return display name (before first |)
  return content.split("|")[0];
}

export function resolveTagsInString(str: string): string {
  let result = str;
  let prev = "";
  // Iterative — handles nested tags in a single pass each iteration
  while (prev !== result) {
    prev = result;
    result = result.replace(TAG_RE, (_, tag: string, rest: string) => resolveTag(tag, rest));
  }
  return result;
}

export function resolveTagsDeep(obj: unknown): unknown {
  if (typeof obj === "string") {
    return resolveTagsInString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(resolveTagsDeep);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = resolveTagsDeep(value);
    }
    return result;
  }
  return obj;
}
