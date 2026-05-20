# Agent: add-webui-client

**Purpose**: Scaffold and implement a new BitTorrent client WebUI integration for Remote Torrent Adder.

## When to Use

Invoke this agent when a user wants to add support for a BitTorrent client that is not yet in the list of supported clients.

## Required Information

Before starting, collect from the user:
- Client name (e.g. "Transmission", "MyClient")
- Client's WebUI API documentation or endpoint information
- Authentication method (session token, basic auth, cookie, API key, none)
- Torrent upload method (multipart form with binary `.torrent`, magnet URI string, JSON body, XML-RPC)
- Whether the client supports labels, download directories, and/or add-as-paused

## Implementation Steps

### Step 1: Create the client file

Create `src/webuis/<clientname>-webui.ts` (lowercase, hyphenated).

```typescript
import { TorrentWebUI, TorrentAddingResult } from '../models/webui';
import { Torrent, TorrentUploadConfig } from '../models/torrent';

export class <ClientName>WebUI extends TorrentWebUI {

    get isLabelSupported(): boolean { return false; }   // set true if supported
    get isDirSupported(): boolean { return false; }      // set true if supported
    get isAddPausedSupported(): boolean { return false; } // set true if supported

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        // 1. Authenticate if needed
        // 2. Build request body — branch on `torrent.isMagnet`
        // 3. POST torrent to client API
        // 4. Return { success, httpResponseCode, httpResponseBody }
    }
}
```

Base classes already define a no-op constructor — don't redeclare one unless you need to do extra setup.

Key base class helpers available (`src/models/webui.ts`):
- `this.createBaseUrl()` → `http(s)://host[:port][/relativePath]`
- `this.fetch(url, options)` → throws on non-OK HTTP response
- `this.getLabel(config)` → `config.label ?? settings.defaultLabel ?? null`
- `this.getDirectory(config)` → `config.dir ?? settings.defaultDir ?? null`
- `this.getAddPaused(config)` → `config.addPaused ?? settings.addPaused ?? false`

Torrent object shape (`src/models/torrent.ts`):
```typescript
interface Torrent {
  data: Blob | string;  // Blob for .torrent uploads; magnet URI string when isMagnet
  name: string;
  isMagnet: boolean;    // ALWAYS branch on this — do not parse the data field
  trackers?: string[];
  files?: string[];
  isPrivate?: boolean;
}
```

When uploading the `.torrent` blob, wrap it in a `File` so the multipart filename is set:
```typescript
form.append("torrents", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));
```

### Step 2: Register the client

Edit `src/models/clients.ts`:

1. Add to the `Client` enum:
```typescript
export enum Client {
    // ... existing entries ...
    <ClientName>WebUI = "<DisplayName> WebUI",
}
```

2. Add to `ClientClassByClient`:
```typescript
import { <ClientName>WebUI } from '../webuis/<clientname>-webui';

export const ClientClassByClient: Record<Client, ConcreteTorrentWebUIConstructor> = {
    // ... existing entries ...
    [Client.<ClientName>WebUI]: <ClientName>WebUI,
};
```

### Step 3: Verify

Run `npm run build` (or `npx tsc --noEmit` for type-check only) and fix any errors.

## Common Authentication Patterns

Each pattern points to a real client implementation in `src/webuis/` — copy from there rather than the abstract snippet.

### Session cookie via login endpoint — see `qbittorrent-webui.ts`
POST `username`/`password` as `application/x-www-form-urlencoded` to `/api/v2/auth/login`; the SID cookie is set automatically by the browser for subsequent fetches.

### Session-header challenge — see `transmission-webui.ts`
First POST to `/transmission/rpc` returns HTTP 409 with `X-Transmission-Session-Id` header; resend with that header set.

### JSON-RPC login returning a token — see `porla-webui.ts`, `deluge-webui.ts`
Porla: POST JSON `{username, password}` to `/api/v1/auth/login`, receive token, pass in subsequent JSON-RPC calls. Deluge: POST JSON-RPC `auth.login` with the password.

### JSON-body login returning a cookie — see `flood-webui.ts`
POST JSON `{username, password}` to `/api/auth/authenticate`; session cookie set by browser.

### XML-RPC — see `rutorrent-webui.ts`
Build an XML body and POST with `Content-Type: text/xml`.

## Common Upload Patterns

### Multipart form with binary `.torrent` (qBittorrent style)
```typescript
const form = new FormData();
form.append("torrents", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));
if (this.getDirectory(config)) form.append("savepath", this.getDirectory(config));
await this.fetch(`${this.createBaseUrl()}/api/v2/torrents/add`, { method: "POST", body: form });
```

### Magnet URI string in a JSON body
```typescript
await this.fetch(`${this.createBaseUrl()}/api/endpoint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: torrent.data as string }),  // torrent.isMagnet must be true
});
```

### Split branches by magnet vs file — see `flood-webui.ts`, `deluge-webui.ts`, `rutorrent-webui.ts`
Different endpoints or payload shapes for `torrent.isMagnet === true` vs `false`. Branch in `sendTorrent` itself; do not try to unify.

## Notes

- The CORS bypass (removing Origin, setting Referer) is applied automatically by `cors-tricks.ts` for each configured WebUI — you don't need to handle this in the client class.
- If the client needs custom authentication persistence (e.g. session cookies), use `chrome.storage.session` keyed by WebUI ID.
- `clientSpecificSettings: Record<string, any>` in `WebUISettings` is available for any extra configuration fields. Add UI for these in `src/options/pages/WebUIsPage.tsx` if needed.
