import { z } from "zod";

export type Ruleset = "2024" | "2014";

const FALLBACK_RULESET: Ruleset = "2024";

function resolveDefaultRuleset(): Ruleset {
  const raw = process.env.DEFAULT_RULESET?.trim();
  return raw === "2014" || raw === "2024" ? raw : FALLBACK_RULESET;
}

/** The ruleset tools fall back to when a call omits `ruleset`, read once from DEFAULT_RULESET. */
export const DEFAULT_RULESET: Ruleset = resolveDefaultRuleset();

export const RulesetSchema = z.enum(["2024", "2014"]).default(DEFAULT_RULESET);

/** Shared parameter description so every tool reports the same (correct) default. */
export function rulesetDescription(verb: string): string {
  const other: Ruleset = DEFAULT_RULESET === "2024" ? "2014" : "2024";
  return `Which ruleset to ${verb}. Omit to use the configured default ("${DEFAULT_RULESET}"); pass "${other}" to override.`;
}

export const REPOS: Record<Ruleset, { owner: string; repo: string; branch: string }> = {
  "2024": { owner: "5etools-mirror-3", repo: "5etools-src", branch: "main" },
  "2014": { owner: "5etools-mirror-3", repo: "5etools-2014-src", branch: "main" },
};

export const HOMEBREW_REPO = {
  owner: "TheGiddyLimit",
  repo: "homebrew",
  branch: "master",
} as const;

export interface GitHubContentsItem {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir" | "symlink" | "submodule";
  url: string;
  download_url: string | null;
}
