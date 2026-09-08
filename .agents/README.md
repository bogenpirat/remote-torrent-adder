# Remote Torrent Adder — Agentic Programming Hub

This folder is the central source of truth for AI-assisted development on this project. Everything here is plain Markdown with no tool-specific syntax — any agent that can read a file can use it. Harness-specific files elsewhere in the repo are thin pointers to these, never copies.

## Project at a Glance

**Remote Torrent Adder** is a Manifest V3 browser extension. One codebase builds for both Chrome and Firefox (149+). When a user clicks a `.torrent` or magnet link on any web page, the extension intercepts it, shows a popup for label/directory selection, then sends the torrent directly to a configured BitTorrent client WebUI — no local file download needed.

Supported clients (13): ruTorrent, flood, qBittorrent, BiglyBT, Deluge, Elementum, Transmission, Porla, Tixati, tTorrent, QNAP Download Station, Synology Download Station, rqbit.

## Architecture Summary

The file-by-file map and the non-negotiable constraints live in the root [`AGENTS.md`](../AGENTS.md) — they are the always-on context every harness loads, so they are not repeated here. What follows is only what does not fit there.

**Build system**: five Vite builds driven by a single `vite.config.ts`, selected through the `RTA_TARGET` environment variable — `worker`, `content-script`, `popup`, `options`, `notifications`. The `worker` and `content-script` targets use Vite's library mode with `formats: ['iife']` because each must be a single standalone file. Output: `dist/<browser>/` (dev), `dist-prod/<browser>/` (prod), where `<browser>` is `chrome` or `firefox`. `scripts/build.mjs` drives the whole browser x prod x target matrix; `scripts/browsers.mjs` holds the target list and the Firefox exclusions; `scripts/generate-manifest.mjs` derives the Firefox manifest from `src/manifest.json`. Full detail in [`skills/build.md`](skills/build.md).

**Conventions not covered by `AGENTS.md`**: React 19 and Tailwind CSS in both UIs; `TorrentWebUI` subclasses named `<Name>WebUI` in `src/webuis/<name>-webui.ts`; the CORS bypass works by having `declarativeNetRequest` remove the `Origin` header and set `Referer` per configured client.

## Testing

There **is** an automated test suite, and it has three layers:

- **vitest + jsdom** in `test/`, mirroring the `src/` layout. Every client in `src/webuis/` has a matching `test/webuis/<name>-webui.test.ts`.
- **Playwright** in `e2e/`, as two projects: `chrome` loads `dist/chrome/` as an unpacked extension, `firefox` (`e2e/firefox/**`) drives a real Firefox through geckodriver.
- **A manual browser pass** for what neither runner can reach — real link interception, real client round-trips, desktop notifications, service-worker lifecycle.

Commands are listed once, in [`skills/build.md`](skills/build.md). How to write and run the tests: [`skills/testing-guide.md`](skills/testing-guide.md); the manual matrix: [`skills/smoke-test-matrix.md`](skills/smoke-test-matrix.md).

CI (`.github/workflows/build-extension.yml`) runs `typecheck`, `lint`, `test:coverage` and `npm run audit` in a `verify` job that gates both build jobs. The e2e suite runs in its own job, on `master` only, against the artifact `build-dev` produces.

## Intermediate Documentation (`/.tmp/`)

Write findings, analysis, and summaries to `.tmp/<task>-<YYYY-MM-DD>.md` when the work justifies it — e.g. `.tmp/debug-qbittorrent-2026-05-21.md`. The folder is gitignored: a session-scoped scratchpad, not a permanent record.

Write one when the change spans many files, when the output *is* a report (code review, security review, a debugging session with a non-obvious root cause), or when you are handing state to a later session. Skip it for small, mechanical, self-explanatory changes — a gitignored file nobody reads is pure overhead. When in doubt, put the summary in the conversation instead.

Structure it as: a summary paragraph, the detailed findings or changes, then anything deliberately deferred.

