---
inclusion: fileMatch
fileMatchPattern: 'src/**'
---

See `.agents/agents/add-webui-client.md` and `.agents/agents/code-reviewer.md` for architecture details and conventions.

Service worker is stateless (MV3). Use `this.fetch()` not raw `fetch()`. Never manually set `Content-Type: multipart/form-data`. `Torrent.data` is `Blob | string` — branch on `torrent.isMagnet` (no `torrent.url`/`torrent.blob`). Use `??` not `||` for settings defaults.
