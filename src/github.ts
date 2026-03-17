import type { GitHubContentsItem } from "./types.js";

const GITHUB_API = "https://api.github.com";
const GITHUB_RAW = "https://raw.githubusercontent.com";

function githubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "5eMCP/0.3.0",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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

export async function fetchRaw(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": "5eMCP/0.3.0" },
  });
  if (!res.ok) {
    throw new Error(`Fetch ${res.status} GET ${url}`);
  }
  return res.json();
}

export function rawUrl(owner: string, repo: string, branch: string, path: string): string {
  return `${GITHUB_RAW}/${owner}/${repo}/${branch}/${path}`;
}
