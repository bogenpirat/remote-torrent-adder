---
description: Scaffold a complete new BitTorrent client WebUI integration for Remote Torrent Adder
---

Add a new BitTorrent client integration to this project. Before writing any code, ask me for:

1. The client's display name and what its WebUI API looks like
2. Authentication method (session token, basic auth, API key, cookie, or none)
3. How torrents are uploaded (multipart form with binary `.torrent`, magnet URI string, JSON body, or JSON-RPC)
4. Which features the client supports: labels, download directories, add-as-paused

Then read [`.agents/skills/add-webui-client.md`](../../.agents/skills/add-webui-client.md) and follow it. Registering a client touches three separate tables and a test file — the guide has the details, and getting it from memory instead will not compile.
