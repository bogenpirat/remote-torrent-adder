import { sendMessageAndForget } from "../../util/browser-api";
import { type CSSProperties } from "react";
import { useSettings } from "../SettingsContext";
import { type ITestNotificationMessage, TestNotificationMessage } from "../../models/messages";
import { type RTASettings } from "../../models/settings";
import { type NotificationKind } from "../../util/notifications";
import { BUTTON_STYLE, ROW_STYLE } from "../components/notification-styles";
import SoundPicker from "../components/SoundPicker";
import Toggle from "../components/Toggle";
import { TEXT, MUTED, GREEN_DARK, BORDER, INPUT_BG, SUCCESS, DANGER } from "../theme";

const TEST_MESSAGE_BY_KIND: Record<NotificationKind, string> = {
  success: "This is a successful notification.",
  failure: "This is a failed notification.",
};

const SECTION_STYLE: CSSProperties = {
  background: "var(--rta-surface-alt, #f7faf7)",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 18,
  marginBottom: 18,
};

const SECTION_TITLE_STYLE: CSSProperties = {
  margin: "0 0 14px 0",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: GREEN_DARK,
};

const INPUT_STYLE: CSSProperties = {
  width: 110,
  background: INPUT_BG,
  color: TEXT,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "6px 10px",
};

const TEST_BUTTON_STYLE: CSSProperties = { ...BUTTON_STYLE, color: "#fff", border: "none", padding: "9px 18px" };

const CUSTOM_SOUNDS_HINT_STYLE: CSSProperties = { marginTop: 0, marginBottom: 16, color: MUTED, fontSize: 13 };

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
  return (
    <section style={SECTION_STYLE}>
      <h3 style={SECTION_TITLE_STYLE}>Notifications</h3>
      <ToggleRow settings={settings} settingKey="notificationsEnabled" label="Show notifications" />
      <ToggleRow settings={settings} settingKey="notificationsSoundEnabled" label="Play a sound" />
      <DurationRow settings={settings} />
    </section>
  );
}

interface ToggleRowProps {
  settings: RTASettings;
  settingKey: "notificationsEnabled" | "notificationsSoundEnabled";
  label: string;
}

function ToggleRow({ settings, settingKey, label }: ToggleRowProps) {
  const { updateSetting } = useSettings();
  return (
    <div style={ROW_STYLE}>
      <Toggle
        checked={settings[settingKey]}
        onEnable={() => updateSetting(settingKey, true)}
        onDisable={() => updateSetting(settingKey, false)}
        label={label}
      />
    </div>
  );
}

function DurationRow({ settings }: { settings: RTASettings }) {
  const { updateSetting } = useSettings();
  return (
    <div style={{ ...ROW_STYLE, marginBottom: 0 }}>
      <label htmlFor="notif-duration">Display duration</label>
      <input
        id="notif-duration"
        type="number"
        min={0}
        value={settings.notificationsDurationMs}
        onChange={e => updateSetting("notificationsDurationMs", Number(e.target.value))}
        style={INPUT_STYLE}
      />
      <span style={{ color: MUTED }}>ms</span>
    </div>
  );
}

function CustomSoundsSection() {
  return (
    <section style={SECTION_STYLE}>
      <h3 style={SECTION_TITLE_STYLE}>Custom sounds</h3>
      <p style={CUSTOM_SOUNDS_HINT_STYLE}>
        Pick your own audio files to play when a torrent is added or fails. Leave a slot empty to use the built-in default.
      </p>
      <SoundPicker kind="success" label="Success sound" />
      <SoundPicker kind="failure" label="Failure sound" />
    </section>
  );
}

function TestButtons({ settings }: { settings: RTASettings }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button
        onClick={() => sendTestNotification("success", settings)}
        style={{ ...TEST_BUTTON_STYLE, background: SUCCESS }}
      >
        Test Success Notification
      </button>
      <button
        onClick={() => sendTestNotification("failure", settings)}
        style={{ ...TEST_BUTTON_STYLE, background: DANGER }}
      >
        Test Failed Notification
      </button>
    </div>
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
