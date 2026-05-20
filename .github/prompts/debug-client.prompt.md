---
description: Diagnose and fix issues with a specific BitTorrent client integration in Remote Torrent Adder
---

Debug a failing BitTorrent client integration. Ask me which client is failing and what symptom I see (error message, HTTP status code, or behaviour description).

Then follow the diagnostic guide in [`.agents/agents/debug-client.md`](../../.agents/agents/debug-client.md).

Quick symptom reference:
- `HTTP error 403` → auth failed or session expired
- `HTTP error 400` → wrong body format or content-type
- `HTTP error 404` → wrong API path
- `Failed to fetch` → client offline, wrong host/port, or CORS preflight failing
- `HTTP error 409` → torrent exists, or (Transmission) missing session token header
