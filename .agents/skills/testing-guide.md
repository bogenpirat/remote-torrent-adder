# Skill: Testing the Extension

Testing happens at two levels: an automated vitest suite that covers logic and components, and a manual Chrome pass that covers what a test runner structurally cannot.

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
| `test/helpers/chrome-mock.ts` | The `chrome.*` extension APIs (storage, runtime, notifications, dNR) |
| `test/helpers/fixtures.ts` | Building `WebUISettings`, `RTASettings`, `Torrent` objects |
| `test/helpers/assert.ts` | Shared assertions |

A new required field on `WebUISettings` or `RTASettings` must be added to `fixtures.ts` or every consumer breaks.

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

`npm run build` and `npm run build:prod` run all three first via `prebuild`, so a build can fail on a lint or test error. CI runs the same three plus `npm audit --audit-level=high` in a `verify` job gating both build jobs.

## Manual testing in Chrome

The automated suite cannot cover real link interception in a live page, a real round-trip to a running client, desktop notifications, or service-worker lifecycle. Those need a browser.

For a structured pre-release or post-refactor pass, use `smoke-test-matrix.md`. The scenarios below are the quick version.

### Setup

1. `npm run build`
2. Load unpacked extension from `dist/` in `chrome://extensions/` (Developer mode on)
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
1. Right-click the extension icon → Options (clicking the icon opens the configured WebUI in a new tab, not the options page)
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
