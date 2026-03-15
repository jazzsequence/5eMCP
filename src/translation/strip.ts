// Fields used by 5etools internally for rendering — not meaningful to an agent
const INTERNAL_FIELDS = new Set([
  "_isMixed",
  "_displayName",
  "_copy",
  "_versions",
  "_mod",
  "_preserve",
  "_rawName",
  "_isEnhanced",
  "_dpt",
  "_isBaseClass",
  "_isOptionalfeature",
]);

export function stripInternalFields(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(stripInternalFields);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (INTERNAL_FIELDS.has(key) || key.startsWith("_")) {
        continue;
      }
      result[key] = stripInternalFields(value);
    }
    return result;
  }
  return obj;
}
