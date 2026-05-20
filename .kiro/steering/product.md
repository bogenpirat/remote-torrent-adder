---
inclusion: always
---

See `.agents/README.md` for full project documentation, agent definitions, and skill guides.

**Remote Torrent Adder** is a Chrome MV3 extension that intercepts torrent/magnet link clicks and sends them to BitTorrent client WebUIs (11 clients supported). Client integrations live in `src/webuis/`, extend `TorrentWebUI` from `src/models/webui.ts`, and are registered via the factory in `src/models/clients.ts`.
