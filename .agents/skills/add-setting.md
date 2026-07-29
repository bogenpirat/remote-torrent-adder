# Skill: Add a Setting

**Purpose**: Add a new configurable setting to Remote Torrent Adder, wiring it through the correct layers depending on its scope.

## When to Use

Use when a user wants to add a new option, flag, or configurable behaviour — anything the user will set in the Options page or toggle per-torrent in the popup.

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

`RTASettings` (`src/models/settings.ts`) is currently small and fully required — no optional fields:

```typescript
export interface RTASettings {
    notificationsEnabled: boolean;
    notificationsDurationMs: number;
    notificationsSoundEnabled: boolean;

    linkCatchingEnabled: boolean;
    linkCatchingRegexes: RegExp[];

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
- `WebUIsPage.tsx` for anything client-related
- `ImportExportPage.tsx` / `AboutPage.tsx` are unlikely targets
- A new tab page if the setting warrants its own section

Follow existing patterns: use `SettingsContext` (`src/options/SettingsContext.tsx`) to read/write, Tailwind for styling, Radix UI primitives for interactive controls.

### 4. Usage
Use the setting wherever the behaviour is implemented. In the service worker, settings are loaded once and cached — read from `this._rtaSettings.myNewSetting`.

### 5. Tests
- `test/util/settings-defaults.test.ts` — assert the new default
- `test/util/settings.test.ts` — assert load/save round-trips the field, and that settings missing the key fall back to the default
- `test/options/SettingsContext.test.tsx` / `test/options/OptionsPage.test.tsx` — if you added UI

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
Add the control inside the per-client form. Existing fields (`addPaused`, `showPerTorrentConfigSelector`, `useAlternativeLabelDirChooser`, etc.) show the pattern. Use `??` for the default when reading:
```typescript
const value = webui.myClientSetting ?? false;
```

### 3. Usage in client classes
Access via `this._settings.myClientSetting ?? defaultValue`. If the setting is used by many clients, add a protected getter to `TorrentWebUI` in `src/models/webui.ts` alongside `getLabel` / `getDirectory` / `getAddPaused`:
```typescript
protected getMyClientSetting(): boolean {
    return this._settings.myClientSetting ?? false;
}
```

### 4. Tests
Extend `test/models/webui.test.ts` for a new base-class getter, and the affected `test/webuis/<name>-webui.test.ts` for behaviour that changes per client. `test/helpers/fixtures.ts` builds `WebUISettings` — new required fields must be added there.

---

## Per-Torrent Override Setting

This is a superset of per-client. Do everything in "Per-Client" above, naming the `WebUISettings` field `defaultMyField`, then additionally:

### A. `src/models/torrent.ts`
Add to `TorrentUploadConfig` — every field there is optional, since the user may not set it per-torrent:
```typescript
export interface TorrentUploadConfig {
    dir?: string;
    label?: string;
    addPaused?: boolean;
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
Add the UI control (toggle, select, etc.) in the popup. Wire it so the chosen value is included in the `TorrentUploadConfig` sent when the user clicks "Add". Popup controls live in `src/popup/components/ui/`.

### D. Messages
Check `src/models/messages.ts` — the `TorrentUploadConfig` is passed through messages from popup → service worker → client. Since it's an interface (not a class), adding a field there is sufficient; no message registration needed.

### E. Tests
Add cases to `test/popup/page.test.tsx` (the control renders and its value reaches the outgoing config) and `test/popup/popup-data.test.ts`.

---

## Verification

```bash
npm run typecheck   # catches interface mismatches across all files
npm test
npm run lint
```

`npm run build` runs all three first via `prebuild`. Then load the unpacked `dist/` in Chrome and verify:
- New field appears correctly in Options
- Default value is applied to configs saved before the change
- If per-torrent: popup shows the control and the chosen value reaches the client

## Output

Summarise in the conversation: scope (global/per-client/per-torrent), files modified, default value, UI location, tests added. A `.tmp/` write-up is only worth it for a setting that touched many layers — see `.agents/README.md`.
