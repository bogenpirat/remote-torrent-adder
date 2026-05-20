# Remote Torrent Adder

Chrome MV3 extension that intercepts torrent/magnet links and sends them to BitTorrent client WebUIs.

Full agent definitions, skills, and project context: [`.agents/README.md`](.agents/README.md)

## Key Commands

```bash
npm run build          # dev build → dist/
npm run build:prod     # production build → dist-prod/
npm run watch          # watch mode
npx tsc --noEmit -p tsconfig.rollup.json  # type-check service worker + clients
```

Load unpacked extension from `dist/` in `chrome://extensions/` (Developer mode on).

## Architecture

- **`src/service_worker.ts`** — stateless background process (MV3: no persistent state, use `chrome.storage`)
- **`src/content-script/rta.ts`** — injected into all pages, intercepts torrent/magnet link clicks
- **`src/popup/`** — React app: torrent preview + add configuration
- **`src/options/`** — React app: all settings (clients, notifications, link catching)
- **`src/webuis/<name>-webui.ts`** — one class per BitTorrent client, extends `TorrentWebUI`
- **`src/models/clients.ts`** — `Client` enum + `ClientClassByClient` map + `WebUIFactory`
- **`src/models/webui.ts`** — abstract `TorrentWebUI` base class

## Critical Constraints

- Service worker **must be stateless** — no module-level mutable state. Persist to `chrome.storage`.
- Use `this.fetch()` (not raw `fetch()`) — it throws on non-OK responses.
- **Never** set `Content-Type: multipart/form-data` manually with FormData — browser sets it with boundary.
- `Torrent.data` is `Blob | string` — Blob for `.torrent` uploads, magnet URI string when `torrent.isMagnet === true`. Always branch on `torrent.isMagnet`. (There is no `torrent.url` or `torrent.blob`.)
- Use `??` not `||` for settings defaults — `false` and `0` are valid values.

## Sub-Agents

See [`.agents/README.md`](.agents/README.md) for the full agent/skill hub.

| Agent | Purpose |
|---|---|
| `add-webui-client` | Scaffold a new client integration |
| `debug-client` | Debug client auth/API failures |
| `add-setting` | Add a new global, per-client, or per-torrent setting |
| `release-manager` | Bump version and prepare release |
| `code-reviewer` | Review changes with project context |
