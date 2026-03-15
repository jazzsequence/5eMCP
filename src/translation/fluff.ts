type FluffEntry = Record<string, unknown>;
type ContentEntry = Record<string, unknown>;

/**
 * Merges fluff entries into content entries by matching on name + source.
 * Returns new entry objects (does not mutate originals).
 * Fluff is merged under the `fluff` key.
 */
export function mergeFluffEntries(
  entries: ContentEntry[],
  fluffEntries: FluffEntry[],
): ContentEntry[] {
  const fluffIndex = new Map<string, FluffEntry>();
  for (const fluff of fluffEntries) {
    const key = `${fluff.name as string}||${fluff.source as string}`;
    fluffIndex.set(key, fluff);
  }

  return entries.map((entry) => {
    const key = `${entry.name as string}||${entry.source as string}`;
    const fluff = fluffIndex.get(key);
    if (!fluff) return { ...entry };
    return { ...entry, fluff };
  });
}
