import type { Ruleset } from "../types.js";

export interface ManifestFile {
  name: string;
  path: string;
  url: string;
  sha: string;
  source?: string;
  fluff_url?: string;
  fluff_sha?: string;
}

export interface Manifest {
  ruleset: Ruleset;
  built_at: number;
  content: Record<string, ManifestFile[]>;
  homebrew: Record<string, ManifestFile[]>;
}
