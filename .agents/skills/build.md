# Skill: Build the Extension

## Commands

| Command | Output | Use Case |
|---|---|---|
| `npm run build` | `dist/chrome/` | Chrome development build, unminified |
| `npm run build:prod` | `dist-prod/chrome/` | Chrome production build, minified |
| `npm run build:firefox` | `dist/firefox/` | Firefox development build |
| `npm run build:firefox:prod` | `dist-prod/firefox/` | Firefox production build |
| `npm run build:all` | all four | Every bundle, with the gate run once |
| `npm run dev` | `dist/chrome/` | Watch mode for development |
| `npm run dev:firefox` | `dist/firefox/` | Build, then launch Firefox with the add-on loaded |
| `npm run lint:firefox` | — | `web-ext lint` — AMO's own linter, over `dist/firefox/` |
| `npm run audit` | — | `npm audit --audit-level=high` minus a reviewed allowlist (`scripts/audit.mjs`) |
| `npm run clean` | — | Remove `dist/` |
| `npm run typecheck` | — | Type-check `src/`, `test/`, `scripts/`, configs (`tsc --noEmit`) |
| `npm run lint` | — | ESLint over the repo (`npm run lint:fix` to autofix) |
| `npm test` | — | Run the vitest suite |

## The prebuild gate

Both `npm run build` and `npm run build:prod` run **`typecheck && lint && test`** first, via the `prebuild` / `prebuild:prod` scripts. A "build failure" is therefore often a type, lint, or test failure that never reached Vite at all.

While iterating, run the three directly — the output is easier to read than through the build:

```bash
npm run typecheck
npm run lint
npm test
```

CI (`.github/workflows/build-extension.yml`) runs the same three plus `npm run audit` in a `verify` job that gates both the dev and prod build jobs.

`npm run audit` is `npm audit --audit-level=high` with a reviewed allowlist, because npm has no way to waive a single advisory and an unfixable one in a build tool would otherwise mean a permanently red CI. A new advisory still fails; waiving one means adding an entry to `ALLOWLIST` in `scripts/audit.mjs` with a reason it cannot be fixed upstream and cannot reach the shipped extension. A waiver that no longer matches anything is reported so it gets removed.

## Build Pipeline (in order)

`scripts/build.mjs` owns the pipeline. It resolves the output directory from
`RTA_BROWSER` (`chrome` or `firefox`) and `PROD`, then:

1. Removes the output directory (skipped for a `--only=` targeted rebuild)
2. Copies `src/assets/` and writes the generated `manifest.json`
   (`scripts/generate-manifest.mjs`) into it
3. Runs Vite once per target, driven by `RTA_TARGET`, e.g. for Chrome:
   - `RTA_TARGET=worker` → `dist/chrome/service_worker.js` (IIFE, self-contained)
   - `RTA_TARGET=content-script` → `dist/chrome/content-script/rta.js` (IIFE)
   - `RTA_TARGET=popup` → `dist/chrome/popup/`
   - `RTA_TARGET=options` → `dist/chrome/options/`
   - `RTA_TARGET=notifications` → `dist/chrome/notifications/`

The two IIFE targets are built through Vite's library mode because the
service worker and content script each have to be a single standalone file.

Firefox skips the `notifications` target entirely: its background is an event
page with a DOM, so it plays notification sounds in-process and never loads the
offscreen document. `scripts/browsers.mjs` is the single place that rule and the
output-path rule live.

## Loading in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" → select the `dist/chrome/` folder
4. After code changes, click the reload icon on the extension card (or run `npm run build` and reload)

## Adding a new target

A new HTML page needs an entry in the `targets` map in `vite.config.ts` and its name added to `ALL_TARGETS` in `scripts/browsers.mjs` (and to `targetsFor` if it is Chrome-only). `scripts/build.mjs` picks it up from there; no new npm script is needed.

## Output

Report the outcome in the conversation. A large or categorised error list — a strict-mode migration, a dependency bump that broke many files — is worth a `.tmp/build-errors-<YYYY-MM-DD>.md` write-up; see `.agents/README.md`. A single failure that you fixed immediately is not.

## Troubleshooting

- **"Build" fails without reaching Vite**: it's the `prebuild` gate — run `npm run typecheck`, `npm run lint`, and `npm test` separately to see which one
- **Service worker errors**: check `chrome://extensions/` → "Errors" or "service worker" link for logs
- **Content script not running**: check the extension is enabled and has permissions for the current site
- **Build fails with TS error**: run `npm run typecheck` to see type errors clearly
- **`Set RTA_TARGET to one of: …`**: a Vite build was invoked without the env var — use the `npm run build:*` scripts, which set it via `cross-env`
- **Vite build fails**: check that `src/popup/`, `src/options/`, `src/notifications/` each have their entry HTML file
