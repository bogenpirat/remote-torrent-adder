# Skill: Add a Setting

**Purpose**: Add a new configurable setting to Remote Torrent Adder, wiring it through the correct layers depending on its scope.

## When to Use

Use when a user wants to add a new option, flag, or configurable behaviour — anything the user will set in the Options page or toggle per-torrent in the popup.

## Step 0: Determine the Setting Scope

Before touching any file, establish which scope the setting belongs to:

| Scope | Stored in | Configured in | Example |
|---|---|---|---|
| **Global** | `RTASettings` | Options → any top-level tab | Notification duration, link-catching enabled |
| **Client-specific** | `WebUISettings.clientSpecificSettings` | Rendered automatically from a descriptor | qBittorrent "Force start", ruTorrent "Don't add name path" |
| **Per-client (structural)** | a new field on `WebUISettings` | Options → WebUIs tab, hand-written control | Host, port, default label, SSL toggle |
| **Per-torrent override** | `TorrentUploadConfig` | Options (default) + Popup (override) | Label, directory, add-as-paused |

Ask the user if not obvious.

**Start with "Client-specific".** If the setting is a boolean that only matters to one client, it needs no new interface field, no options-page code and no popup code — a descriptor gets it rendered in both places automatically. Reach for the hand-wired "Per-client (structural)" path only for a setting that applies to *every* client, or that is not a boolean.

---

## Global Setting

`RTASettings` (`src/models/settings.ts`) is currently small and fully required — no optional fields:

```typescript
export interface RTASettings {
    notificationsEnabled: boolean;
    notificationsDurationMs: number;
    notificationsSoundEnabled: boolean;

    linkCatchingEnabled: boolean;
    linkCatchingRegexes: RegExp[];

    iconClickAction: IconClickAction;

    webuiSettings: WebUISettings[];
}
```

Files to touch, in order:

### 1. `src/models/settings.ts`
Add the field to `RTASettings`. Prefer a required field plus a default (matching the existing style); use `?:` only if it genuinely cannot be defaulted.
```typescript
export interface RTASettings {
    // existing fields...
    myNewSetting: boolean;
}
```

### 2. `src/util/settings-defaults.ts`
Add the default value in `getDefaultSettings()`:
```typescript
return {
    // existing fields...
    myNewSetting: false,
};
```
Stored settings from older versions won't have the key, so make sure the read path falls back to the default — use `??`, never `||` (`false` and `0` are valid values).

### 3. Options UI
Add the control in the appropriate tab page under `src/options/pages/`:
- `NotificationsPage.tsx` for notification behaviour
- `LinkCatchingPage.tsx` for link detection
- `IconClickPage.tsx` for what clicking the toolbar icon does
- `WebUIsPage.tsx` for anything client-related
- `ImportExportPage.tsx` / `AboutPage.tsx` are unlikely targets
- A new tab page if the setting warrants its own section

Follow existing patterns: use `SettingsContext` (`src/options/SettingsContext.tsx`) to read/write, Tailwind for styling, Radix UI primitives for interactive controls.

### 4. Usage
Use the setting wherever the behaviour is implemented. Background code loads settings freshly per event — `const settings = await new Settings().loadSettings();` (see `src/util/action.ts`, `src/util/webuis.ts`, `src/util/messaging.ts`) — because the worker is stateless and must not cache them across invocations. Then read `settings.myNewSetting`.

### 5. Tests
- `test/util/settings-defaults.test.ts` — assert the new default
- `test/util/settings.test.ts` — assert load/save round-trips the field, and that settings missing the key fall back to the default
- `test/options/SettingsContext.test.tsx` / `test/options/OptionsPage.test.tsx` — if you added UI

---

## Client-Specific Setting (the descriptor path)

For a boolean that only one client understands, declare a descriptor and stop. The options page renders it (`src/options/components/ClientSpecificSettingsEditor.tsx`, wired in `WebUIsPage.tsx`), the popup renders it too when `perTorrent` is true (`src/popup/popup-data.ts`, `src/popup/app/page.tsx`), and the base class resolves the value. **No interface field, no options code, no popup code.**

### 1. Declare the descriptor in the client class

At the top of `src/webuis/<name>-webui.ts` — see `qbittorrent-webui.ts` and `rutorrent-webui.ts` for the two live examples:

```typescript
const CLIENT_SPECIFIC_SETTINGS: ReadonlyArray<ClientSpecificSettingDescriptor> = [
    {
        key: "forceStart",          // stable — it is persisted in clientSpecificSettings
        label: "Force start",       // what the user sees; free to reword later
        type: "boolean",            // the only type supported today
        default: false,
        perTorrent: true,           // true → also shown in the popup per torrent
        description: "Bypass the queueing system and start immediately.",
    },
];
```

