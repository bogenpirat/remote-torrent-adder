# Remote Torrent Adder

MV3 browser extension that intercepts torrent/magnet links and sends them to BitTorrent client WebUIs. One codebase builds for both Chrome and Firefox (149+).

Full skill definitions and project context: [`.agents/README.md`](.agents/README.md)

## Key Commands

```bash
npm run typecheck      # tsc --noEmit over src/, test/, scripts/, configs
npm run lint           # eslint (npm run lint:fix to autofix)
npm test               # vitest suite (npm run test:watch, npm run test:coverage)
npm run audit          # npm audit --audit-level=high, minus a reviewed allowlist
npm run build          # Chrome dev build → dist/chrome/
npm run build:prod     # Chrome prod build → dist-prod/chrome/
npm run build:firefox  # Firefox dev build → dist/firefox/
npm run build:all      # every bundle, incl. the self-hosted Firefox one, verified once
npm run dev            # watch mode
```

`npm run build` runs `typecheck && lint && test` first via `prebuild` — a "build failure" is often one of those three. Run them directly while iterating.

Load unpacked extension from `dist/chrome/` in `chrome://extensions/` (Developer mode on).
For Firefox, `npm run dev:firefox` launches a scratch profile with `dist/firefox/` loaded.

## Architecture

- **`src/service_worker.ts`** — stateless background process (MV3: no persistent state, use `ext.storage`). A service worker on Chrome, an event page on Firefox; the same IIFE bundle serves both.
- **`src/content-script/rta.ts`** — injected into all pages, intercepts torrent/magnet link clicks
- **`src/popup/`** — React app: torrent preview + add configuration
- **`src/options/`** — React app: all settings (clients, notifications, link catching)
- **`src/webuis/<name>-webui.ts`** — one class per BitTorrent client (13), extends `TorrentWebUI`
- **`src/models/clients.ts`** — `Client` enum + `ClientDisplayName` + `ClientClassByClient` + `WebUIFactory`
- **`src/models/webui.ts`** — abstract `TorrentWebUI` base class
- **`src/util/browser-api.ts`** — the `ext` shim; **all** extension API calls go through it
- **`src/util/platform.ts`** — build-time browser constant (`isFirefox()`, `canUseOffscreen()`)
- **`scripts/build.mjs` / `scripts/browsers.mjs` / `scripts/generate-manifest.mjs`** — the build matrix and the derived Firefox manifest
- **`test/`** — vitest suite mirroring `src/`; every client has a `test/webuis/<name>-webui.test.ts`
- **`e2e/`** — Playwright drives Chrome; `e2e/firefox/` drives real Firefox through geckodriver

## Critical Constraints

- **Never call `chrome.*` directly.** Use `ext` from `src/util/browser-api.ts`; on Firefox the bare `chrome` namespace is callback-only and returns `undefined`, so `.then()` on it throws. An eslint rule enforces this. Type positions (`chrome.tabs.Tab`) are fine.
- Anything Chrome-only (`ext.offscreen`, …) must be behind `canUseOffscreen()` / `isFirefox()` from `src/util/platform.ts`, and a permission only Chrome understands must be filtered out in `scripts/generate-manifest.mjs`.
- Service worker **must be stateless** — no module-level mutable state. Persist to `ext.storage`.
- Use `this.fetch()` (not raw `fetch()`) — it throws `HttpError` on non-OK responses. Return `this.toFailureResult(error)` from the `catch`.
- **Never** set `Content-Type: multipart/form-data` manually with FormData — browser sets it with boundary.
- `Torrent.data` is `Blob | string` — Blob for `.torrent` uploads, magnet URI string when `torrent.isMagnet === true`. Always branch on `torrent.isMagnet`. (There is no `torrent.url` or `torrent.blob`.)
- Use `??` not `||` for settings defaults — `false` and `0` are valid values.
- `Client` enum values are **stable lowercase slugs** persisted in user settings — never display strings, and never changed once shipped. Display names live in `ClientDisplayName`.
- TypeScript strict mode is on, including `noUncheckedIndexedAccess` — indexing an array or record yields `T | undefined`.

## Releasing

