# Skill: Build the Extension

## Commands

| Command | Output | Use Case |
|---|---|---|
| `npm run build` | `dist/` | Development build, unminified |
| `npm run build:prod` | `dist-prod/` | Production build, minified |
| `npm run dev` | `dist/` | Watch mode for development |
| `npm run clean` | — | Remove `dist/` |
| `npm run typecheck` | — | Type-check `src/` and `test/` (`tsc --noEmit`) |

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

## Output

If the build or type-check fails, save the full error output to `.tmp/build-errors-<YYYY-MM-DD>.md` using the structure from `.agents/README.md`. Include: command run, error list with file:line references, root cause, and fix applied.

## Troubleshooting

- **Service worker errors**: check `chrome://extensions/` → "Errors" or "service worker" link for logs
- **Content script not running**: check the extension is enabled and has permissions for the current site
- **Build fails with TS error**: run `npx tsc --noEmit` to see type errors clearly
- **Vite build fails**: check that `src/popup/`, `src/options/`, `src/notifications/` each have their entry HTML file
