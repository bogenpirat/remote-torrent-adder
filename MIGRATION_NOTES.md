# Manifest V3 Migration Notes

This document outlines the changes made to migrate the Remote Torrent Adder Chrome extension from Manifest V2 to Manifest V3.

## Major Changes

### 1. Manifest.json Updates
- Updated `manifest_version` from 2 to 3
- Replaced `background.scripts` array with `background.service_worker`
- Replaced `browser_action` with `action`
- Added `host_permissions` array
- Updated `web_accessible_resources` to use new format with `resources` and `matches` arrays
- Added `storage` permission
- Removed `webRequestBlocking` permission (deprecated in V3)

### 2. Background Script Changes
- Created new `background.js` service worker that imports all required modules
- Replaced `chrome.extension.onRequest` with `chrome.runtime.onMessage`
- Replaced `chrome.browserAction` with `chrome.action`
- Replaced `localStorage` with `chrome.storage.local`
- Updated all storage operations to use async chrome.storage.local API
- Removed blocking webRequest listeners (deprecated in V3)
- Updated initialization to handle async storage operations

### 3. Content Script Changes
- Replaced `chrome.extension.sendRequest` with `chrome.runtime.sendMessage`
- Replaced `chrome.extension.onRequest` with `chrome.runtime.onMessage`
- Replaced `chrome.tabs.sendRequest` with `chrome.tabs.sendMessage`
- Replaced `chrome.extension.getURL` with `chrome.runtime.getURL`

### 4. Options Page Changes
- Updated all storage operations to use `chrome.storage.local`
- Replaced `localStorage` with async chrome.storage.local API
- Updated backup/restore functionality to work with new storage API
- Updated server configuration loading to handle async operations

### 5. Functions.js Changes
- Updated `RTA.displayResponse` to use chrome.storage.local
- Updated `RTA.constructContextMenu` to use chrome.storage.local
- Updated `RTA.genericOnClick` to use chrome.storage.local and chrome.tabs.sendMessage

## Limitations in Manifest V3

### WebRequest Blocking
- The extension can no longer modify HTTP headers directly due to the removal of blocking webRequest
- Referer and Origin header modification functionality has been disabled
- Authentication header injection has been disabled
- These features may need to be reimplemented using declarativeNetRequest if required

### Service Worker Limitations
- Service workers have different lifecycle management than background pages
- Some APIs may behave differently in service worker context

## Testing Recommendations

1. Test basic functionality:
   - Context menu creation
   - Torrent link detection
   - Server configuration
   - Options page functionality

2. Test storage operations:
   - Settings persistence
   - Server configuration saving/loading
   - Backup/restore functionality

3. Test communication:
   - Content script to background script messaging
   - Options page to background script messaging

## Known Issues

- HTTP header modification is no longer possible (CSRF protection workarounds disabled)
- Authentication injection is no longer possible
- Some WebUI clients may require manual authentication due to these limitations

## Future Improvements

- Consider implementing declarativeNetRequest rules for header modification
- Implement proper authentication handling for WebUI clients
- Add error handling for storage operations
- Consider using chrome.storage.sync for cross-device settings sync 