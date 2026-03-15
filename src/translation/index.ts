import { passthroughTranslate } from "./passthrough.js";
import { createTypedHandler } from "./handlers/generic.js";
import { CONTENT_KEY_MAP, FLUFF_KEY_MAP } from "./handlers/types.js";

type Handler = (raw: unknown, fluff?: unknown) => unknown;

// Register typed handlers for all known content type folders.
// Keys are manifest folder names (e.g. "spells"), values are handlers.
const handlers: Record<string, Handler> = {};

for (const [folder, contentKey] of Object.entries(CONTENT_KEY_MAP)) {
  const fluffKey = FLUFF_KEY_MAP[contentKey];
  handlers[folder] = createTypedHandler(contentKey, fluffKey);
}

export function translate(contentType: string, raw: unknown, fluff?: unknown): unknown {
  const handler = handlers[contentType] ?? passthroughTranslate;
  return handler(raw, fluff);
}

export function hasTypedHandler(contentType: string): boolean {
  return contentType in handlers;
}

export function registeredHandlers(): string[] {
  return Object.keys(handlers);
}
