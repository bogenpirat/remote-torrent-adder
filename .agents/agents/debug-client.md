# Agent: debug-client

**Purpose**: Diagnose and fix issues with a specific BitTorrent client WebUI integration.

## When to Use

Invoke when a user reports that adding a torrent to a specific client is failing — auth errors, CORS issues, wrong API format, or unexpected HTTP responses.

## Diagnostic Approach

### 1. Identify the client file

Client implementations are in `src/webuis/<clientname>-webui.ts`. Read the relevant file first.

### 2. Determine failure mode

Ask the user for or check:
- Error message from the notification (success: false, httpResponseCode, httpResponseBody)
- Network tab in Chrome DevTools (inspect background service worker requests)
- Chrome extension error console: `chrome://extensions/` → "Errors" button

Common failure modes and their causes:

| Symptom | Likely Cause |
|---|---|
| `HTTP error 403` | Authentication failed or session expired |
| `HTTP error 400` | Wrong request format (body, content-type, field names) |
| `HTTP error 404` | Wrong API path or base URL misconfiguration |
| `HTTP error 409` | Torrent already exists in client |
| `Failed to fetch` | CORS error, client offline, wrong host/port |
| `HTTP error 401` | Credentials rejected |
| `HTTP error 500` | Server-side error — check client logs |

### 3. CORS issues

The extension uses `declarativeNetRequest` to bypass CORS (removes Origin, sets Referer). If CORS is still failing:
- Check `src/util/cors-tricks.ts` — rules are applied per WebUI base URL
- Ensure the WebUI's base URL is correctly formed (check `createBaseUrl()` output)
- Some clients validate the Referer header value — the current code sets it to the base URL

To debug: open Chrome DevTools on the service worker (`chrome://extensions/` → "service worker" link), then Network tab. Look for OPTIONS preflight requests (means CORS bypass isn't working).

### 4. Authentication debugging

Most clients use session-based auth that expires. Check:
- Does the client class request a new session for each `sendTorrent()` call? (Correct pattern)
- Is the client using cookies? Chrome extension fetch requests don't automatically share cookies with page — need `credentials: 'include'` and the session must be established in the same fetch context.
- Transmission requires `X-Transmission-Session-Id` header — it returns 409 on first request with the correct ID in the response header.

### 5. API format issues

Check the client's actual API:
- qBittorrent v5+ changed login flow (check `qbittorrent-webui.ts` for reference)
- Some clients require `Content-Type: application/x-www-form-urlencoded` even for binary uploads
- Deluge uses JSON-RPC with a specific method name and params array
- ruTorrent uses XML-RPC

### 6. Common fixes

**Wrong torrent data handling**:
```typescript
// `torrent.data` is `Blob | string` — Blob for .torrent files, string (magnet URI) when isMagnet.
// Always branch on `torrent.isMagnet`, never on parsing the data field.
// When appending the binary, wrap it in a File so the multipart filename and content-type are set:
form.append("torrents", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));
// NOT: form.append("torrents", torrent.data as Blob) — missing filename causes some clients to reject.
```

**Missing content-type**:
```typescript
// Don't manually set Content-Type for FormData — browser sets it with boundary:
// ✓ body: form  (no Content-Type header)
// ✗ headers: { 'Content-Type': 'multipart/form-data' }  (breaks boundary)
```

**Magnet vs .torrent branch**:
```typescript
if (torrent.isMagnet) {
    // torrent.data is the magnet URI string — send as URL/string
    body.append("urls", torrent.data as string);
} else {
    // torrent.data is a Blob — send as binary, wrapped in File
    body.append("torrents", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));
}
```

## Output

Save the diagnostic session to `.tmp/debug-<clientname>-<YYYY-MM-DD>.md` using the structure from `.agents/README.md`. Include: failure mode, root cause, steps tried, fix applied, and any unresolved items.

## Relevant Files

- `src/webuis/<clientname>-webui.ts` — client implementation
- `src/models/webui.ts` — base class with `fetch()` wrapper and helpers
- `src/util/cors-tricks.ts` — CORS bypass implementation
- `src/util/authentication-listener.ts` — auth event handling
- `src/util/download.ts` — torrent file fetching and parsing
- `src/util/messaging.ts` — message flow between layers
