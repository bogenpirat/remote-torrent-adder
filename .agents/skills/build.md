# Skill: Build the Extension

## Commands

| Command | Output | Use Case |
|---|---|---|
| `npm run build` | `dist/` | Development build, unminified |
| `npm run build:prod` | `dist-prod/` | Production build, minified |
| `npm run dev` | `dist/` | Watch mode for development |
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

CI (`.github/workflows/build-extension.yml`) runs the same three plus `npm audit --audit-level=high` in a `verify` job that gates both the dev and prod build jobs.

## Build Pipeline (in order)

1. `rimraf dist` — clean output directory
2. `copy-assets` — copy `manifest.json`, HTML, CSS, images to `dist/`
3. Vite builds, one per target, all driven by the single `vite.config.ts`
   selected through the `RTA_TARGET` environment variable:
   - `RTA_TARGET=worker` → `dist/service_worker.js` (IIFE, self-contained)
   - `RTA_TARGET=content-script` → `dist/content-script/rta.js` (IIFE)
   - `RTA_TARGET=popup` → `dist/popup/`
   - `RTA_TARGET=options` → `dist/options/`
   - `RTA_TARGET=notifications` → `dist/notifications/`

The two IIFE targets are built through Vite's library mode because the
service worker and content script each have to be a single standalone file.

## Loading in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" → select the `dist/` folder
4. After code changes, click the reload icon on the extension card (or run `npm run build` and reload)

## Adding a new target

A new HTML page needs an entry in the `targets` map in `vite.config.ts`, a matching `build:<name>` script in `package.json`, and that script added to the `build:targets` chain.

## Output

Report the outcome in the conversation. A large or categorised error list — a strict-mode migration, a dependency bump that broke many files — is worth a `.tmp/build-errors-<YYYY-MM-DD>.md` write-up; see `.agents/README.md`. A single failure that you fixed immediately is not.

## Troubleshooting

- **"Build" fails without reaching Vite**: it's the `prebuild` gate — run `npm run typecheck`, `npm run lint`, and `npm test` separately to see which one
- **Service worker errors**: check `chrome://extensions/` → "Errors" or "service worker" link for logs
- **Content script not running**: check the extension is enabled and has permissions for the current site
- **Build fails with TS error**: run `npm run typecheck` to see type errors clearly
- **`Set RTA_TARGET to one of: …`**: a Vite build was invoked without the env var — use the `npm run build:*` scripts, which set it via `cross-env`
- **Vite build fails**: check that `src/popup/`, `src/options/`, `src/notifications/` each have their entry HTML file
