# Skill: Remote Torrent Adder Code Review

**Purpose**: Review code changes with deep knowledge of this project's architecture, its MV3 constraints, and the Chrome/Firefox split.

This is the project-specific counterpart to the generic `/code-review`. Use it when reviewing a PR, a diff, or a set of changed files in this repository; the two complement each other.

## Before the checklist

Run the gates first — they catch the mechanical problems so the review can focus on the rest:

```bash
npm run typecheck
npm test
npm run lint
```

## Review Checklist

### Cross-browser (`ext`) — check this first

The same bundle ships to Chrome and Firefox, and this is the newest and most easily broken constraint in the repo.

- [ ] **No bare `chrome.*` calls.** Everything goes through `ext` from `src/util/browser-api.ts`. On Firefox the bare `chrome` namespace is callback-only and returns `undefined`, so `.then()` on it throws. `no-restricted-syntax` in `eslint.config.js` enforces this — if a change disables or works around that rule, it is a BLOCKER. Type positions (`chrome.tabs.Tab`) are exempt and fine.
- [ ] Chrome-only APIs (`ext.offscreen`, and anything else Firefox lacks) are behind `canUseOffscreen()` or `isFirefox()` from `src/util/platform.ts` — never called unguarded.
- [ ] A permission only Chrome understands is filtered out of the derived Firefox manifest in `scripts/generate-manifest.mjs`, and `test/build/manifest.test.ts` still passes.
- [ ] Firefox has no offscreen document — its background is an event page that plays sound in-process. A change to `play-sound.ts` or `notifications.ts` must work on both paths.
- [ ] Firefox notifications are basic only (no buttons), and Firefox match patterns cannot carry a port. A change relying on either needs a Firefox check.
- [ ] Anything touching `browser-api.ts`, `platform.ts`, `play-sound.ts`, `notifications.ts`, `action.ts`, `cors-tricks.ts`, `authentication-listener.ts`, or `scripts/generate-manifest.mjs` should say which rows of `smoke-test-matrix.md` section H were run.

### MV3 Constraints

