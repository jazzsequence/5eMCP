# Agent Instructions — 5etools-mcp

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

DELIVERABLE:
Provide APPROVE or REJECT with findings for ALL categories.

If REJECT: List violations and required fixes. Do NOT create approval flag.

If APPROVE:
1. Confirm all rules followed
2. Say "✅ APPROVED" prominently
3. Main agent will create approval flag: Write tool to .reviewer-approved (project root)
```

After reviewer approves, main agent writes the approval flag using the **Write tool**
(not Bash — `Write(*)` auto-approves root-level files, Bash redirects do not):

- Get timestamp: `date +%s` via Bash
- Write to `.reviewer-approved` at project root using the Write tool
- Then immediately run git add and git commit

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
