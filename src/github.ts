import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { GitHubContentsItem } from "./types.js";

const GITHUB_API = "https://api.github.com";
const GITHUB_RAW = "https://raw.githubusercontent.com";

/** Repos whose data files can be served from a local 5etools mirror instead of
 *  GitHub, when LOCAL_BASE_URL is set. Homebrew is intentionally excluded —
 *  self-hosted 5etools mirrors don't bundle it. */
const LOCAL_MIRROR_REPOS = new Set(["5etools-src", "5etools-2014-src"]);

/** Returns true only for a token that looks like a real PAT, not an empty string
 *  or an unresolved mcpb template variable like "${user_config.github_token}". */
function isValidToken(token: string | undefined): boolean {
  return !!token && token.trim() !== "" && !token.startsWith("${");
}

function githubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "5eMCP/1.0.0",
    ...(isValidToken(token) ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Base URL of a self-hosted 5etools static mirror (e.g. "https://5e.example.com").
 *  When set, raw content for the core ruleset repos is fetched from here instead
 *  of raw.githubusercontent.com — faster, no GitHub rate limit, no token needed
 *  for this part. Manifest indexing (directory listing) still goes through the
 *  GitHub Contents API, since a static mirror has no equivalent listing endpoint
 *  (unless LOCAL_DATA_DIR is also set — see manifest/local-builder.ts). */
function localBaseUrl(): string | undefined {
  const value = process.env.LOCAL_BASE_URL;
  if (!value || value.trim() === "") return undefined;
  return value.replace(/\/+$/, "");
}

export async function fetchContents(
  owner: string,
  repo: string,
  path: string,
): Promise<GitHubContentsItem[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} GET ${url}: ${body}`);
  }
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as GitHubContentsItem[]) : [data as GitHubContentsItem];
}

/** Fetches and parses a JSON file, whether it lives on GitHub, a local HTTP
 *  mirror, or (when LOCAL_DATA_DIR indexing produced a file:// URL) directly
 *  on disk. */
export async function fetchRaw(url: string): Promise<unknown> {
  if (url.startsWith("file://")) {
    const filePath = fileURLToPath(url);
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "5eMCP/1.0.0" },
  });
  if (!res.ok) {
    throw new Error(`Fetch ${res.status} GET ${url}`);
  }
  return res.json();
}

export function rawUrl(owner: string, repo: string, branch: string, path: string): string {
  const base = localBaseUrl();
  if (base && LOCAL_MIRROR_REPOS.has(repo)) {
    return `${base}/${path}`;
  }
  return `${GITHUB_RAW}/${owner}/${repo}/${branch}/${path}`;
}
