# Remote Torrent Adder — Copilot Instructions

Full project documentation, agent definitions, and skill guides live in [`.agents/README.md`](./../.agents/README.md).

## Quick Summary

Chrome MV3 browser extension (TypeScript + React 19 + Tailwind). Intercepts torrent/magnet link clicks and sends them to BitTorrent client WebUIs. 11 supported clients, each implemented as a class in `src/webuis/<name>-webui.ts` extending the `TorrentWebUI` abstract base class.

Key constraints:
- Service worker must be stateless (MV3) — use `chrome.storage`, not module-level variables
- Use `this.fetch()` from the base class, not raw `fetch()` — it throws on non-OK
- Never set `Content-Type: multipart/form-data` manually with FormData
- `Torrent.data` is `Blob | string`; branch on `torrent.isMagnet` (no `torrent.url`/`torrent.blob` fields exist)

## Reusable Prompts

See [`.github/prompts/`](./../.github/prompts/) for prompt files covering: adding a client, debugging, releasing, and code review.
