# Remote Torrent Adder — Agentic Programming Hub

This folder is the central source of truth for AI-assisted development on this project. Agent definitions, skills, and orchestration files for Claude Code, GitHub Copilot, and Kiro all reference or are generated from here.

## Project at a Glance

**Remote Torrent Adder** is a Chrome Manifest V3 browser extension. When a user clicks a `.torrent` or magnet link on any web page, the extension intercepts it, shows a popup for label/directory selection, then sends the torrent directly to a configured BitTorrent client WebUI — no local file download needed.

Supported clients: ruTorrent, flood, qBittorrent, BiglyBT, Deluge, Elementum, Transmission, Porla, Tixati, tTorrent, QNAP DownloadStation.

## Architecture Summary

| Layer | Files | Role |
|---|---|---|
| Service Worker | `src/service_worker.ts` | Background process: settings, auth, context menu, CORS rules |
| Content Script | `src/content-script/rta.ts` | Detects torrent/magnet links, intercepts clicks |
| Popup UI | `src/popup/` | React app for torrent preview + label/dir selection |
| Options UI | `src/options/` | React app for all settings (clients, notifications, link catching) |
| Client Impls | `src/webuis/<name>-webui.ts` | One class per BitTorrent client, extends `TorrentWebUI` |
| Factory | `src/models/clients.ts` | `Client` enum + `ClientClassByClient` map + `WebUIFactory` |
| Base Class | `src/models/webui.ts` | Abstract `TorrentWebUI` with `sendTorrent()` interface |

**Build system**: Three separate Vite builds (popup, options, notifications) + Rollup for service worker and content script. Output: `dist/` (dev), `dist-prod/` (prod).

## Key Conventions

- TypeScript (strict mode **off**), React 19, Tailwind CSS
- `TorrentWebUI` subclasses named `<Name>WebUI` in `src/webuis/<name>-webui.ts`
- Service worker is **stateless** (MV3) — all state goes to `chrome.storage.local`
- Use `this.fetch()` (base class wrapper) for HTTP — it throws on non-OK responses
- CORS bypass: `declarativeNetRequest` removes Origin header and sets Referer per-client
- No automated tests — verify by loading the unpacked extension in Chrome

## Available Agents

| Agent | Purpose | Claude Code | Copilot | Kiro |
|---|---|---|---|---|
| `add-webui-client` | Scaffold a new BitTorrent client implementation | `.claude/agents/` | `.github/prompts/` | steering context |
| `debug-client` | Debug auth/API/CORS issues with a specific client | `.claude/agents/` | `.github/prompts/` | steering context |
| `add-setting` | Add a new global, per-client, or per-torrent setting | `.claude/agents/` | `.github/prompts/` | steering context |
| `release-manager` | Bump versions and prepare a release | `.claude/agents/` | `.github/prompts/` | hook |
| `code-reviewer` | Review code with project-specific knowledge | `.claude/agents/` | `.github/prompts/` | steering context |

## Available Skills

| Skill | Description |
|---|---|
| `build` | Build the extension for dev or production |
| `testing-guide` | How to manually test the extension in Chrome |
| `smoke-test-matrix` | Defined pre-release/post-refactor manual test matrix (rows A–G) |
| `security-review` | Project-tailored security checklist (credentials, content-script, CORS bypass, regex DoS) |

## Tool-Specific Locations

```
.claude/agents/          ← Claude Code sub-agents (invoked via /agents or automatically)
.github/copilot-instructions.md  ← GitHub Copilot workspace instructions
.github/prompts/         ← GitHub Copilot reusable prompt files
.kiro/steering/          ← Kiro always-on context documents
.kiro/hooks/             ← Kiro automation hooks
```

## Quick Reference: Common Tasks

### Add a new torrent client
1. Create `src/webuis/<name>-webui.ts` extending `TorrentWebUI`
2. Add entry to `Client` enum in `src/models/clients.ts`
3. Add entry to `ClientClassByClient` map in `src/models/clients.ts`
4. Run `npm run build` to verify

### Run a development build
```
npm run build        # one-shot dev build
npm run watch        # watch mode (assets + rollup, manual Vite rebuild needed)
npm run dev          # alias for watch
```

### Release a new version
1. Update `"version"` in `package.json`
2. Update `"version"` in `src/manifest.json`
3. Run `npm run build:prod`
4. Commit both files with message `bump version to X.Y.Z`

### Test in Chrome
1. `npm run build`
2. Open `chrome://extensions/`
3. Enable Developer mode
4. "Load unpacked" → select `dist/`
5. Reload extension after changes
