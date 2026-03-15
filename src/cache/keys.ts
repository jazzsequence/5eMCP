export function contentKey(sha: string): string {
  return `content:${sha}`;
}

export function manifestKey(ruleset: string): string {
  return `manifest:${ruleset}`;
}
