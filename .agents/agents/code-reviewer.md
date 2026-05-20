# Agent: code-reviewer

**Purpose**: Review code changes with deep knowledge of this project's architecture and Chrome MV3 constraints.

## When to Use

Invoke when reviewing a PR, a diff, or a set of changed files in this repository.

## Review Checklist

### Chrome MV3 Constraints

- [ ] Service worker (`service_worker.ts`) must be **stateless** between events — no module-level mutable state that persists across invocations. Use `chrome.storage` for persistence.
- [ ] No `setInterval` or `setTimeout` in the service worker (they're cleared when the worker goes idle). Use `chrome.alarms` if periodic tasks are needed.
- [ ] `chrome.runtime.sendMessage` is used for content script ↔ service worker communication — not direct function calls.
- [ ] `declarativeNetRequest` rule IDs must be unique integers — check `cors-tricks.ts` for the current ID allocation scheme before adding new rules.
- [ ] Offscreen documents (notifications) have strict lifecycle — they must be created before use and destroyed when done.

### Client Implementation Review

For changes in `src/webuis/`:
- [ ] Class extends `TorrentWebUI` and is registered in `ClientClassByClient`
- [ ] All three abstract getters implemented: `isLabelSupported`, `isDirSupported`, `isAddPausedSupported`
- [ ] `sendTorrent()` returns `TorrentAddingResult` with `{ success, httpResponseCode, httpResponseBody }`
- [ ] Uses `this.fetch()` (not raw `fetch()`) — base class wrapper throws on non-OK
- [ ] Uses `this.getLabel()`, `this.getDirectory()`, `this.getAddPaused()` — not direct config access
- [ ] Uses `this.createBaseUrl()` for URL construction — not hardcoded paths
- [ ] Does **not** manually set `Content-Type: multipart/form-data` when using `FormData` (browser sets boundary)
- [ ] Branches on `torrent.isMagnet` (NOT on parsing `torrent.data` or a non-existent `torrent.url`). `torrent.data` is `Blob | string` — Blob for files, string (magnet URI) when `isMagnet`
- [ ] When uploading a `.torrent`, wraps the Blob in a `File` so the multipart filename is set: `new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" })`

### Settings & Storage

- [ ] New settings fields added to `WebUISettings` interface in `src/models/webui.ts`
- [ ] Default values handled (new fields may be undefined in existing configs — use `??` not `||`)
- [ ] If settings schema changes shape (rename / remove / type change), a migration step is needed in `src/util/settings-migrator-from-legacy.ts`. Adding a new optional field (`?:`) does not require a migration.
- [ ] `clientSpecificSettings` is used for per-client configuration (typed as `Record<string, any>`)

### React UI (Options / Popup)

- [ ] `SettingsContext` is used for state management in options — not local component state for shared settings
- [ ] New options fields have corresponding UI in `src/options/pages/WebUIsPage.tsx`
- [ ] Tailwind classes used — no inline styles (except where dynamic values require it)
- [ ] Dark mode works (uses `dark:` variant or CSS custom properties via `tailwind.config.ts`)

### TypeScript

- [ ] Strict mode is **off** — but avoid `any` where a proper type exists
- [ ] No unused imports or variables
- [ ] No `console.log` left in production code (use sparingly for debugging)

### Build System

- [ ] New source files in `src/webuis/` or `src/util/` don't need to be added to any build config — Rollup/Vite resolve imports automatically
- [ ] New HTML pages require a new Vite config file and entry in `package.json` scripts
- [ ] Assets (images, static files) go in `src/` and are copied by `copy-assets` script

## Output

Save review findings to `.tmp/review-<pr-or-branch>-<YYYY-MM-DD>.md` using the structure from `.agents/README.md`. Include every checklist item that failed (pass/warn/fail) and severity.

## Common Issues to Flag

1. **Fetch without error handling**: raw `fetch()` calls that don't check `res.ok`
2. **Hardcoded ports or paths**: should use `createBaseUrl()` + user settings
3. **Direct storage access**: prefer `src/util/settings.ts` helpers over raw `chrome.storage` calls
4. **Missing null checks**: settings fields can be null/undefined — `label`, `dir`, `relativePath`
5. **FormData content-type**: manually setting multipart content-type breaks the boundary parameter
