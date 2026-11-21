# Skill: Build the Extension

## Commands

| Command | Output | Use Case |
|---|---|---|
| `pnpm build` | `dist/chrome/` | Chrome development build, unminified |
| `pnpm build:prod` | `dist-prod/chrome/` | Chrome production build, minified |
| `pnpm build:firefox` | `dist/firefox/` | Firefox development build |
| `pnpm build:firefox:prod` | `dist-prod/firefox/` | Firefox production build |
| `pnpm build:all` | all five | Every bundle incl. `dist-prod/firefox-unlisted/`, with the gate run once |
| `pnpm dev` | `dist/chrome/` | Watch mode for development |
| `pnpm dev:firefox` | `dist/firefox/` | Build, then launch Firefox with the add-on loaded |
| `pnpm lint:firefox` | — | `web-ext lint` — AMO's own linter, over `dist/firefox/` |
| `pnpm audit` | — | Fails on high/critical advisories (`auditLevel` in `pnpm-workspace.yaml`) |
| `pnpm clean` | — | Remove `dist/` |
| `pnpm typecheck` | — | Type-check `src/`, `test/`, configs (`tsc --noEmit`), then `scripts/` against `scripts/tsconfig.json` |
| `pnpm lint` | — | ESLint over the repo (`pnpm lint:fix` to autofix) |
| `pnpm test` | — | Run the vitest suite |

## The verify gate

Both `pnpm build` and `pnpm build:prod` run **`typecheck && lint && test`** first, via the `verify` script chained in front of each build script. A "build failure" is therefore often a type, lint, or test failure that never reached Vite at all.

While iterating, run the three directly — the output is easier to read than through the build:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

CI (`.github/workflows/build-extension.yml`) runs the same three plus `pnpm audit` in a `verify` job that gates both the dev and prod build jobs.

`pnpm audit` is pnpm's built-in audit with `auditLevel: high` set in `pnpm-workspace.yaml`, so a high or critical advisory fails CI. An unfixable one in a build tool can be waived by adding its GHSA id to `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`, with a reason it cannot be fixed upstream and cannot reach the shipped extension. Remove the waiver once the advisory is fixed. Do not test waivers with `pnpm audit --ignore`: it writes the id into `pnpm-workspace.yaml`.

## Build Pipeline (in order)

`scripts/build.ts` owns the pipeline. It resolves the output directory from
`RTA_BROWSER` (`chrome` or `firefox`) and `PROD`, then:

1. Removes the output directory (skipped for a `--only=` targeted rebuild)
2. Copies `src/assets/` and writes the generated `manifest.json`
   (`scripts/generate-manifest.ts`) into it
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
offscreen document. `scripts/browsers.ts` is the single place that rule and the
output-path rule live.

## Loading in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" → select the `dist/chrome/` folder
4. After code changes, click the reload icon on the extension card (or run `pnpm build` and reload)

## Adding a new target

A new HTML page needs an entry in the `targets` map in `vite.config.ts` and its name added to `ALL_TARGETS` in `scripts/browsers.ts` (and to `targetsFor` if it is Chrome-only). `scripts/build.ts` picks it up from there; no new package.json script is needed.

## Output

Report the outcome in the conversation. A large or categorised error list — a strict-mode migration, a dependency bump that broke many files — is worth a `.tmp/build-errors-<YYYY-MM-DD>.md` write-up; see `.agents/README.md`. A single failure that you fixed immediately is not.

## Troubleshooting

- **"Build" fails without reaching Vite**: it's the `verify` gate — run `pnpm typecheck`, `pnpm lint`, and `pnpm test` separately to see which one
- **Service worker errors**: check `chrome://extensions/` → "Errors" or "service worker" link for logs
- **Content script not running**: check the extension is enabled and has permissions for the current site
- **Build fails with TS error**: run `pnpm typecheck` to see type errors clearly
- **TS1294 / TS2835 / TS1484 in `scripts/`**: the scripts run directly on Node's built-in type stripping, so `scripts/tsconfig.json` rejects what Node cannot strip — enums, parameter properties and namespaces (TS1294), relative imports without a `.ts` extension (TS2835), and type-only imports not marked `type` (TS1484)
- **`Set RTA_TARGET to one of: …`**: a Vite build was invoked without the env var — use the `pnpm build:*` scripts, which set it via `cross-env`
- **Vite build fails**: check that `src/popup/`, `src/options/`, `src/notifications/` each have their entry HTML file
