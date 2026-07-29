# Skill: Add a WebUI Client

**Purpose**: Scaffold and implement a new BitTorrent client WebUI integration for Remote Torrent Adder.

## When to Use

Use when a user wants to add support for a BitTorrent client that is not yet in the list of supported clients.

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
import { TorrentWebUI, type TorrentAddingResult } from '../models/webui';
import { type Torrent, type TorrentUploadConfig } from '../models/torrent';

export class <ClientName>WebUI extends TorrentWebUI {

    get isLabelSupported(): boolean { return false; }      // set true if supported
    get isDirSupported(): boolean { return false; }         // set true if supported
    get isAddPausedSupported(): boolean { return false; }   // set true if supported

    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        try {
            // 1. Authenticate if needed
            // 2. Build request body — branch on `torrent.isMagnet`
            // 3. POST torrent to client API via this.fetch()
            return { success: true, httpResponseCode: 200, httpResponseBody: null };
        } catch (error) {
            return this.toFailureResult(error);
        }
    }
}
```

The base class defines the constructor — don't redeclare one unless you need extra setup.

### Base class API (`src/models/webui.ts`)

URL and request helpers:
- `this.createBaseUrl()` → `http(s)://host[:port][/relativePath]` (omits the port when it is 80/443 for the matching scheme)
- `this.createBaseUrlPatternForFilter()` → base URL normalised with a single trailing slash, used for `declarativeNetRequest` filters
- `this.fetch(url, options)` → wraps `fetch`, throws `HttpError(status, body)` on a non-OK response
- `this.createBasicAuthHeaders()` → `{ Authorization: "Basic …" }`, or `{}` when both username and password are empty

Per-torrent value resolution (config value first, then the per-client default):
- `this.getLabel(config)` → `string | null`
- `this.getDirectory(config)` → `string | null`
- `this.getAddPaused(config)` → `boolean | null`

Result construction:
- `this.toFailureResult(error)` → `TorrentAddingResult`; maps `HttpError` to its status and body, anything else to code `0` and the error message. Use this in every `catch` rather than hand-building a failure object.

Connection testing:
- `get isConnectionTestSupported(): boolean` — defaults to `true`. Override to `false` if the client has no probe-able endpoint; the Options page hides the Test Connection button when it is false.
- `testConnection(): Promise<ConnectionTestResult>` — the default implementation only GETs the base URL and reports reachability *without* checking credentials. Nearly every existing client overrides it; do the same whenever the client can actually validate credentials.
- `this.probeWithBasicAuth(url)` → ready-made `testConnection()` body for basic-auth clients; treats 401/403 as "reachable, not authenticated".
- `this.toReachableResult(authenticated, code)` / `this.toUnreachableResult(error)` → build a `ConnectionTestResult` in a custom `testConnection()`.

```typescript
interface TorrentAddingResult {
    success: boolean;
    httpResponseCode: number;
    httpResponseBody: string | null;
}

interface ConnectionTestResult {
    reachable: boolean;
    authenticated: boolean | null;   // null = not checked
    httpResponseCode: number;
    message: string;
}
```

### Torrent object shape (`src/models/torrent.ts`)

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

Edit `src/models/clients.ts`. There are **three** maps to update, and `ClientDisplayName` / `ClientClassByClient` are both `Record<Client, …>`, so a missing entry is a compile error.

1. Add to the `Client` enum. The value is a **stable, opaque, lowercase slug** — it is persisted in user settings and used as a lookup key, so it must never change afterwards. It is *not* the display name:
```typescript
export enum Client {
    // ... existing entries ...
    <ClientName>WebUI = "<clientname>",   // e.g. "rqbit", "qnap-download-station"
}
```

2. Add the human-readable name to `ClientDisplayName`. This is what the user sees, and it can be reworded freely later without touching stored data:
```typescript
export const ClientDisplayName: Record<Client, string> = {
    // ... existing entries ...
    [Client.<ClientName>WebUI]: "<Display Name>",   // e.g. "rqbit", "QNAP Download Station"
};
```

3. Add the constructor to `ClientClassByClient`:
```typescript
import { <ClientName>WebUI } from '../webuis/<clientname>-webui';

export const ClientClassByClient: Record<Client, ConcreteTorrentWebUIConstructor> = {
    // ... existing entries ...
    [Client.<ClientName>WebUI]: <ClientName>WebUI,
};
```

Only touch `src/util/legacy-client-identifiers.ts` if you are *renaming* an existing client's slug — a new client has no legacy identifier to migrate.

### Step 3: Add tests

Every client has a matching test file. Create `test/webuis/<clientname>-webui.test.ts` and follow the closest existing one. Use the helpers in `test/helpers/` (`fetch-mock.ts`, `fixtures.ts`, `chrome-mock.ts`) rather than hand-rolling mocks.

Cover at minimum:
- `.torrent` upload: correct URL, method, and body shape; the `File` filename is set
- Magnet upload: the magnet string is sent, and to the right endpoint if it differs
- Label / directory / add-paused, for each flag the client reports as supported
- The authentication exchange, if the client has one
- Failure: a non-OK response produces `{ success: false }` with the status propagated

`test/models/clients.test.ts` asserts over the factory maps, so a client registered in only some of them will fail there too.

### Step 4: Verify

```bash
npm run typecheck
npm test
npm run lint
```

`npm run build` runs all three first via `prebuild`, so run them directly while iterating — the errors are easier to read.

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

### Basic auth — see `rqbit-webui.ts`, `tixati-webui.ts`, `rutorrent-webui.ts`
Use `this.createBasicAuthHeaders()`, and `this.probeWithBasicAuth(url)` for `testConnection()`. `biglybt-webui.ts` and `transmission-webui.ts` also probe this way.

### XML-RPC — see `rutorrent-webui.ts`
Build an XML body and POST with `Content-Type: text/xml`.

## Common Upload Patterns

### Multipart form with binary `.torrent` (qBittorrent style)
```typescript
const form = new FormData();
form.append("torrents", new File([torrent.data as Blob], torrent.name, { type: "application/x-bittorrent" }));
const dir = this.getDirectory(config);
if (dir) form.append("savepath", dir);
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

## Output

Summarise the implementation in the conversation: files created, authentication pattern used, feature flags (`isLabelSupported` etc.), test coverage added, and anything deferred.

Adding a client touches several files and is usually worth a `.tmp/add-client-<clientname>-<YYYY-MM-DD>.md` write-up as well — see the `.tmp/` section in `.agents/README.md` for when and in what format.

## Notes

- The CORS bypass (removing Origin, setting Referer) is applied automatically by `cors-tricks.ts` for each configured WebUI — you don't need to handle this in the client class.
- If the client needs custom authentication persistence (e.g. session cookies), use `chrome.storage.session` keyed by WebUI ID.
- `clientSpecificSettings: Record<string, any>` in `WebUISettings` is available for any extra configuration fields. Add UI for these in `src/options/pages/WebUIsPage.tsx` if needed.
- The supported-client list and count appear in `.agents/README.md`, the root `README.md`, `AGENTS.md`, and the row table in `.agents/skills/smoke-test-matrix.md`. Update all four, or they go stale.