Do not bump versions or create tags locally. Releases run through the manually-triggered `.github/workflows/release.yml` (`gh workflow run Release -f version=X.Y.Z`), which owns the version bump, tag, GitHub Release, Chrome Web Store upload, and addons.mozilla.org upload. Both store steps submit for review immediately, so a human triggers it. Details in [`.agents/README.md`](.agents/README.md#releasing).

## Task guides — read the matching file before you start

This project keeps a detailed guide per task in `.agents/skills/`. They are plain Markdown with no tool-specific syntax: any agent that can read a file can use them. **Before starting one of these tasks, read the matching file.** They contain the exact steps, the file lists, and the mistakes that have actually been made here.

| If you are asked to… | Read |
|---|---|
| add support for a new BitTorrent client | [`.agents/skills/add-webui-client.md`](.agents/skills/add-webui-client.md) |
| add a setting, option, flag, or toggle | [`.agents/skills/add-setting.md`](.agents/skills/add-setting.md) |
| fix a client that fails to add torrents (auth, CORS, HTTP errors) | [`.agents/skills/debug-client.md`](.agents/skills/debug-client.md) |
| review a PR, diff, or set of changes | [`.agents/skills/rta-code-review.md`](.agents/skills/rta-code-review.md) |
| review changes for security | [`.agents/skills/rta-security-review.md`](.agents/skills/rta-security-review.md) |
| build the extension, or explain a build failure | [`.agents/skills/build.md`](.agents/skills/build.md) |
| write or run tests | [`.agents/skills/testing-guide.md`](.agents/skills/testing-guide.md) |
| verify a change in a real browser before release | [`.agents/skills/smoke-test-matrix.md`](.agents/skills/smoke-test-matrix.md) |

Project background and the release process: [`.agents/README.md`](.agents/README.md).

Some harnesses can load these automatically and don't need the table — Claude Code has stubs in `.claude/skills/`, GitHub Copilot has prompt files in `.github/prompts/`. Those are thin pointers to the files above, which stay the single place to edit.

<!-- ccs:begin (managed by `ccs init`; edit canon, not this block) -->
# Clean Code rules for this project

These rules are enforced. `ccs check` blocks on the ones marked gate; a reviewer checks the rest.
Thresholds live in `cleancode.toml`. Full rules with examples: `ccs canon <topic>`.

## Workflow

1. New project: write the glossary and layer map in `cleancode.toml` before any code.
2. Write a failing test for the next behaviour, then the minimum code to pass it.
3. Run `ccs check --changed`. Fix every finding; do not silence one by reshuffling code.
4. Request a judged review of the diff. Fix findings or record a waiver with a reason.
5. Build in vertical slices. Never generate a whole project in one pass.
6. In existing code, leave every function you touch no worse than you found it.

## Names

- Names reveal intent; a name that needs a comment is the wrong name. (N1)
- One word per concept, taken from the project glossary. (N3, G11)
- No type or scope encodings: no `strName`, `m_count`, `bIsReady`. (N6, gate)
- No one or two letter names outside a short loop. (N5, gate)
- A name states side effects: `createOrReturnSession`, not `getSession`. (N7)

## Functions

- Small: at most 20 lines, nesting depth 2, complexity 10. (FN1, FN2, FN3, gate)
- At most 3 arguments; group related ones into an object. (F1, gate)
- No boolean flag arguments; split into two functions. (F3, gate)
- Do one thing, at one level of abstraction. (G30, G34)
- Either change state or answer a question, never both. No hidden side effects.
- No output arguments. (F2)

## Comments

- Explain why, never what. Rewrite the code before explaining it. (C3)
- No commented-out code. (C5, gate) No TODO without a ticket or link. (CM1, gate)

## Structure

- Files at most 300 lines, lines at most 120 columns. (FM1, FM2, gate)
- Callers above callees; related code close together. (G10)
- Classes are small with one reason to change. (CL1, CL2, gate; SRP judged)
- No train wrecks: talk to collaborators, not to their internals. (G36, gate)
- No duplication. (G5, gate)
- Replace magic numbers with named constants. (G25)

## Errors

- Never swallow an exception. (ER1, gate)
- Do not return or pass null; use an empty value, an option type or an exception. (ER2, gate)
- Exceptions carry context. No error codes.

## Architecture

- Dependencies point inward along the declared layers. (A1, gate)
- Third-party packages appear only in their declared boundary directories. (A2, gate)
- Construct objects in one place (the composition root); pass dependencies in.

## Tests

- New source files arrive with a test change. (T1, gate) The test command passes. (TS1, gate)
- Tests are fast, independent, repeatable, self-validating and written first.
- One concept per test; test code is held to the same standard as production code.
<!-- ccs:end -->
