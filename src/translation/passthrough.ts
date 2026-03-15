import { resolveTagsDeep } from "./tags.js";
import { stripInternalFields } from "./strip.js";

export function passthroughTranslate(raw: unknown, fluff?: unknown): unknown {
  // Strip each part independently, then merge — avoids stripping the merged fluff key
  const strippedRaw = stripInternalFields(raw);

  let merged = strippedRaw;
  if (fluff !== null && fluff !== undefined) {
    const strippedFluff = stripInternalFields(fluff);
    // Use "fluff" (no underscore) so the field survives stripInternalFields
    if (typeof strippedRaw === "object" && strippedRaw !== null && !Array.isArray(strippedRaw)) {
      merged = { ...(strippedRaw as Record<string, unknown>), fluff: strippedFluff };
    }
  }

  return resolveTagsDeep(merged);
}
