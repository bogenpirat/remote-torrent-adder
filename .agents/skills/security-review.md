# Skill: Security Review (project-tailored)

Project-specific security checklist for Remote Torrent Adder. The built-in `/security-review` is generic; this one targets the surfaces this extension actually has. Use alongside `code-reviewer.md`.

## Attack surfaces in this extension

- **Content script** runs on `<all_urls>` (`src/content-script/rta.ts`, declared in `src/manifest.json`). Any compromise here runs on every site the user visits.
- **Service worker** holds decrypted client credentials in memory while processing a request, has `<all_urls>` host permissions, and can issue arbitrary `fetch()` to user-configured hosts.
- **`declarativeNetRequest`** rules strip `Origin` and set `Referer` per configured WebUI (`src/util/cors-tricks.ts`). Mis-scoped rules turn the extension into a CORS-bypass oracle for arbitrary sites.
- **Stored credentials** (host/port/username/password per WebUI) live in `chrome.storage.local`.
- **Torrent file parsing**: bencode is parsed from URLs the user clicks (`src/util/download.ts`, `src/util/parsers.ts`).
- **Link-catching regexes** are user-editable (`linkCatchingRegexes`) and tested against URLs in the content script.

## Review checklist

### Credential handling

- [ ] No `console.log`/`console.error` includes `_settings.password`, `_settings.username`, or the full settings object. Grep before merging.
- [ ] Passwords never serialized into URL query strings (logged by routers/proxies). Look for template literals putting credentials into `createBaseUrl()`-derived URLs.
- [ ] No password sent to anything except the configured WebUI host (no telemetry, no Sentry payloads, no error-reporting endpoints).
- [ ] When `secure: false`, the user should be warned in the options UI that credentials transit in plaintext. If a new client class hard-codes HTTP, flag it.
- [ ] `clientSpecificSettings: Record<string, any>` may contain secrets too — same rules apply.

### Content script (`src/content-script/rta.ts`)

- [ ] No `eval()`, `new Function(...)`, or `setTimeout(string)` anywhere. Manifest V3 already blocks remote code, but inline string-eval can still execute extension-context script.
- [ ] No `innerHTML`, `outerHTML`, or `document.write()` with values derived from page content. Use `textContent`/`createElement`.
- [ ] No `window.postMessage` listeners that trust messages without validating `event.origin` and `event.source`.
- [ ] The content script never exposes extension internals to the page (no `window.__rta = ...` or similar). Default isolated worlds prevent this, but the rule still stands.
- [ ] Click interception confirms the clicked anchor is actually a torrent/magnet link (don't act on arbitrary clicks).

### Service worker (`src/service_worker.ts`)

- [ ] `chrome.runtime.onMessage` handlers validate `sender.id === chrome.runtime.id` (or rely on Chrome's same-extension guarantee documented), and don't process `onMessageExternal` without an explicit allowlist.
- [ ] No raw `fetch()` to URLs derived from page content without going through a configured WebUI's `createBaseUrl()`.
- [ ] No module-level mutable state caching credentials between events (MV3 stateless rule — also a security property: a compromise in one event-handler frame doesn't leak into the next).
- [ ] Error messages bubbled into notifications/UI do not include the full response body when it might contain session tokens or other secrets. (`TorrentAddingResult.httpResponseBody` is shown to the user — acceptable for HTTP error pages, but flag if it would include credentials echoed back.)

### CORS bypass (`src/util/cors-tricks.ts`)

- [ ] Each `declarativeNetRequest` rule's `condition.urlFilter` / `regexFilter` is scoped to the user's configured WebUI base URL — never `<all_urls>` or `*://*/*`.
- [ ] Rule IDs are unique integers and removed when the WebUI is deleted. A leaked rule that applies to a host the user no longer trusts is a real risk.
- [ ] The `Referer` value set by the rule equals the WebUI base URL (matches the legitimate browsing pattern that client expects). A constant string outside the WebUI's origin can be used by a hostile WebUI to identify the extension.
- [ ] When the user changes a WebUI's host/port/secure/relativePath, the matching rule is rewritten — not appended.

### Link-catching regexes (`linkCatchingRegexes`)

- [ ] Each pattern is anchored or bounded enough to avoid catastrophic backtracking on long URLs. Patterns with nested quantifiers (`(a+)+`, `(.*)+`) are a foot-gun.
- [ ] Defaults in `src/util/settings-defaults.ts` are not redos-prone (check current entries).
- [ ] User-supplied regex is `RegExp`-constructed in a `try`/`catch` so an invalid pattern doesn't break link-catching for all sites.

### Torrent parsing (`src/util/download.ts`, `src/util/parsers.ts`)

- [ ] Bencode decoder errors are caught — a malformed `.torrent` must not crash the service worker (which would also dismiss the popup mid-flow on the user).
- [ ] No assumption that `info.name`, `info.files[].path[]`, `announce`, etc. are present or are of the expected type — they come from untrusted bytes.
- [ ] Tracker URLs from a parsed torrent are never used to build a request URL without explicit validation (auto-label-dir matching is fine because it just runs a string compare; building a `fetch()` URL from one would not be).

### Manifest & permissions

- [ ] No new `host_permissions` beyond `<all_urls>` unless justified (it's already maximally broad — adding more is impossible, but watch for `optional_host_permissions` requests).
- [ ] No new permissions added without need. Each entry in `permissions:` is a Chrome Web Store review trigger.
- [ ] CSP not weakened. MV3 default is strict; any `content_security_policy` override is a red flag.

## Quick triage by severity

| Finding | Severity |
|---|---|
| Password logged or sent off-host | BLOCKER |
| CORS rule with `<all_urls>` filter | BLOCKER |
| `innerHTML` from page content in content-script | BLOCKER |
| `onMessageExternal` without allowlist | BLOCKER |
| Credentials in URL query string | WARNING |
| Redos-prone default regex | WARNING |
| Stale CORS rule not cleaned up | WARNING |
| `console.log` of settings object that includes password | WARNING |
| Response body shown in notification when it could echo creds | SUGGESTION |

## Reporting

Group by severity, cite `file_path:line_number`, propose the smallest fix that closes the issue. End with a one-line verdict.
