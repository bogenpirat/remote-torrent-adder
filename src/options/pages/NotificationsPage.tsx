import { useSettings } from "../SettingsContext";

export default function NotificationsPage() {
  const { settings, updateSetting, loading } = useSettings();

  if (loading || !settings) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={e => updateSetting("notificationsEnabled", e.target.checked)}
          />
          Show notifications
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.notificationsSoundEnabled}
            onChange={e => updateSetting("notificationsSoundEnabled", e.target.checked)}
          />
          Sound
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Display duration (ms):
          <input
            type="number"
            min={0}
            value={settings.notificationsDurationMs}
            onChange={e => updateSetting("notificationsDurationMs", Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>
      </div>
    </div>
  );
}
