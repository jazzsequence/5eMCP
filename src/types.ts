export type Ruleset = "2024" | "2014";

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
