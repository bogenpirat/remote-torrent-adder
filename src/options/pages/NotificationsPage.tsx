import { useSettings } from "../SettingsContext";
import { showNotification } from "../../util/notifications";
import { ITestNotificationMessage, TestNotificationMessage } from "../../models/messages";

export default function NotificationsPage() {
  const { settings, updateSetting, loading } = useSettings();

  if (loading || !settings) return <div>Loading...</div>;

  const handleTestSuccess = () => {
    chrome.runtime.sendMessage({
      action: TestNotificationMessage.action,
      title: "Test Notification",
      message: "This is a successful notification.",
      isFailed: false,
      popupDurationMs: settings.notificationsDurationMs,
      playSound: settings.notificationsSoundEnabled
    } as ITestNotificationMessage);
  };

  const handleTestFail = () => {
    chrome.runtime.sendMessage({
      action: TestNotificationMessage.action,
      title: "Test Notification",
      message: "This is a failed notification.",
      isFailed: true,
      popupDurationMs: settings.notificationsDurationMs,
      playSound: settings.notificationsSoundEnabled
    } as ITestNotificationMessage);
  };

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
      <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
        <button
          onClick={handleTestSuccess}
          style={{ background: "#228B22", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 500, cursor: "pointer" }}
        >
          Test Success Notification
        </button>
        <button
          onClick={handleTestFail}
          style={{ background: "#B22222", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 500, cursor: "pointer" }}
        >
          Test Failed Notification
        </button>
      </div>
    </div>
  );
}