- [ ] Service worker (`service_worker.ts`) must be **stateless** between events — no module-level mutable state that persists across invocations. Persist to `ext.storage`; background code reloads settings per event via `new Settings().loadSettings()` rather than caching them.
- [ ] No `setInterval` or `setTimeout` in the service worker (they're cleared when the worker goes idle). Use `ext.alarms` if periodic tasks are needed.
- [ ] `ext.runtime.sendMessage` is used for content script ↔ service worker communication — not direct function calls.
- [ ] `declarativeNetRequest` rule IDs must be unique integers — check `cors-tricks.ts` for the current ID allocation scheme before adding new rules.
- [ ] Offscreen documents (notifications) have strict lifecycle — created before use, destroyed when done — and are Chrome-only, so the call site must be guarded by `canUseOffscreen()`.

### Client Implementation Review

For changes in `src/webuis/`:
- [ ] Class extends `TorrentWebUI` and is registered in **all three** tables in `src/models/clients.ts`: the `Client` enum, `ClientDisplayName`, and `ClientClassByClient`
- [ ] The `Client` enum value is a stable lowercase slug, not a display string — these values are persisted in user settings and must never change. Renaming an existing one requires a migration entry in `src/util/legacy-client-identifiers.ts`
- [ ] All three abstract getters implemented: `isLabelSupported`, `isDirSupported`, `isAddPausedSupported`
- [ ] `sendTorrent()` returns `TorrentAddingResult` with `{ success, httpResponseCode, httpResponseBody }`, and its `catch` uses `this.toFailureResult(error)` rather than hand-building a failure object
- [ ] `testConnection()` is overridden when the client can validate credentials — the base implementation only checks reachability and reports `authenticated: null`. `isConnectionTestSupported` is set to `false` only if there is genuinely nothing to probe
- [ ] Uses `this.fetch()` (not raw `fetch()`) — base class wrapper throws `HttpError` on non-OK
- [ ] Uses `this.getLabel()`, `this.getDirectory()`, `this.getAddPaused()` — not direct config access. Note these return `string | null` / `boolean | null`
- [ ] Uses `this.createBaseUrl()` for URL construction — not hardcoded paths
- [ ] Does **not** manually set `Content-Type: multipart/form-data` when using `FormData` (browser sets boundary)
- [ ] Branches on `torrent.isMagnet` (NOT on parsing `torrent.data` or a non-existent `torrent.url`). `torrent.data` is `Blob | string` — Blob for files, string (magnet URI) when `isMagnet`
- [ ] When uploading a `.torrent`, wraps the Blob in a `File` so the multipart filename is set: `new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" })`

### Tests

- [ ] New or changed client behaviour has matching cases in `test/webuis/<name>-webui.test.ts` — every client has one, a new client without one is a gap
- [ ] New settings fields are covered in `test/util/settings-defaults.test.ts` and `test/util/settings.test.ts`
- [ ] New UI has cases in `test/options/` or `test/popup/`
- [ ] Tests use the helpers in `test/helpers/` (`fetch-mock`, `chrome-mock`, `fixtures`) instead of hand-rolled mocks
- [ ] Behaviour a headless run can still reach (boot, link catching, the CORS rules, an add round-trip against a stub client) belongs in `e2e/` — and in `e2e/firefox/` too if it is cross-browser
- [ ] Behaviour that genuinely needs hands on a browser (real client round-trip, desktop notifications, worker lifecycle, permission prompts) is covered by the relevant rows of `smoke-test-matrix.md` instead — flag if none of the three applies

### Settings & Storage

- [ ] New per-client fields added to `WebUISettings` in `src/models/webui.ts`; new global fields to `RTASettings` in `src/models/settings.ts` with a default in `src/util/settings-defaults.ts`
- [ ] Default values handled (new fields may be undefined in existing configs — use `??` not `||`, since `false` and `0` are valid values)
- [ ] Adding a new optional field (`?:`) needs no migration. Renaming, removing, or changing the type of an existing field does — and the only migration path currently in the codebase is `src/util/legacy-client-identifiers.ts`, which handles client identifiers specifically. A different kind of schema change needs new migration code plus tests
- [ ] New required fields on `WebUISettings` are added to `test/helpers/fixtures.ts` **and** `e2e/fixtures/settings.ts`
- [ ] A client-only boolean option is declared as a `ClientSpecificSettingDescriptor` on the client class and read with `this.getClientSpecific(key, config)` — **not** as a hand-wired new field on `WebUISettings` with its own control in `WebUIsPage.tsx`. `clientSpecificSettings` is typed `Record<string, unknown>`; reading it directly bypasses the config → stored → default fallback chain
- [ ] A descriptor's `key` is stable and never changed once shipped — it is persisted in user settings, exactly like the `Client` enum slug

### React UI (Options / Popup)

- [ ] `SettingsContext` (`src/options/SettingsContext.tsx`) is used for state management in options — not local component state for shared settings
- [ ] New options fields have corresponding UI in the right page under `src/options/pages/`
- [ ] Tailwind classes used — no inline styles (except where dynamic values require it)
- [ ] Dark mode works (uses `dark:` variant or CSS custom properties via `tailwind.config.ts`)

### TypeScript

- [ ] Strict mode is **on**, along with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, and `noFallthroughCasesInSwitch` (`tsconfig.json`). `noUncheckedIndexedAccess` in particular means indexing an array or record yields `T | undefined` — check the change handles that rather than asserting it away
- [ ] Overrides carry the `override` keyword (`noImplicitOverride`)
- [ ] No unused imports or variables
- [ ] No `console.log` left in production code (use sparingly for debugging)

### Build System

- [ ] New source files in `src/webuis/` or `src/util/` don't need to be added to any build config — Vite resolves imports automatically
- [ ] A new HTML page needs an entry in the `targets` map in `vite.config.ts` **and** its name in `ALL_TARGETS` in `scripts/browsers.mjs` (plus `targetsFor` if it is Chrome-only). No new npm script is needed — `scripts/build.mjs` picks it up
- [ ] Static assets go in `src/assets/`, which `scripts/build.mjs` copies wholesale into the output directory

## Output

Report findings as **BLOCKER**, **WARNING**, or **SUGGESTION**, citing `file_path:line_number`, and end with a one-sentence verdict.

A review is one of the cases where a `.tmp/review-<pr-or-branch>-<YYYY-MM-DD>.md` write-up is worth it — see `.agents/README.md`. Include every checklist item that failed, with severity.

## Common Issues to Flag

1. **Fetch without error handling**: raw `fetch()` calls that don't check `res.ok`
2. **Hardcoded ports or paths**: should use `createBaseUrl()` + user settings
3. **Direct storage access**: prefer `src/util/settings.ts` helpers over raw `ext.storage` calls — and a bare `chrome.storage` call is a lint failure, not a style preference
4. **Missing null checks**: settings fields can be null/undefined — `label`, `dir`, `relativePath`
5. **FormData content-type**: manually setting multipart content-type breaks the boundary parameter
6. **Partial client registration**: a client added to the enum but missing from `ClientDisplayName` or `ClientClassByClient` — `test/models/clients.test.ts` catches this, so a failure there usually means exactly this
