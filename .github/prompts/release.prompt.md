---
description: Prepare a new version release for Remote Torrent Adder — bump versions, verify build, create release commit
---

Prepare a new release. Ask me whether this is a patch, minor, or major version bump (or the exact target version).

Then follow the release guide in [`.agents/agents/release-manager.md`](../../.agents/agents/release-manager.md).

Key steps:
- Update `"version"` in both `package.json` and `src/manifest.json` (must match)
- Run `npm run build:prod` to verify
- Commit: `git commit -m "bump version to X.Y.Z"`
- Do not push unless I explicitly ask
