# Skill: Build the Extension

## Commands

| Command | Output | Use Case |
|---|---|---|
| `npm run build` | `dist/` | Development build, unminified |
| `npm run build:prod` | `dist-prod/` | Production build, minified with terser |
| `npm run watch` | `dist/` | Watch mode for development |
| `npm run clean` | — | Remove `dist/` |
| `npx tsc --noEmit` | — | Type-check everything (root `tsconfig.json`; bundler-style module resolution, used by Vite for popup/options) |
| `npx tsc --noEmit -p tsconfig.rollup.json` | — | Type-check with the module resolution Rollup uses (node, no `allowJs`). Both configs include `src/**/*`, but the Rollup one catches the subset of issues that only surface under non-bundler resolution — run it before commits that touch `src/webuis/`, `src/service_worker.ts`, `src/content-script/`, or `src/models/`. |

## Build Pipeline (in order)

1. `rimraf dist` — clean output directory
2. `copy-assets` — copy `manifest.json`, HTML, CSS, images to `dist/`
3. `rollup -c` — bundle `service_worker.ts` + `content-script/rta.ts` → IIFE format
4. Vite builds (parallel):
   - `vite build --config vite.popup.config.ts` → `dist/popup/`
   - `vite build --config vite.options.config.ts` → `dist/options/`
   - `vite build --config vite.notifications.config.ts` → `dist/notifications/`

## Loading in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" → select the `dist/` folder
4. After code changes, click the reload icon on the extension card (or run `npm run build` and reload)

## Output

If the build or type-check fails, save the full error output to `.tmp/build-errors-<YYYY-MM-DD>.md` using the structure from `.agents/README.md`. Include: command run, error list with file:line references, root cause, and fix applied.

## Troubleshooting

- **Service worker errors**: check `chrome://extensions/` → "Errors" or "service worker" link for logs
- **Content script not running**: check the extension is enabled and has permissions for the current site
- **Build fails with TS error**: run `npx tsc --noEmit` to see type errors clearly
- **Vite build fails**: check that `src/popup/`, `src/options/`, `src/notifications/` each have their entry HTML file
