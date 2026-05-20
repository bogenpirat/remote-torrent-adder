---
description: Scaffold a complete new BitTorrent client WebUI integration for Remote Torrent Adder
---

Add a new BitTorrent client integration to this project. Before writing any code, ask me for:

1. The client's display name and what its WebUI API looks like
2. Authentication method (session token, basic auth, API key, cookie, or none)
3. How torrents are uploaded (multipart form with binary `.torrent`, magnet URI string, JSON body, or JSON-RPC)
4. Which features the client supports: labels, download directories, add-as-paused

Then follow the implementation guide in [`.agents/agents/add-webui-client.md`](../../.agents/agents/add-webui-client.md).

Key steps:
- Create `src/webuis/<name>-webui.ts` extending `TorrentWebUI`
- Add to `Client` enum and `ClientClassByClient` in `src/models/clients.ts`
- Type-check with `npx tsc --noEmit -p tsconfig.rollup.json`, then `npm run build`