Then expose it:

```typescript
override get clientSpecificSettingDescriptors(): ReadonlyArray<ClientSpecificSettingDescriptor> {
    return CLIENT_SPECIFIC_SETTINGS;
}
```

`override` is required — `noImplicitOverride` is on.

### 2. Read it where the request is built

```typescript
if (this.getClientSpecific("forceStart", config)) {
    body.append("forced", "true");
}
```

`getClientSpecific` (`src/models/webui.ts`) resolves per-torrent config → the stored per-client value → the descriptor's `default` → `false`. Do not read `clientSpecificSettings` directly; it is typed `Record<string, unknown>` and the fallback chain is the point.

### 3. Tests

- `test/webuis/<name>-webui.test.ts` — the flag on and off changes the outgoing request, and the descriptor's default applies when nothing is stored
- `test/popup/popup-data.test.ts` / `test/popup/page.test.tsx` — only if `perTorrent` is true

---

## Per-Client Setting (structural — hand-wired)

Only for a setting that applies to every client, or that is not a boolean. Everything else belongs in the descriptor path above.

### 1. `src/models/webui.ts`
Add as optional to `WebUISettings` so existing configs don't break:
```typescript
export interface WebUISettings {
    // existing fields...
    myClientSetting?: boolean;  // optional — undefined in existing configs
}
```

### 2. Options UI — `src/options/pages/WebUIsPage.tsx`
Add the control inside the per-client form. Existing fields (`showPerTorrentConfigSelector`, `useAlternativeLabelDirChooser`, `defaultLabel`, …) show the pattern. Use `??` for the default when reading:
```typescript
const value = webui.myClientSetting ?? false;
```

### 3. Usage in client classes
Access via `this._settings.myClientSetting ?? defaultValue`. If many clients need it, add a protected getter to `TorrentWebUI` alongside `getLabel` / `getDirectory` / `getAddPaused`:
```typescript
protected getMyClientSetting(): boolean {
    return this._settings.myClientSetting ?? false;
}
```

### 4. Tests
Extend `test/models/webui.test.ts` for a new base-class getter, and the affected `test/webuis/<name>-webui.test.ts` for behaviour that changes per client. `test/helpers/fixtures.ts` builds `WebUISettings` — new **required** fields must be added there, and to `e2e/fixtures/settings.ts`.

---

## Per-Torrent Override Setting

If the setting is a client-specific boolean, this is already done: set `perTorrent: true` on the descriptor. The rest of this section is for overriding a *structural* per-client field.

Do everything in "Per-Client (structural)" above, naming the `WebUISettings` field `defaultMyField`, then additionally:

### A. `src/models/torrent.ts`
Add to `TorrentUploadConfig` — every field there is optional, since the user may not set it per-torrent:
```typescript
export interface TorrentUploadConfig {
    dir?: string;
    label?: string;
    addPaused?: boolean;
    clientSpecificSettings?: Record<string, boolean>;
    myField?: boolean;   // new
}
```

### B. `src/models/webui.ts` base class getter
Mirror the existing resolution order — per-torrent config first, then the per-client default, then a hard default:
```typescript
protected getMyField(config: TorrentUploadConfig): boolean | null {
    return config.myField ?? this._settings.defaultMyField ?? false;
}
```

### C. `src/popup/app/page.tsx`
Add the UI control in the popup and include the chosen value in the `TorrentUploadConfig` sent when the user clicks "Add". `src/popup/popup-data.ts` builds what the popup renders and maps the result back onto the config; popup controls live in `src/popup/components/ui/`.

### D. Messages
`TorrentUploadConfig` is passed through messages from popup → service worker → client (`src/models/messages.ts`). It is an interface, not a class, so adding a field is sufficient — no registration needed.

### E. Tests
Add cases to `test/popup/page.test.tsx` (the control renders and its value reaches the outgoing config) and `test/popup/popup-data.test.ts`.

---

## Verification

```bash
npm run typecheck   # catches interface mismatches across all files
npm test
npm run lint
```

`npm run build` runs all three first via `prebuild`. Then load the unpacked `dist/chrome/` in Chrome and verify:
- New field appears correctly in Options
- Default value is applied to configs saved before the change
- If per-torrent: popup shows the control and the chosen value reaches the client

A setting that changes anything the two browsers implement differently (notifications, sound, the toolbar action, permissions) also needs a Firefox pass — `npm run dev:firefox`, and see section H of `smoke-test-matrix.md`.

## Output

Summarise in the conversation: scope (global / client-specific descriptor / structural per-client / per-torrent), files modified, default value, UI location, tests added. A `.tmp/` write-up is only worth it for a setting that touched many layers — see `.agents/README.md`.
