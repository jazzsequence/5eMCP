import { passthroughTranslate } from "./passthrough.js";

type Handler = (raw: unknown, fluff?: unknown) => unknown;

// Populated as typed handlers are added in Phase 2+
const handlers: Record<string, Handler> = {};

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
