# Agent: add-setting

**Purpose**: Add a new configurable setting to Remote Torrent Adder, wiring it through the correct layers depending on its scope.

## When to Use

Invoke when a user wants to add a new option, flag, or configurable behaviour — anything the user will set in the Options page or toggle per-torrent in the popup.

## Step 0: Determine the Setting Scope

Before touching any file, establish which scope the setting belongs to:

| Scope | Stored in | Configured in | Example |
|---|---|---|---|
| **Global** | `RTASettings` | Options → any top-level tab | Notification duration, link-catching enabled |
| **Per-client** | `WebUISettings` | Options → WebUIs tab, per client | Default label, SSL toggle, client-specific flag |
| **Per-torrent override** | `TorrentUploadConfig` | Options (default) + Popup (override) | Label, directory, add-as-paused |

Ask the user if not obvious. Per-torrent overrides are the most complex — only use that scope if the user genuinely needs to change it per-torrent in the popup.

---

## Global Setting

Files to touch, in order:

### 1. `src/models/settings.ts`
Add the field to `RTASettings`. Use `?:` if it can be absent in old stored configs:
```typescript
export interface RTASettings {
    // existing fields...
    myNewSetting: boolean;  // or string | null, number, etc.
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

### 3. Options UI
Add the control in the appropriate tab page under `src/options/pages/`:
- `NotificationsPage.tsx` for notification behaviour
- `LinkCatchingPage.tsx` for link detection
- A new tab page if the setting warrants its own section

Follow existing patterns: use `SettingsContext` to read/write, Tailwind for styling, Radix UI primitives for interactive controls.

### 4. Usage
Use the setting wherever the behaviour is implemented. In the service worker, settings are loaded once and cached — read from `this._rtaSettings.myNewSetting`.

---

## Per-Client Setting

Files to touch, in order:

### 1. `src/models/webui.ts`
Add as optional to `WebUISettings` so existing configs don't break:
```typescript
export interface WebUISettings {
    // existing fields...
    myClientSetting?: boolean;  // optional — undefined in existing configs
}
```

### 2. Options UI — `src/options/pages/WebUIsPage.tsx`
Add the control inside the per-client form. Existing fields (`addPaused`, `showPerTorrentConfigSelector`, etc.) show the pattern. Use `??` for the default when reading:
```typescript
const value = webui.myClientSetting ?? false;
```

### 3. Usage in client classes
Access via `this._settings.myClientSetting ?? defaultValue`. If the setting is used by many clients, add a getter to `TorrentWebUI` in `src/models/webui.ts`:
```typescript
protected getMyClientSetting(): boolean {
    return this._settings.myClientSetting ?? false;
}
```

---

## Per-Torrent Override Setting

This is a superset of per-client. Do everything in "Per-Client" above, naming the `WebUISettings` field `defaultMyField`, then additionally:

### A. `src/models/torrent.ts`
Add to `TorrentUploadConfig` (optional — user may not set it per-torrent):
```typescript
export interface TorrentUploadConfig {
    // existing fields...
    myField?: boolean;
}
```

### B. `src/models/webui.ts` base class getter
```typescript
protected getMyField(config: TorrentUploadConfig): boolean {
    return config.myField ?? this._settings.defaultMyField ?? false;
}
```

### C. `src/popup/app/page.tsx`
Add the UI control (toggle, select, etc.) in the popup. Wire it so the chosen value is included in the `TorrentUploadConfig` sent when the user clicks "Add".

### D. Messages
Check `src/models/messages.ts` — the `TorrentUploadConfig` is passed through messages from popup → service worker → client. Since it's an interface (not a class), adding a field there is sufficient; no message registration needed.

---

## Verification

After all changes:
```bash
npx tsc --noEmit          # catches interface mismatches across all files
npm run build             # full build (popup, options, service worker)
```

Load the unpacked `dist/` in Chrome and verify:
- New field appears correctly in Options
- Default value is applied to existing configs
- If per-torrent: popup shows the control and the chosen value reaches the client
