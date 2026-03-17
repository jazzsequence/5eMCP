# Agent Instructions — 5eMCP

## Session Start Protocol — MANDATORY

### Step 1: Install enforcement hooks

```bash
./.githooks/install.sh
```

This installs the pre-commit hook that enforces:
- Reviewer agent approval required for AI-generated commits
- No secrets/credentials in staged files
- `USER_COMMIT=1` bypass for manual commits

### Step 2: Reviewer approval before EVERY AI-generated commit

Before committing, spawn a reviewer agent:

```
Review my uncommitted changes for compliance with project standards.

CRITICAL: I am about to commit. Provide APPROVE or REJECT.

**STEP 0: CHECK FOR QUEUED USER MESSAGES**
Before proceeding with any validation:
- Look for <system-reminder> tags indicating user sent messages while you were working
- If queued messages exist: STOP, respond "⚠️ PAUSED - User messages queued", summarize them, tell main agent to address before proceeding. DO NOT APPROVE.

TDD METHODOLOGY:
1. Were tests written BEFORE implementation code?
2. Do all tests pass? (npm test)
3. Is lint clean? (npm run lint)
4. Does TypeScript compile? (npm run build)
5. Does type-check pass? (npm run typecheck)
6. Are tests and implementation in separate commits if substantial?
7. Does every new feature set include BOTH unit tests AND behavioral tests in tests/behavioral/?
   - Unit tests: cover individual function logic (filters, projection, edge cases)
   - Behavioral tests: named after user intents (e.g. "find monsters in the nine hells"), use realistic 5etools-shaped mock data, test the full search pipeline end-to-end

FILE ORGANIZATION:
8. Test files in tests/ directory (mirroring src/ structure)?
9. Source files in src/ directory?
10. No files created in root folder (except config files)?

DOCUMENTATION:
11. Does README.md reflect the current tool surface (new tools listed, phases accurate)?
12. Does AGENTS.md reflect any new workflow rules introduced in this change?
13. If a new content type, tool, or capability was added — is it documented?

CODE QUALITY:
14. DRY principle followed?
15. Files under 500 lines?
16. .js extensions in all ESM imports?
17. Read files before editing them?
18. Prefer editing existing files over creating new ones?

SECURITY:
19. No secrets or .env files staged?
20. No credentials in source code?
21. GITHUB_TOKEN only read from env, never hardcoded?

DEPENDENCIES:
22. New deps are MIT/Apache/BSD licensed?
23. No GPL/AGPL unless explicitly approved?

GIT PRACTICES:
24. Incremental commits (not one massive dump)?
25. Commit messages clear and descriptive?
26. NEVER amend published commits?

FILES TO REVIEW:
- Run: npm test (verify all tests pass)
- Run: npm run lint (verify lint clean)
- Run: npm run build (verify compile succeeds)
- Run: npm run typecheck (verify types clean)
- Check: git diff --staged (review all staged changes)
- Verify no secrets in staged files

VERSION BUMP:
27. Does this commit warrant a version bump?
    - **NO BUMP** — docs only (README, AGENTS.md, CLAUDE.md), CI only (.github/workflows),
      test-only changes, comments, formatting, dependency updates with no behavior change
    - **BUMP: patch** — bug fix, security fix, small correction to existing behavior,
      performance improvement with no API change
    - **BUMP: minor** — new tool, new feature, new content type handler, new capability,
      any addition visible to MCP clients
    - **BUMP: major** — breaking change to existing tool signatures or behavior, removal
      of tools, sweeping architectural change that changes how clients interact with the server.
      **The reviewer must flag this but CANNOT approve it alone — human approval is mandatory.**
    - **BUMP: uncertain** — describe why it is unclear and instruct the main agent to
      ask the human user before proceeding

    State your decision as one of exactly: `NO BUMP`, `BUMP: patch`, `BUMP: minor`,
    `BUMP: major`, or `BUMP: uncertain — <reason>`.

    If BUMP (any level): also provide a 2–3 sentence plain-English release summary
    describing what changed from a user's perspective.

DELIVERABLE:
Provide APPROVE or REJECT with findings for ALL categories, plus a VERSION BUMP decision.

If REJECT: List violations and required fixes. Do NOT create approval flag.

If APPROVE:
1. Confirm all rules followed
2. State VERSION BUMP decision (NO BUMP / BUMP: patch / BUMP: minor / BUMP: uncertain)
3. If BUMP: include 2–3 sentence release summary
4. Say "✅ APPROVED" prominently
5. Main agent will create approval flag: Write tool to .reviewer-approved (project root)
```

