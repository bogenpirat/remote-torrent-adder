---
description: Add a new configurable setting to Remote Torrent Adder, wired through the correct scope — global, per-client, or per-torrent override
---

Add a new setting to this project. Before writing any code, ask me:

1. What the setting does
2. Whether it's global (affects all behaviour), per-client (configured per WebUI in Options), or per-torrent (user can also override it in the popup per-torrent)

Then follow the implementation guide in [`.agents/agents/add-setting.md`](../../.agents/agents/add-setting.md).

After all changes, run `npx tsc --noEmit` and `npm run build` to verify.
