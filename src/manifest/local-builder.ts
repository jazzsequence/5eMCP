import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ManifestFile } from "./schema.js";

function inferSource(filename: string): string | undefined {
  const base = filename.replace(/\.json$/i, "");
  const dashIdx = base.indexOf("-");
  if (dashIdx === -1) return undefined;
  return base.slice(dashIdx + 1).toUpperCase();
}

function isFluffFile(name: string): boolean {
  return name.startsWith("fluff-");
}

interface LocalEntry {
  name: string;
  fullPath: string;
  /** Path relative to the data dir root, e.g. "spells/spells-phb.json" —
   *  matches the tail of a GitHub Contents API item's "path" (minus "data/"). */
  relPath: string;
  isDir: boolean;
}

async function listDir(dataDir: string, relDir: string): Promise<LocalEntry[]> {
  const absDir = path.join(dataDir, relDir);
  const dirents = await readdir(absDir, { withFileTypes: true });
  return dirents.map((d) => ({
    name: d.name,
    fullPath: path.join(absDir, d.name),
    relPath: relDir ? `${relDir}/${d.name}` : d.name,
    isDir: d.isDirectory(),
  }));
}

/** Cheap change-indicator used in place of a GitHub blob SHA — good enough to
 *  invalidate the disk/Redis cache when a file is updated (e.g. by a `git pull`
 *  on the mirror host), without hashing file contents. */
async function versionKey(fullPath: string): Promise<string> {
  const st = await stat(fullPath);
  return `${st.mtimeMs}:${st.size}`;
}

async function toManifestFile(
  entry: LocalEntry,
  fluff: LocalEntry | undefined,
  withSource: boolean,
): Promise<ManifestFile> {
  const file: ManifestFile = {
    name: entry.name,
    path: `data/${entry.relPath}`,
    url: pathToFileURL(entry.fullPath).href,
    sha: await versionKey(entry.fullPath),
    ...(withSource ? { source: inferSource(entry.name) } : {}),
  };
  if (fluff) {
    file.fluff_url = pathToFileURL(fluff.fullPath).href;
    file.fluff_sha = await versionKey(fluff.fullPath);
  }
  return file;
}

async function buildLocalDirectoryContent(
  dataDir: string,
  relDir: string,
): Promise<ManifestFile[]> {
  const entries = await listDir(dataDir, relDir);

  const fluffIndex = new Map<string, LocalEntry>();
  for (const e of entries) {
    if (!e.isDir && e.name.endsWith(".json") && isFluffFile(e.name)) {
      fluffIndex.set(e.name.replace(/^fluff-/, ""), e);
    }
  }

  const mechanical = entries.filter(
    (e) => !e.isDir && e.name.endsWith(".json") && !isFluffFile(e.name),
  );

  return Promise.all(
    mechanical.map((e) => toManifestFile(e, fluffIndex.get(e.name), true)),
  );
}

/**
 * Builds the content manifest by scanning a local 5etools data/ directory on
 * disk instead of calling the GitHub Contents API. Used when LOCAL_DATA_DIR
 * is set (typically because the MCP server runs colocated with a self-hosted
 * 5etools mirror) — avoids GitHub rate limits entirely for core content.
 *
 * Mirrors buildManifest()'s GitHub-based walk: one level of subdirectories
 * under data/, plus flat top-level *.json files, with fluff-*.json files
 * paired to their mechanical counterpart.
 */
export async function buildLocalContent(
  dataDir: string,
): Promise<Record<string, ManifestFile[]>> {
  const content: Record<string, ManifestFile[]> = {};
  const rootEntries = await listDir(dataDir, "");

  const flatMechanical: LocalEntry[] = [];
  const flatFluffIndex = new Map<string, LocalEntry>();
  const subdirPromises: Promise<void>[] = [];

  for (const e of rootEntries) {
    if (e.isDir) {
      const dirName = e.name;
      const promise = buildLocalDirectoryContent(dataDir, e.relPath)
        .then((files) => {
          if (files.length > 0) {
            content[dirName] = files;
          }
        })
        .catch((err: unknown) => {
          console.error(`Failed to index local directory ${e.relPath}:`, err);
        });
      subdirPromises.push(promise);
    } else if (e.name.endsWith(".json")) {
      if (isFluffFile(e.name)) {
        flatFluffIndex.set(e.name.replace(/^fluff-/, ""), e);
      } else {
        flatMechanical.push(e);
      }
    }
  }

  await Promise.all(subdirPromises);

  for (const e of flatMechanical) {
    const contentType = e.name.replace(/\.json$/i, "");
    const file = await toManifestFile(e, flatFluffIndex.get(e.name), false);
    if (!content[contentType]) {
      content[contentType] = [];
    }
    content[contentType].push(file);
  }

  return content;
}
