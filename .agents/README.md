# Remote Torrent Adder — Agentic Programming Hub

This folder is the central source of truth for AI-assisted development on this project. Everything here is plain Markdown with no tool-specific syntax — any agent that can read a file can use it. Harness-specific files elsewhere in the repo are thin pointers to these, never copies.

## Project at a Glance

**Remote Torrent Adder** is a Chrome Manifest V3 browser extension. When a user clicks a `.torrent` or magnet link on any web page, the extension intercepts it, shows a popup for label/directory selection, then sends the torrent directly to a configured BitTorrent client WebUI — no local file download needed.

Supported clients (13): ruTorrent, flood, qBittorrent, BiglyBT, Deluge, Elementum, Transmission, Porla, Tixati, tTorrent, QNAP Download Station, Synology Download Station, rqbit.

## Architecture Summary

| Layer | Files | Role |
|---|---|---|
| Service Worker | `src/service_worker.ts` | Background process: settings, auth, context menu, CORS rules |
| Content Script | `src/content-script/rta.ts` | Detects torrent/magnet links, intercepts clicks |
| Popup UI | `src/popup/` | React app for torrent preview + label/dir selection |
| Options UI | `src/options/` | React app for all settings (clients, notifications, link catching) |
| Client Impls | `src/webuis/<name>-webui.ts` | One class per BitTorrent client, extends `TorrentWebUI` |
| Factory | `src/models/clients.ts` | `Client` enum + `ClientDisplayName` + `ClientClassByClient` + `WebUIFactory` |
| Base Class | `src/models/webui.ts` | Abstract `TorrentWebUI` with `sendTorrent()` / `testConnection()` |

**Build system**: five Vite builds driven by a single `vite.config.ts`, selected through the `RTA_TARGET` environment variable — `worker`, `content-script`, `popup`, `options`, `notifications`. The `worker` and `content-script` targets use Vite's library mode with `formats: ['iife']` because each must be a single standalone file. Output: `dist/` (dev), `dist-prod/` (prod).

## Key Conventions

- TypeScript **strict mode on** (`strict`, plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `noFallthroughCasesInSwitch`), React 19, Tailwind CSS
- `TorrentWebUI` subclasses named `<Name>WebUI` in `src/webuis/<name>-webui.ts`
- Service worker is **stateless** (MV3) — all state goes to `chrome.storage.local`
- Use `this.fetch()` (base class wrapper) for HTTP — it throws `HttpError` on non-OK responses
- CORS bypass: `declarativeNetRequest` removes Origin header and sets Referer per-client
- Use `??` not `||` for settings defaults — `false` and `0` are valid values

## Testing