After reviewer approves, main agent writes the approval flag using the **Write tool**
(not Bash — `Write(*)` auto-approves root-level files, Bash redirects do not):

- Get timestamp: `date +%s` via Bash
- Write to `.reviewer-approved` at project root using the Write tool
- Then immediately run git add and git commit

### Post-Commit Version Bump & Tagging

After the commit lands, act on the reviewer's VERSION BUMP decision:

**NO BUMP:** nothing to do.

**BUMP: uncertain:** ask the human user directly before proceeding:
> "The reviewer flagged this as uncertain for a version bump. Should this be a patch (bug fix) or minor (new feature) bump, or no bump at all?"

**BUMP: major** — STOP immediately. Do not update versions or tag anything.
Present to the human:
> "The reviewer flagged this as a **major version bump** (breaking change). This requires your explicit approval. The proposed change is: [reviewer summary]. Should I proceed with a major bump to vX.0.0?"
Only proceed after the human says yes. Then follow the patch/minor steps below with `X+1.0.0`.

**BUMP: patch or BUMP: minor** (either from reviewer or after human clarifies uncertain):
1. Read current version from `package.json`
2. Calculate new version:
   - patch: `x.y.Z+1`
   - minor: `x.Y+1.0`
   - major: `X+1.0.0` (only after explicit human approval — see above)
3. Update version in all three places (must stay in sync):
   - `package.json` — `"version"` field
   - `manifest.json` — `"version"` field
   - `src/server.ts` — `version:` in `new McpServer({...})`
4. Spawn reviewer on the version bump commit alone (reviewer just confirms versions match and build passes; no new VERSION BUMP decision needed for a version-only commit)
5. Commit: `chore: bump to vX.Y.Z`
6. Present release summary to the human user and **ask for explicit approval before pushing the tag**:
   > "Ready to release vX.Y.Z. Here's the summary: [reviewer summary]. Should I push the tag to trigger the GitHub release?"
7. On human approval: `git tag vX.Y.Z` then `git push origin vX.Y.Z`
   — this triggers the GHA release workflow which builds and attaches the `.mcpb` bundle.
8. On human decline: leave the version bump commit unpushed; tag whenever the human is ready.

**Never push a tag without explicit human approval.** Tag pushes trigger public releases.

---

## Pre-Commit Requirements

All of these must pass before ANY commit:

| Check | Command |
|---|---|
| Unit tests | `npm test` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Type check | `npm run typecheck` |
| Reviewer approval | Spawn reviewer agent, get APPROVE |

---

## TDD Protocol

**Tests BEFORE implementation. Always.**

1. Write a failing test in `tests/` that describes the desired behavior
2. Run `npm test` — verify it fails (red)
3. Write the minimum implementation to make it pass
4. Run `npm test` — verify it passes (green)
5. Refactor if needed, keep tests passing
6. Spawn reviewer, commit

Test files mirror the source structure:
- `src/translation/tags.ts` → `tests/translation/tags.test.ts`
- `src/manifest/builder.ts` → `tests/manifest/builder.test.ts`

---

## Project Context

See `CLAUDE.md` for full project context, tech stack, and architecture.

Key rules:
- All imports need `.js` extensions (ESM + Node16 module resolution)
- `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`
- `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`
- Tool schemas are Zod raw shapes, NOT `z.object({})`
- Cache is SHA-keyed (GitHub blob SHA), not TTL-only
- Passthrough handler ensures all content is always accessible

---

## User Commit Bypass

For your own manual changes (not AI-generated):

```bash
USER_COMMIT=1 git commit -m "Your message"
```
