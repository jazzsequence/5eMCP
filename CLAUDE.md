# 5eMCP — Claude Instructions

## Project Overview

`5eMCP` is a Model Context Protocol server providing comprehensive access to D&D 5e content — spells, monsters, items, classes, full sourcebook prose, adventure text, homebrew, and callable DM utility tools — backed by live 5etools GitHub data. No API key required; files are the API.

**Core design principle:** Manifest-driven, pointer-based resolution. A lightweight dynamic index of everything in the 5etools repos is built from the GitHub Contents API. Content is never stored — when a tool is called, the server locates the file in the manifest, fetches only what is needed, runs it through the translation layer, and returns clean structured output.

## Tech Stack

- **Runtime:** Node.js 24 (native fetch, ESM)
- **Language:** TypeScript 5.x, strict mode, ESM (`"type": "module"`)
- **Module resolution:** Node16 (requires `.js` extensions in imports)
- **MCP SDK:** `@modelcontextprotocol/sdk` — `McpServer` + `StdioServerTransport`
- **Validation:** Zod
- **Testing:** Vitest
- **Linting:** ESLint + `@typescript-eslint`
- **Cache:** Disk (local stdio mode) / Redis (Pantheon HTTP mode)
- **Data sources:** `raw.githubusercontent.com`, GitHub Contents API

## Commands

```bash
npm run build        # Compile TypeScript → dist/
npm run typecheck    # Type-check without emitting
npm run dev          # Run directly with tsx (no compile step)
npm test             # Run Vitest tests (all)
npm run test:watch   # Vitest in watch mode
npm run lint         # ESLint
```

## Project Structure

```
src/
├── index.ts                  # Entry — stdio mode (HTTP in Phase 5)
├── server.ts                 # McpServer, tool registration
├── github.ts                 # GitHub Contents API + raw fetch
├── types.ts                  # Shared types (Ruleset, GitHubContentsItem, repos)
├── manifest/
│   ├── schema.ts             # ManifestFile, Manifest interfaces
│   ├── builder.ts            # GitHub Contents API → Manifest (schema-agnostic)
│   └── refresh.ts            # 1-hour TTL refresh loop + in-memory cache
├── cache/
│   ├── index.ts              # Disk cache (local) — SHA-keyed JSON files
│   └── keys.ts               # contentKey(sha), manifestKey(ruleset)
├── translation/
│   ├── index.ts              # Handler dispatch: typed handler or passthrough
│   ├── tags.ts               # {@tag} recursive resolver
│   ├── strip.ts              # Internal 5etools field stripper
│   ├── passthrough.ts        # Generic unknown-type handler
│   └── handlers/             # One typed handler per known content type (Phase 2+)
├── tools/
│   ├── meta.ts               # manifest_status, list_sources (Phase 1)
│   └── passthrough.ts        # fetch_content (Phase 1)
└── calculators/              # Ported 5etools DM tools (Phase 4)
```

## Implementation Phases

- **Phase 1 (done):** Manifest core + universal passthrough. Every content type accessible via `fetch_content`.
- **Phase 2 (done):** Typed search/get tools for all 22 content types, multi-field search, structured filters (level, school, cr_max, type, rarity, environment), fields projection, omnisearch.
- **Phase 3 (done):** Books/adventures index tools, homebrew search (include_homebrew flag), Redis cache (gated on REDIS_URL, falls back to disk).
- **Phase 4 (current):** Callable DM tools (CR calculator, encounter builder, loot generator, CR scaling)
- **Phase 5 (in progress):** Express HTTP transport + Pantheon deploy. HTTP placeholder live; real MCP-over-HTTP transport pending.

## Key Design Rules

- **Manifest is schema-agnostic.** `content: Record<string, ManifestFile[]>` — new 5etools content types appear automatically on next refresh. No code change required.
- **SHA-keyed cache.** Cache keys are GitHub blob SHAs, not filenames. Content that hasn't changed is never re-fetched.
- **Passthrough guarantee.** Unknown content types always run through the passthrough handler (resolve `{@tags}`, strip internal fields, return clean JSON). Nothing is ever inaccessible.
- **Translation is stateless.** The translation layer has no awareness of manifest or cache. Pure functions only.
- **Tools are thin wrappers.** Parameter validation and response formatting only. All data logic lives in manifest/cache/translation layers.
- **`.js` extensions required** in all TypeScript ESM imports (e.g., `import { foo } from "./bar.js"`).

## Environment Variables

```bash
GITHUB_TOKEN              # Read-only PAT (5000 req/hr vs 60 unauth) — strongly recommended
DEFAULT_RULESET           # "2024" (default) or "2014"
MANIFEST_TTL_SECONDS      # 3600 (default — 1 hour)
CACHE_DIR                 # ~/.cache/5eMCP (default)
```

## Data Sources

| Repo | Ruleset | Contents |
|---|---|---|
| `5etools-mirror-3/5etools-src` | 2024 | Full mechanical data, fluff, books, adventures |
| `5etools-mirror-3/5etools-2014-src` | 2014 | Full mechanical data, fluff, books, adventures |
| `TheGiddyLimit/homebrew` | Both | Community homebrew by content type |

## Development Workflow

This project uses **Test-Driven Development (TDD)** and **mandatory reviewer agent approval** before every commit of AI-generated code.

### TDD Rules

1. **Write tests BEFORE implementation.** No implementation code without a failing test first.
2. Tests live in `tests/` (mirroring `src/` structure).
3. Test files are named `*.test.ts`.
4. All tests must pass before committing.

### Pre-Commit Checklist (enforced by hooks)

Before ANY commit of AI-generated code:

1. `npm run typecheck` — zero type errors
2. `npm run lint` — zero lint errors
3. `npm run build` — compiles successfully
4. `npm test` — all tests pass
5. Spawn reviewer agent → get APPROVE
6. Commit within 5 minutes of approval

### Manual Commits (your own changes)

```bash
USER_COMMIT=1 git commit -m "Your message"
```

### Install Hooks (first time / new clone)

```bash
./.githooks/install.sh
```

## Claude Code Local Config

Add to `~/.claude.json` (or project `.claude.json`):

```json
{
  "mcpServers": {
    "5etools": {
      "command": "node",
      "args": ["/path/to/5eMCP/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "DEFAULT_RULESET": "2024"
      }
    }
  }
}
```