## Available Skills

| Skill | Purpose | Claude Code | Copilot |
|---|---|---|---|
| `add-webui-client` | Scaffold a new BitTorrent client implementation | `.claude/skills/` | `.github/prompts/` |
| `add-setting` | Add a new global, per-client, or per-torrent setting | `.claude/skills/` | `.github/prompts/` |
| `debug-client` | Debug auth/API/CORS issues with a specific client | `.claude/skills/` | `.github/prompts/` |
| `rta-code-review` | Review changes against this project's checklist | `.claude/skills/` | `.github/prompts/` |
| `rta-security-review` | This extension's real attack surfaces | `.claude/skills/` | — |
| `build` | Build the extension for dev or production | `.claude/skills/` | — |
| `testing-guide` | vitest suite, Playwright e2e, and the manual pass | `.claude/skills/` | — |
| `smoke-test-matrix` | Defined manual test matrix (rows A–H, H is Firefox) | `.claude/skills/` | — |

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

## Releasing

Releasing is **fully automated and manually triggered** by `.github/workflows/release.yml`. Do not bump versions by hand and do not create tags or releases locally — `master` is ruleset-protected and the workflow owns the version, the tag, and both store uploads.

To release:

```
gh workflow run Release -f version=X.Y.Z
```

(or use the Actions tab). The workflow then, in order:

1. Validates the version and checks the tag does not already exist
2. Runs `node scripts/bump-version.mjs X.Y.Z` — `src/manifest.json` is the source of truth; `package.json` and `package-lock.json` are synced from it
3. `npm ci`, then `npm run build:all` — all four bundles (Chrome and Firefox, dev and prod) with the typecheck/lint/test gate run once. A build failure aborts before any ref moves
4. Runs `web-ext lint` over the Firefox bundle
5. Commits `chore: release vX.Y.Z`, tags it, and pushes both to `master`
6. Publishes a GitHub Release with `generate_release_notes: true` and all four zips attached
7. Uploads the Chrome prod zip to the Chrome Web Store with `publish: true` — **this submits for review immediately**
8. Packages the source with `git archive` and uploads the Firefox prod bundle to addons.mozilla.org with `web-ext sign --channel listed` — **this also submits for review immediately**

Because steps 7 and 8 are irreversible, an agent should never trigger this workflow on its own. Prepare the version, confirm `master` is green, and hand the command to a human.

Required secrets: `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `RELEASE_TOKEN`, `AMO_JWT_ISSUER`, `AMO_JWT_SECRET`.

### addons.mozilla.org

Live. The listing was created by hand for the first submission, because
`web-ext sign` can upload a new version but cannot *create* a listing. That first
upload is what permanently claimed `browser_specific_settings.gecko.id`
(`remote-torrent-adder@bogenpirat`, fixed in `scripts/generate-manifest.mjs` and
asserted by `test/build/manifest.test.ts`).

Credentials come from addons.mozilla.org -> Tools -> Manage API Keys and are
stored as the `AMO_JWT_ISSUER` / `AMO_JWT_SECRET` repository secrets, which the
workflow maps onto `WEB_EXT_API_KEY` / `WEB_EXT_API_SECRET`. They are
account-wide, not scoped to this add-on.

Two constraints the two steps depend on, neither of them obvious:

- **`git archive` must run after the bump commit.** AMO requires a source
  archive alongside any minified upload, and running it earlier ships a source
  zip whose version does not match the bundle.
- **`-c core.autocrlf=false` is load-bearing on a Windows checkout.** Without
  it, `git archive` applies the working-tree line-ending conversion and the
  source differs from the repository on every line. CI runs on Linux where
  autocrlf is off anyway, so the flag is insurance rather than a fix.

AMO rejects a version that already exists, so a re-run with an
already-published version fails at the sign step. The workflow always bumps
first, so this only bites when re-triggering with a stale version number.
