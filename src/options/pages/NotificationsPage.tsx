import { sendMessageAndForget } from "../../util/browser-api";
import { type CSSProperties } from "react";
import { useSettings } from "../SettingsContext";
import { type ITestNotificationMessage, TestNotificationMessage } from "../../models/messages";
import { type RTASettings } from "../../models/settings";
import { type NotificationKind } from "../../util/notifications";
import { buttonStyle, rowStyle } from "../components/notification-styles";
import SoundPicker from "../components/SoundPicker";
import Toggle from "../components/Toggle";

const TEST_MESSAGE_BY_KIND: Record<NotificationKind, string> = {
  success: "This is a successful notification.",
  failure: "This is a failed notification.",
};

const sectionStyle: CSSProperties = {
  background: "var(--rta-surface-alt, #f7faf7)",
  border: "1px solid var(--rta-border, #b7c9a7)",
  borderRadius: 12,
  padding: 18,
  marginBottom: 18,
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 14px 0",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "var(--rta-green-dark, #4e6a57)",
};

const inputStyle: CSSProperties = {
  width: 110,
  background: "var(--rta-input-bg, #fff)",
  color: "var(--rta-text, #1b241d)",
  border: "1px solid var(--rta-border, #b7c9a7)",
  borderRadius: 8,
  padding: "6px 10px",
};

const testButtonStyle: CSSProperties = { ...buttonStyle, color: "#fff", border: "none", padding: "9px 18px" };

const customSoundsHintStyle: CSSProperties = { marginTop: 0, marginBottom: 16, color: "var(--rta-text-muted, #888)", fontSize: 13 };

export default function NotificationsPage() {
  const { settings, loading } = useSettings();

  if (loading || !settings) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <GeneralSection settings={settings} />

      {settings.notificationsSoundEnabled && <CustomSoundsSection />}

      <TestButtons settings={settings} />
    </div>
  );
}

function GeneralSection({ settings }: { settings: RTASettings }) {
  const { updateSetting } = useSettings();
  return (
    <section style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Notifications</h3>
      <div style={rowStyle}>
        <Toggle
          checked={settings.notificationsEnabled}
          onChange={v => updateSetting("notificationsEnabled", v)}
          label="Show notifications"
        />
      </div>
      <div style={rowStyle}>
        <Toggle
          checked={settings.notificationsSoundEnabled}
          onChange={v => updateSetting("notificationsSoundEnabled", v)}
          label="Play a sound"
        />
      </div>
      <DurationRow settings={settings} />
    </section>
  );
}

function DurationRow({ settings }: { settings: RTASettings }) {
  const { updateSetting } = useSettings();
  return (
    <div style={{ ...rowStyle, marginBottom: 0 }}>
      <label htmlFor="notif-duration">Display duration</label>
      <input
        id="notif-duration"
        type="number"
        min={0}
        value={settings.notificationsDurationMs}
        onChange={e => updateSetting("notificationsDurationMs", Number(e.target.value))}
        style={inputStyle}
      />
      <span style={{ color: "var(--rta-text-muted, #888)" }}>ms</span>
    </div>
  );
}

function CustomSoundsSection() {
  return (
    <section style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Custom sounds</h3>
      <p style={customSoundsHintStyle}>
        Pick your own audio files to play when a torrent is added or fails. Leave a slot empty to use the built-in default.
      </p>
      <SoundPicker kind="success" label="Success sound" />
      <SoundPicker kind="failure" label="Failure sound" />
    </section>
  );
}

function sendTestNotification(kind: NotificationKind, settings: RTASettings): void {
  sendMessageAndForget({
    action: TestNotificationMessage.action,
    title: "Test Notification",
    message: TEST_MESSAGE_BY_KIND[kind],
    isFailed: kind === "failure",
    popupDurationMs: settings.notificationsDurationMs,
    playSound: settings.notificationsSoundEnabled,
  } as ITestNotificationMessage);
}

function TestButtons({ settings }: { settings: RTASettings }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button
        onClick={() => sendTestNotification("success", settings)}
        style={{ ...testButtonStyle, background: "var(--rta-success, #228B22)" }}
      >
        Test Success Notification
      </button>
      <button
        onClick={() => sendTestNotification("failure", settings)}
        style={{ ...testButtonStyle, background: "var(--rta-danger, #B22222)" }}
      >
        Test Failed Notification
      </button>
    </div>
  );
}
