# Skill: Debug a Client Integration

**Purpose**: Diagnose and fix issues with a specific BitTorrent client WebUI integration.

## When to Use

Use when a user reports that adding a torrent to a specific client is failing — auth errors, CORS issues, wrong API format, or unexpected HTTP responses.

## Diagnostic Approach

### 1. Identify the client file and run its tests

Client implementations are in `src/webuis/<clientname>-webui.ts`. Read the relevant file first, then run its existing test file — it encodes what the request is *supposed* to look like, and is the fastest way to see whether the bug is in our request construction or in the client's behaviour:

```bash
npx vitest run test/webuis/<clientname>-webui.test.ts
```

If the tests pass but the real client rejects the request, the bug is a mismatch between our model of the API and the real one — the test is asserting the wrong thing, and it needs updating alongside the fix.

### 2. Determine failure mode

Ask the user for or check:
- Error message from the notification (success: false, httpResponseCode, httpResponseBody)
- Network tab in Chrome DevTools (inspect background service worker requests)
- Chrome extension error console: `chrome://extensions/` → "Errors" button
- The Options page "Test Connection" button — distinguishes "can't reach the host at all" from "reached it, auth failed"

Common failure modes and their causes:

| Symptom | Likely Cause |
|---|---|
| `HTTP error 403` | Authentication failed or session expired |
| `HTTP error 400` | Wrong request format (body, content-type, field names) |
| `HTTP error 404` | Wrong API path or base URL misconfiguration |
| `HTTP error 409` | Torrent already exists, or (Transmission) missing session token header |
| `Failed to fetch` | CORS error, client offline, wrong host/port |
| `HTTP error 401` | Credentials rejected |
| `HTTP error 500` | Server-side error — check client logs |

`httpResponseCode: 0` means the failure was not an `HttpError` — the request never got a response (network failure, CORS block), and `httpResponseBody` holds the exception message.

### 3. CORS issues

The extension uses `declarativeNetRequest` to bypass CORS (removes Origin, sets Referer). If CORS is still failing:
- Check `src/util/cors-tricks.ts` — rules are applied per WebUI base URL. `test/util/cors-tricks.test.ts` asserts the rule shapes and is worth running first
- Ensure the WebUI's base URL is correctly formed (check `createBaseUrl()` output — note it drops the port for 80/http and 443/https)
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

### 7. Close the loop

Every fix should land with a regression test in `test/webuis/<clientname>-webui.test.ts` that fails before the fix and passes after. If the bug was only reproducible against a real client, say so explicitly and note which `smoke-test-matrix.md` row covers it.

## Output

Report the failure mode, root cause, and fix in the conversation. A debugging session with a non-obvious root cause is worth a `.tmp/debug-<clientname>-<YYYY-MM-DD>.md` write-up — see `.agents/README.md` — including steps tried and anything unresolved.

## Relevant Files

- `src/webuis/<clientname>-webui.ts` — client implementation
- `test/webuis/<clientname>-webui.test.ts` — its tests
- `src/models/webui.ts` — base class with `fetch()` wrapper, `HttpError`, and helpers
- `src/util/cors-tricks.ts` — CORS bypass implementation
- `src/util/authentication-listener.ts` — auth event handling
- `src/util/download.ts` — torrent file fetching and parsing
- `src/util/messaging.ts` — message flow between layers
