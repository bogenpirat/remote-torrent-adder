# Remote Torrent Adder

Chrome MV3 extension that intercepts torrent/magnet links and sends them to BitTorrent client WebUIs.

Full skill definitions and project context: [`.agents/README.md`](.agents/README.md)

## Key Commands

```bash
npm run typecheck      # tsc --noEmit over src/, test/, scripts/, configs
npm run lint           # eslint (npm run lint:fix to autofix)
npm test               # vitest suite (npm run test:watch, npm run test:coverage)
npm run build          # dev build → dist/
npm run build:prod     # production build → dist-prod/
npm run dev            # watch mode
```

`npm run build` runs `typecheck && lint && test` first via `prebuild` — a "build failure" is often one of those three. Run them directly while iterating.

Load unpacked extension from `dist/` in `chrome://extensions/` (Developer mode on).

## Architecture

- **`src/service_worker.ts`** — stateless background process (MV3: no persistent state, use `chrome.storage`)
- **`src/content-script/rta.ts`** — injected into all pages, intercepts torrent/magnet link clicks
- **`src/popup/`** — React app: torrent preview + add configuration
- **`src/options/`** — React app: all settings (clients, notifications, link catching)
- **`src/webuis/<name>-webui.ts`** — one class per BitTorrent client (13), extends `TorrentWebUI`
- **`src/models/clients.ts`** — `Client` enum + `ClientDisplayName` + `ClientClassByClient` + `WebUIFactory`
- **`src/models/webui.ts`** — abstract `TorrentWebUI` base class
- **`test/`** — vitest suite mirroring `src/`; every client has a `test/webuis/<name>-webui.test.ts`

## Critical Constraints

- Service worker **must be stateless** — no module-level mutable state. Persist to `chrome.storage`.
- Use `this.fetch()` (not raw `fetch()`) — it throws `HttpError` on non-OK responses. Return `this.toFailureResult(error)` from the `catch`.
- **Never** set `Content-Type: multipart/form-data` manually with FormData — browser sets it with boundary.
- `Torrent.data` is `Blob | string` — Blob for `.torrent` uploads, magnet URI string when `torrent.isMagnet === true`. Always branch on `torrent.isMagnet`. (There is no `torrent.url` or `torrent.blob`.)
- Use `??` not `||` for settings defaults — `false` and `0` are valid values.
- `Client` enum values are **stable lowercase slugs** persisted in user settings — never display strings, and never changed once shipped. Display names live in `ClientDisplayName`.
- TypeScript strict mode is on, including `noUncheckedIndexedAccess` — indexing an array or record yields `T | undefined`.

## Releasing

Do not bump versions or create tags locally. Releases run through the manually-triggered `.github/workflows/release.yml` (`gh workflow run Release -f version=X.Y.Z`), which owns the version bump, tag, GitHub Release, and Chrome Web Store upload. The CWS step publishes immediately, so a human triggers it. Details in [`.agents/README.md`](.agents/README.md#releasing).

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
