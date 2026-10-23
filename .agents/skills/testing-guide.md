# Skill: Testing the Extension

Testing happens at three levels: an automated vitest suite that covers logic and components, a Playwright suite that boots real headless Chrome and real Firefox with the extension loaded, and a manual pass in both browsers that covers what neither runner can.

## Automated tests

The suite lives in `test/`, mirroring the `src/` layout. Every client in `src/webuis/` has a matching `test/webuis/<name>-webui.test.ts`.

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report → coverage/
npx vitest run test/webuis/qbittorrent-webui.test.ts   # a single file
```

Stack: vitest + jsdom, `@testing-library/react` for components, `fake-indexeddb` for `src/util/idb.ts`. Global setup is `test/setup.ts`; config is `vitest.config.ts`.

### Helpers — use these instead of hand-rolling mocks

| Helper | Use for |
|---|---|
| `test/helpers/fetch-mock.ts` | Stubbing HTTP; asserting request URL, method, headers, and body |
| `test/helpers/chrome-mock.ts` | The extension APIs behind `ext` (storage, runtime, notifications, dNR). It stubs the global the shim resolves to, so tests exercise the same path production does |
| `test/helpers/fixtures.ts` | Building `WebUISettings`, `RTASettings`, `Torrent` objects |
| `test/helpers/assert.ts` | Shared assertions |

A new required field on `WebUISettings` or `RTASettings` must be added to `fixtures.ts` — and to `e2e/fixtures/settings.ts`, which seeds the same shape for the Playwright runs — or every consumer breaks.

### What to write a test for

- Client request construction — URL, method, body shape, the `File` filename on `.torrent` uploads, magnet vs file branching
- Auth exchanges, including the retry-with-token flows (Transmission's 409, Deluge's JSON-RPC login)
- Failure mapping — a non-OK response becoming `{ success: false }` with the status propagated
- Settings defaults, load/save round-trips, and fallback when a stored config predates the field
- Parsers (`bencode-decode`, `parsers`, `converter`, `serializer`) — including malformed input
- Auto-label/dir matching rules
- Options and popup components — that a control renders and its value reaches the outgoing config

### Gates

```bash
npm run typecheck
npm run lint
npm test
```

`npm run build` and `npm run build:prod` run all three first via `prebuild`, so a build can fail on a lint or test error. CI runs the same three (as `test:coverage`) plus `npm run audit` in a `verify` job gating both build jobs. `npm run test:e2e` runs in its own job on `master` only, against the artifact `build-dev` produces.

## End-to-end tests in headless browsers

The suite lives in `e2e/` and runs on Playwright, separately from vitest, as two
projects: `chrome` (everything outside `e2e/firefox/`) and `firefox`
(`e2e/firefox/**`). `npm run test:e2e` runs both; `test:e2e:chrome` and
`test:e2e:firefox` run one.

```bash
npm run build         # required first: the suite loads dist/chrome/ as an unpacked extension
npm run build:firefox # required too: the firefox project loads dist/firefox/
npm run test:e2e
npm run test:e2e:headed   # watch it happen
npm run test:e2e:ui       # Playwright's UI mode
```

First-time setup needs `npx playwright install chromium`. Extensions only load in headless mode under `channel: 'chromium'` (the default headless shell cannot load them), which the fixture already sets.

What it covers: the service worker booting on an empty, a configured, a corrupt and a half-configured profile; the options page and every tab; the popup in all three modes; content-script link catching on a real page; and a full add-torrent round-trip against a stub qBittorrent server.

| Piece | Purpose |
|---|---|
| `e2e/fixtures/extension.ts` | Launches the profile, exposes the worker, seeds storage, restarts the browser |
| `e2e/fixtures/console-collector.ts` | Captures console output from every surface and decides what counts as a failure |
| `e2e/fixtures/fake-qbittorrent.ts` | Stub client that records the requests it receives |
| `e2e/fixtures/static-site.ts` | Serves a page with torrent links and a real bencoded `.torrent` |
| `e2e/fixtures/firefox-extension.ts` | The Firefox harness: installs the add-on, exposes the same helpers |
| `e2e/fixtures/fake-flood.ts` | Stub flood, with a configurable delay on authenticate |

### Why Firefox needs its own harness

Playwright cannot install a Firefox add-on — extension support is Chromium-only,
and Puppeteer's `installExtension` for Firefox is broken and closed as
not-planned. `e2e/firefox/` therefore drives a real Firefox through geckodriver
and `selenium-webdriver`, kept as a second Playwright *project* so there is still
one command and one report. It needs a system Firefox (149+); Selenium Manager
fetches geckodriver itself, and CI installs Firefox with
`browser-actions/setup-firefox`.

Three Firefox facts shape `firefox-extension.ts`, and they are the reason it
cannot simply mirror `extension.ts`:

1. **There is no service worker to evaluate in.** The MV3 background is an event
   page that Selenium cannot address, so every extension API call is routed
   through an extension page, which shares the same storage, the same
   declarativeNetRequest rules and the same messaging bus.
2. **The add-on gets a random per-profile UUID**, so `moz-extension://` origins
   cannot be hardcoded. The harness reads it back out of the profile's
   `prefs.js`. Seeding the pref up front does not work: on a fresh profile
   Firefox rewrites the whole map as it registers its built-ins.
3. **Extension pages are not web accessible**, so a content-initiated navigation
   to one is refused. The tab is opened from chrome context with the system
   principal, which is why geckodriver is started with `--allow-system-access`.
   The alternative — declaring `web_accessible_resources` — would expose the
   options and popup pages to every website purely to suit the tests.

Two Firefox-specific gotchas when writing a spec there:

- **Match patterns cannot carry a port.** `tabs.query({url})` rejects
  `http://127.0.0.1:1234/*` on Firefox where Chrome tolerates it; use
  `http://127.0.0.1/*`, which matches any port.
- **Latency can be load-bearing.** `buffered-add.e2e.spec.ts` gives the stub
  client a 3s delay on authenticate on purpose: flood authenticates before it
  encodes the torrent, and without that gap the payload read wins the race
  against the buffered record being cleared, hiding the bug the spec exists to
  catch.

Two things to know before adding a spec:

- **Seeding races the boot.** On a fresh profile the worker writes its own defaults. `launch()` waits that out, so `seedSettings` is safe, but a seed followed immediately by a browser close can still be overtaken. Use `extension.restart()` (which closes and reopens the same profile) rather than `chrome.runtime.reload()` — a reloaded extension has no pending event, so Chrome leaves its worker dormant and the test hangs.
- **Only errors fail.** The extension logs plenty at `debug`/`log` level, and a few warnings are normal (a cold worker, the service-worker download fallback). `console-collector.ts` fails on any `error`, any page exception, and any warning not on its allowlist. Adding to that allowlist needs a source reference; a spec that legitimately expects an error passes it to `unexpectedProblems([/pattern/])` instead.

## Integration tests against real clients in Docker

`test/it/` drives the real extension (Playwright + Chrome, the same harness as `e2e/`) against real BitTorrent clients started from public Docker images. It is not part of `npm test`, `verify` or `prebuild`, because it needs a running Docker engine and pulls several images. In CI it runs as the `integration` job on `master` only, in parallel with `e2e`, with one retry per test and an HTML report uploaded as `playwright-report-it`. The job has `continue-on-error: true`: it runs against each client's latest image, so a red run can come from a client release rather than the merge, and it reports without failing `master` until it has proven stable. When the repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (a read-only access token) are set, the job logs in to Docker Hub first, so the ruTorrent, flood and rqbit pulls count against that account instead of the runner's shared IP; without them it pulls anonymously.

```bash
npm run build              # the suite loads dist/chrome/
npm run test:it            # every client in parallel, one worker per client
npm run test:it -- deluge  # one client: only its containers start
npm run test:it:headed     # one worker, so the browsers open one at a time
RTA_IT_KEEP=1 npm run test:it -- qbittorrent   # leave the containers running afterwards to poke at the WebUI
```

`test/it/docker-compose.yml` holds one compose profile per client; each spec brings up only its own profile as project `rta-it-<client>` in `beforeAll` and removes it with `down -v` in `afterAll`. No custom images are built — clients are configured through environment variables and API calls in each probe's `prepare()`. Every image runs at its `latest` tag and is pulled again on every run (`up --pull always`), so the suite always checks RTA against each client's newest release; a red run can therefore come from a client update rather than an RTA change, and needs network access to the registries. To test an older release, swap the tag in the compose file for that run. Host ports are fixed in the 18xxx range and bound to 127.0.0.1. `test:it` runs with `--workers=100%`: each spec file owns its compose project and ports, so the clients run side by side while the tests inside one file stay serial on the stack its `beforeAll` started.

Each `test/it/<client>.it.spec.ts` calls `defineClientSuite(probe)` (`fixtures/client-suite.ts`), which derives the matrix from the client's `isLabelSupported` / `isDirSupported` / `isAddPausedSupported`: `.torrent` and magnet without options, label, directory, paused, all three combined, setting a label after the add (the notification's "Add label" button path, through the worker's `setTorrentLabel` message), the WebUI defaults (the no-config fallback path), wrong credentials, and the connection test. Each add goes through the worker's real `addTorrent` message; the result is read back from the client's own API by the probe in `fixtures/clients/<client>.ts`. Every test generates a fresh torrent (random pieces, `.invalid` tracker) or a random-hash magnet, so nothing needs cleaning up and nothing is ever downloaded.

| Client | Image | Notes |
|---|---|---|
| qBittorrent | `linuxserver/qbittorrent` | Web UI port must equal the host port, or qBittorrent's host header validation answers 401. `prepare()` reads the temporary password from the logs and sets fixed credentials. |
| Transmission | `linuxserver/transmission` | Basic auth, answered by the extension's `onAuthRequired` listener |
| Deluge | `linuxserver/deluge` | `prepare()` connects the web UI to the daemon (RTA never calls `web.connect`) and enables the Label plugin |
| ruTorrent | `crazymax/rtorrent-rutorrent` | Basic auth from an htpasswd entry inlined as a compose `config`, answered by the extension's `onAuthRequired` listener. A fresh ruTorrent rejects every add until `php/getplugins.php` has been requested once. |
| flood | `jesec/flood` + Transmission | `prepare()` registers the first user and its backend |
| Porla | `ghcr.io/porla/porla` | State dir on a tmpfs, `PORLA_HTTP_HOST=0.0.0.0` so the port mapping reaches it. `prepare()` creates the first user with `auth.init` while `sys.status` reports `setup`. A torrent is only user-paused when libtorrent's `paused` flag is set without `auto_managed`. |
| rqbit | `ikatson/rqbit` | Adding a magnet blocks until metadata resolves, so magnet cases are skipped. The add endpoint has no `paused` parameter; RTA pauses through `/torrents/{id}/pause` afterwards. |

Not covered, and left to the smoke test matrix: BiglyBT and Tixati (the web interface has to be enabled in the desktop GUI), Elementum (Kodi add-on), tTorrent (Android app), QNAP and Synology Download Station (NAS firmware).

## Manual testing in a real browser

Desktop notifications actually appearing, real clients, Cloudflare-protected trackers, and cross-browser behaviour still need hands on a browser. Chrome scenarios follow; the Firefox pass is section H of `smoke-test-matrix.md`, and `npm run dev:firefox` launches a scratch profile with the add-on loaded.

For a structured pre-release or post-refactor pass, use `smoke-test-matrix.md`. The scenarios below are the quick version.

### Setup

1. `npm run build`
2. Load unpacked extension from `dist/chrome/` in `chrome://extensions/` (Developer mode on)
3. Have at least one torrent client configured in the extension options

### Test Scenarios

#### Torrent link interception (happy path)
1. Navigate to any torrent site (e.g. a tracker with public `.torrent` links)
2. Click a `.torrent` download link
3. The extension popup should open showing the torrent name and file list
4. Select a WebUI, optionally set label/directory
5. Click "Add" — verify the torrent appears in the client

#### Magnet link interception
1. Click a `magnet:?xt=urn:btih:...` link
2. Popup should open with the torrent name from the `dn=` parameter
3. Add to client — verify it appears

#### Context menu
1. Right-click a torrent or magnet link
2. Look for "Send to <client>" in context menu
3. Torrent should be added directly without opening popup

#### Options page
1. Right-click the extension icon → Options. Left-clicking the icon does whatever `iconClickAction` is set to — opening the primary WebUI in a new tab (the default), showing the WebUI picker, or showing the page's links — never the options page
2. Add a new WebUI configuration
3. Click "Test Connection" to verify credentials — note that a client whose `isConnectionTestSupported` is false won't show the button, and the base implementation reports reachability only
4. Configure auto-label rules and verify they apply

#### Notifications
1. Enable notifications in Options → Notifications tab
2. Add a torrent — verify desktop notification appears on success
3. Verify error notification appears when client is unreachable

## Debugging Tips

- **Service worker logs**: `chrome://extensions/` → extension card → "service worker" link → Console tab
- **Content script logs**: DevTools on the page where you clicked the torrent link → Console tab
- **Popup/options logs**: right-click the popup/options page → Inspect
- **Network requests**: DevTools on the service worker → Network tab (shows requests the extension makes to client APIs)
- **Storage state**: DevTools on any extension page → Application → Storage → Extension storage

## Testing a New Client Implementation

1. Write `test/webuis/<name>-webui.test.ts` first — it pins the request shape without needing the client running
2. Configure the new client in Options
3. Start the client's WebUI locally or on a test server
4. Try adding a `.torrent` file and a magnet link
5. Verify in the client that the torrent appears with correct label/directory
6. Test with wrong credentials to verify error handling
7. Test with the client offline to verify the error notification