There **is** an automated test suite: [vitest](https://vitest.dev) with jsdom, in `test/`, mirroring the `src/` layout. Every client in `src/webuis/` has a matching `test/webuis/<name>-webui.test.ts`.

```bash
npm test            # run the suite once
npm run test:watch  # watch mode
npm run test:coverage
npm run typecheck   # tsc --noEmit over src/, test/, scripts/, configs
npm run lint        # eslint
```

`npm run build` and `npm run build:prod` both run `typecheck && lint && test` first via `prebuild`, so a build can "fail" on a lint or test error. CI (`.github/workflows/build-extension.yml`) runs the same three plus `npm audit --audit-level=high` in a `verify` job that gates both build jobs.

Automated tests cover logic and components. They cannot cover real link interception, real client round-trips, notifications, or service-worker lifecycle — see `skills/testing-guide.md` and `skills/smoke-test-matrix.md` for the manual pass that does.

## Intermediate Documentation (`/.tmp/`)

Write findings, analysis, and summaries to `.tmp/<slug>-<date>.md` when the work justifies it. This folder is gitignored — it is a session-scoped scratchpad, not a permanent record.

### When to write a `.tmp/` file

Write one when:

- The change spans many files, or the analysis took real effort to produce and would be expensive to redo.
- The output *is* a report: code review, security review, or a debugging session with a non-obvious root cause.
- You are handing state to a later session (a partial migration, a deferred follow-up list).

Skip it for small, mechanical, self-explanatory changes — a gitignored file nobody reads is pure overhead. When in doubt, put the summary in the conversation instead.

### Naming convention

```
.tmp/<task>-<YYYY-MM-DD>.md
```

Examples: `.tmp/strict-types-2026-05-20.md`, `.tmp/debug-qbittorrent-2026-05-21.md`, `.tmp/review-pr-42-2026-05-22.md`

### File structure

```markdown
# <Task Title>
**Date**: YYYY-MM-DD  **Branch**: <branch>

## Summary
One paragraph of what was done and the outcome.

## Findings / Changes
Detailed list — errors fixed, files touched, decisions made.

## Deferred / Follow-up
Anything intentionally left out and why.
```

## Available Skills

| Skill | Purpose | Claude Code | Copilot |
|---|---|---|---|
| `add-webui-client` | Scaffold a new BitTorrent client implementation | `.claude/skills/` | `.github/prompts/` |
| `add-setting` | Add a new global, per-client, or per-torrent setting | `.claude/skills/` | `.github/prompts/` |
| `debug-client` | Debug auth/API/CORS issues with a specific client | `.claude/skills/` | `.github/prompts/` |
| `rta-code-review` | Review changes against this project's checklist | `.claude/skills/` | `.github/prompts/` |
| `rta-security-review` | This extension's real attack surfaces | `.claude/skills/` | — |
| `build` | Build the extension for dev or production | `.claude/skills/` | — |
| `testing-guide` | Automated suite + manual Chrome verification | `.claude/skills/` | — |
| `smoke-test-matrix` | Defined manual test matrix (rows A–G) | `.claude/skills/` | — |

An agent on a harness with no adapter needs none of the above: the routing table in the root `AGENTS.md` names the right file for each task in plain English.

`rta-code-review` and `rta-security-review` carry the `rta-` prefix because Claude Code ships generic `/code-review` and `/security-review` skills; the prefix keeps the project-specific ones unambiguous. They complement rather than replace the generic versions.

There is deliberately **no release skill** — releasing is a human-triggered workflow, not an agentic task. See [Releasing](#releasing).

## How the layers fit together

```
AGENTS.md                        ← always-on context + task routing table.
                                   The widest-read file; several harnesses load it
                                   automatically, and any other agent can be pointed at it.
.agents/README.md                ← this file: project background, conventions, release process
.agents/skills/<name>.md         ← one detailed guide per task. The actual content.

.claude/skills/<name>/SKILL.md   ← Claude Code adapter (frontmatter + one line of prose)
.github/copilot-instructions.md  ← Copilot adapter
.github/prompts/<name>.prompt.md ← Copilot adapter, per task
```

**The rule for the adapter files: pointers only, never copies.** They exist because each harness discovers instructions in its own location and format, not because they have anything to say. Every stale fact this repo has accumulated came from a fact written down in more than one place — so a fact belongs in exactly one of `AGENTS.md` or a `.agents/skills/` guide, and everything else links to it.

Adding support for another tool means adding one more adapter that points here. It does not mean copying any content.

## Quick Reference: Common Tasks

### Add a new torrent client
1. Create `src/webuis/<name>-webui.ts` extending `TorrentWebUI`
2. Add an entry to the `Client` enum in `src/models/clients.ts` — the value is a **stable lowercase slug** (`"rqbit"`), never a display string, because it is persisted in user settings
3. Add matching entries to **both** `ClientDisplayName` and `ClientClassByClient` (both are `Record<Client, …>`, so a missing entry is a type error)
4. Add `test/webuis/<name>-webui.test.ts`
5. `npm run typecheck && npm test && npm run lint`

Full guide: `skills/add-webui-client.md`.

### Run a development build
```
npm run build        # one-shot dev build
npm run dev          # watch mode (assets + worker + content script)
```

### Test in Chrome
1. `npm run build`
2. Open `chrome://extensions/`
3. Enable Developer mode
4. "Load unpacked" → select `dist/`
5. Reload the extension after changes

## Releasing

Releasing is **fully automated and manually triggered** by `.github/workflows/release.yml`. Do not bump versions by hand and do not create tags or releases locally — `master` is ruleset-protected and the workflow owns the version, the tag, and the Chrome Web Store upload.

To release:

```
gh workflow run Release -f version=X.Y.Z
```

(or use the Actions tab). The workflow then, in order:

1. Validates the version and checks the tag does not already exist
2. Runs `node scripts/bump-version.mjs X.Y.Z` — `src/manifest.json` is the source of truth; `package.json` and `package-lock.json` are synced from it
3. `npm ci`, then builds **both** the dev and prod bundles — a build failure aborts before any ref moves
4. Commits `chore: release vX.Y.Z`, tags it, and pushes both to `master`
5. Publishes a GitHub Release with `generate_release_notes: true` and both zips attached
6. Uploads the prod zip to the Chrome Web Store with `publish: true` — **this submits for review immediately**

Because step 6 is irreversible, an agent should never trigger this workflow on its own. Prepare the version, confirm `master` is green, and hand the command to a human.

Required secrets: `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `RELEASE_TOKEN`.
