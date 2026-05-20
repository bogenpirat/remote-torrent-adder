# Skill: Testing the Extension

There is no automated test suite. All testing is manual via Chrome.

## Setup

1. `npm run build`
2. Load unpacked extension from `dist/` in `chrome://extensions/`
3. Have at least one torrent client configured in the extension options

## Test Scenarios

### Torrent link interception (happy path)
1. Navigate to any torrent site (e.g. a tracker with public `.torrent` links)
2. Click a `.torrent` download link
3. The extension popup should open showing the torrent name and file list
4. Select a WebUI, optionally set label/directory
5. Click "Add" — verify the torrent appears in the client

### Magnet link interception
1. Click a `magnet:?xt=urn:btih:...` link
2. Popup should open with the torrent name from the `dn=` parameter
3. Add to client — verify it appears

### Context menu
1. Right-click a torrent or magnet link
2. Look for "Send to <client>" in context menu
3. Torrent should be added directly without opening popup

### Options page
1. Right-click the extension icon → Options (clicking the icon opens the configured WebUI in a new tab, not the options page)
2. Add a new WebUI configuration
3. Verify credentials work (click "Test connection" if available)
4. Configure auto-label rules and verify they apply

### Notifications
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

1. Configure the new client in Options
2. Start the client's WebUI locally or on a test server
3. Try adding a `.torrent` file and a magnet link
4. Verify in the client that torrent appears with correct label/directory
5. Test with wrong credentials to verify error handling
6. Test with client offline to verify error notification
