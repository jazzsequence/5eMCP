# 5etools-mcp

A complete D&D 5e reference and utility MCP server backed by live [5etools](https://5e.tools) data.

## What It Does

Provides every content type 5e.tools displays — spells, monsters, items, classes, backgrounds, feats, races, conditions, vehicles, traps, full sourcebook prose, full adventure text, and homebrew — plus callable DM utility tools (CR calculator, encounter builder, loot generator, CR scaling). All backed by live 5etools GitHub data, no hardcoded content.

| Feature | Coverage |
|---|---|
| Spells | Full mechanical + fluff |
| Bestiary | Full stat block + lore |
| Items | Full mechanical + fluff |
| Classes & Subclasses | Full progression + feature text |
| Backgrounds, Feats, Races | Full entries + fluff |
| Conditions, Rules, Tables | Complete |
| Vehicles, Objects, Traps, Psionics | Complete |
| Adventure prose | Full chapter/section text |
| Sourcebook prose | Full chapter text |
| Homebrew | All TheGiddyLimit/homebrew content |
| CR Calculator | DMG formula, full breakdown |
| Encounter Builder | XP budget, party-level scaling |
| Loot Generator | DMG treasure tables, resolved items |
| CR Scaling | Scale any monster to target CR |
| Any future 5etools content type | Passthrough handler — always accessible |

## Why Not Existing Solutions

| Project | Data Source | Full Coverage | Book Text | Homebrew |
|---|---|---|---|---|
| `procload/dnd-mcp` | D&D 5e API | SRD only | No | No |
| `heffrey78/dnd-mcp` | Open5e REST | SRD only | No | No |
| **`5etools-mcp`** | 5etools repos | Everything | Yes | Yes |

SRD covers roughly the Player's Handbook core. Xanathar's, Tasha's, Mordenkainen's, all published adventures, UA, homebrew — none of that exists in other solutions.

## How It Works

5e.tools is fully client-side. When `spells.html` loads, the browser fetches `data/spells/spells-phb.json` directly from GitHub and renders it in JavaScript. This server replicates that pattern server-side:

```
GitHub Contents API
  → manifest: { spells: [...], bestiary: [...], book: [...], ... }
  → SHA-keyed disk/Redis cache
  → raw.githubusercontent.com (fetch on miss)
  → translation layer (resolve {@tags}, merge fluff, normalize)
  → MCP tool response
```

The manifest is schema-agnostic and self-updating. When 5etools adds a new content type, the next manifest refresh picks it up automatically — no code change required. Unknown types run through the passthrough handler (tags resolved, internal fields stripped) and return clean JSON. Nothing is ever inaccessible.

## Quick Start

### Requirements

- Node.js ≥ 18
- A GitHub personal access token (read-only, public repos) — strongly recommended for 5000 req/hr vs 60 unauth

### Install

```bash
git clone https://github.com/your-username/5etools-mcp.git
cd 5etools-mcp
npm install
npm run build
```

### Claude Code (stdio mode)

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "5etools": {
      "command": "node",
      "args": ["/path/to/5etools-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "DEFAULT_RULESET": "2024"
      }
    }
  }
}
```

## Available Tools

### Meta Tools
| Tool | Description |
|---|---|
| `manifest_status` | Build time, file counts by type, unknown types discovered. |
| `list_sources` | All source abbreviations with content types. |
| `fetch_content` | Fetch and translate any file in the manifest by content type + file name. Universal fallback for any content type. |

### Search Tools (`*_search`)
All search tools accept `query` (name substring), `ruleset` (`"2024"` or `"2014"`), and `limit`. Results match on name, source abbreviation, pantheon/setting, and any top-level array-of-strings field in the data (e.g. `damageInflict`, `conditionInflict`, `environment`, `property` tags like `"Vst|EGW"`).

| Tool | Content |
|---|---|
| `spell_search` | Spells |
| `monster_search` | Monsters and creatures |
| `item_search` | Magic and mundane items |
| `race_search` | Playable species / races |
| `background_search` | Character backgrounds |
| `feat_search` | Feats |
| `condition_search` | Conditions and diseases |
| `vehicle_search` | Vehicles and vessels |
| `object_search` | Objects |
| `trap_search` | Traps and hazards |
| `psionic_search` | Psionic powers and disciplines |
| `deck_search` | Decks (e.g. Deck of Many Things) |
| `reward_search` | Supernatural gifts and boons |
| `optfeature_search` | Optional class features and invocations |
| `table_search` | Random tables |
| `variantrule_search` | Variant rules |
| `deity_search` | Deities and gods (searchable by pantheon/setting) |
| `language_search` | Languages |
| `skill_search` | Skills |
| `sense_search` | Senses (darkvision, tremorsense, etc.) |

### Get Tools (`*_get`)
Exact lookup by name with full fluff/description merged in. Accept `name`, optional `source`, and `ruleset`.

| Tool | Content |
|---|---|
| `spell_get` | Full spell entry with description |
| `monster_get` | Full stat block with lore |
| `item_get` | Full item entry with description |
| `race_get` | Full race entry with traits and fluff |
| `background_get` | Full background entry with fluff |
| `feat_get` | Full feat entry |

### Omnisearch
| Tool | Description |
|---|---|
| `omnisearch` | Search all 20 content types at once. Returns results tagged with `entityType`. |

Books, adventures, homebrew, and DM calculators (CR calculator, encounter builder, loot generator, CR scaling) are added in Phases 3–4.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | — | Read-only GitHub PAT. Strongly recommended. |
| `DEFAULT_RULESET` | `"2024"` | Which ruleset to use (`"2024"` or `"2014"`). |
| `MANIFEST_TTL_SECONDS` | `3600` | How often to rebuild the manifest (seconds). |
| `CACHE_DIR` | `~/.cache/5etools-mcp` | Disk cache location (local stdio mode). |

## Ruleset Support

All tools accept `ruleset: "2024" | "2014"`:

- `"2024"` → `5etools-mirror-3/5etools-src` (current rules)
- `"2014"` → `5etools-mirror-3/5etools-2014-src` (legacy rules)

## Development

```bash
npm run dev          # Run without compile step (tsx)
npm run build        # Compile TypeScript
npm run typecheck    # Type-check without emitting
npm test             # Run tests (Vitest)
npm run lint         # ESLint
```

This project uses TDD. Tests are written before implementation. See `AGENTS.md` for the full workflow including mandatory reviewer agent approval before commits.

```bash
# First-time setup: install git hooks
./.githooks/install.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      MCP Client                          │
│           (Claude Code / other AI clients)               │
└──────────────────────┬──────────────────────────────────┘
                       │ stdio
┌──────────────────────▼──────────────────────────────────┐
│               MCP Server (Node.js)                       │
│                                                          │
│  Manifest Layer    ← GitHub Contents API, 1-hour TTL     │
│  Cache Layer       ← SHA-keyed disk (local) / Redis      │
│  raw.githubusercontent.com  ← fetch on cache miss        │
│  Translation Layer ← tag resolver + typed/passthrough     │
│  Calculators       ← CR, encounter, loot, scale (Ph. 4)  │
└─────────────────────────────────────────────────────────┘
```

## Legal

5etools data is fetched live from public GitHub repositories. This server does not store or redistribute any content. The GitHub API rate limit applies. A GitHub token is required for sustained use.

Full WotC sourcebook text is available via this server. The API key gate (Phase 5) is mandatory before making the HTTP endpoint publicly accessible. Do not expose the HTTP endpoint without authentication.

Calculator logic is ported from 5etools' MIT-licensed JavaScript source.
