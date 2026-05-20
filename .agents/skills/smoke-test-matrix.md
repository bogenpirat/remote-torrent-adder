# Skill: Manual Smoke-Test Matrix

There is no automated test suite. This file is the **defined manual test pass** to run before a release, after touching a client class, or as a regression check after refactoring `TorrentWebUI`, `cors-tricks.ts`, `download.ts`, or messaging.

Reviewers should ask "did you run the smoke matrix?" instead of "did you test it?".

## Setup

1. `npm run build` and load `dist/` unpacked in `chrome://extensions/` (Developer mode on).
2. Have at least two clients configured: one **happy path** client you know works (e.g. local qBittorrent) and one **target** client for the change.
3. Open the service-worker console (`chrome://extensions/` → "service worker" link) before each case.
4. Keep a `.torrent` file and a `magnet:?xt=urn:btih:...` URL handy — any public test tracker works.

## Per-change matrix

Run only the rows relevant to the change. After a release bump, run the full matrix for **every** configured client.

### A. Link interception

| # | Scenario | Expected |
|---|---|---|
| A1 | Click a `.torrent` anchor on a normal page | Popup opens with the torrent name and file list |
| A2 | Click a magnet anchor | Popup opens with the `dn=` name (no file list) |
| A3 | Right-click a torrent link → context menu → "Send to <client>" | Torrent added directly, no popup |
| A4 | Click a `.torrent` link on a page where the URL matches the second default regex (`torrents.php?action=download`) | Popup opens |
| A5 | Click a link the regex should NOT match (e.g. plain HTML link) | Default browser navigation, no popup |

### B. Add flow per client

For each configured client, repeat both rows:

| # | Scenario | Expected |
|---|---|---|
| B1 | `.torrent` file: select client, optional label/dir, click Add | Torrent appears in the client UI with the chosen label/dir/paused state |
| B2 | Magnet URI: same flow | Torrent appears in the client UI |

Tick the client off only if BOTH pass.

| Client | B1 (.torrent) | B2 (magnet) |
|---|---|---|
| qBittorrent | | |
| Transmission | | |
| Deluge | | |
| ruTorrent | | |
| flood | | |
| BiglyBT | | |
| Elementum | | |
| Porla | | |
| Tixati | | |
| tTorrent | | |
| QNAP DownloadStation | | |

### C. Settings & overrides

| # | Scenario | Expected |
|---|---|---|
| C1 | Set a per-client `defaultLabel` and `defaultDir`; add a torrent without overriding in popup | Client receives the defaults |
| C2 | Override label and dir in the popup | Client receives the popup values, not the defaults |
| C3 | Configure an auto-label-dir rule matching a tracker; add a matching torrent without overriding in popup | Auto rule applied |
| C4 | Toggle `addPaused` per-torrent in popup (if `isAddPausedSupported`) | Torrent appears in the paused state |

### D. Failure modes (must produce a clear notification, not a silent fail)

| # | Scenario | Expected |
|---|---|---|
| D1 | Stop the client → add a torrent | Error notification ("Failed to fetch" or similar); no crash |
| D2 | Change the password in extension settings to a wrong value → add a torrent | Error notification with HTTP 401/403 |
| D3 | Point the WebUI host to a wrong port → add a torrent | Error notification within a few seconds |
| D4 | Add a malformed `.torrent` (truncate the file) | Error notification; service worker does NOT crash (check console) |
| D5 | Add a torrent that already exists in the client | Either success or a specific "already exists" message — but never a silent failure |

### E. Notifications & sound

| # | Scenario | Expected |
|---|---|---|
| E1 | With notifications enabled, add a torrent successfully | Desktop notification appears within `notificationsDurationMs` |
| E2 | With notification sound enabled, add successfully | Sound plays once |
| E3 | With notifications disabled, add successfully | No notification |
| E4 | Notification on error | Error notification surfaces the HTTP code or message |

### F. Options page & persistence

| # | Scenario | Expected |
|---|---|---|
| F1 | Add a new WebUI, save, reload extension (`chrome://extensions/` → reload) | WebUI persists |
| F2 | Edit an existing WebUI's host/port/secure | `cors-tricks` rule is updated (Network tab: no preflight failure on the new URL) |
| F3 | Delete a WebUI | Gone from list AND its CORS rule no longer matches (test by adding a torrent — must NOT route to the deleted host) |
| F4 | Import/export settings | Round-trip preserves all fields including `clientSpecificSettings` |

### G. Cross-extension hygiene (after refactors only)

| # | Scenario | Expected |
|---|---|---|
| G1 | Service-worker idles for >30s, then add a torrent | Worker wakes, add succeeds (catches stateful bugs) |
| G2 | Open the popup, close it without acting, reopen on a different link | Second popup shows the new torrent, not stale state |
| G3 | Build prod (`npm run build:prod`) and load `dist-prod/` | Same matrix passes on the minified bundle |

## What to record

When reporting a smoke-test pass on a PR, include:

- Which rows ran (e.g. "ran A1–A5, B1–B2 for qBittorrent + Transmission, D1–D5")
- Chrome version and OS
- Anything that surprised you (even if it passed)

That's enough to make "I tested it" auditable.
