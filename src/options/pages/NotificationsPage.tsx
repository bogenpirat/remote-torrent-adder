import { useEffect, useRef, useState, CSSProperties } from "react";
import { useSettings } from "../SettingsContext";
import { ITestNotificationMessage, TestNotificationMessage } from "../../models/messages";
import { deleteCustomSound, getCustomSound, saveCustomSound, SoundKind } from "../../util/sound-storage";
import Toggle from "../components/Toggle";

// Custom sounds are kept small; they live in IndexedDB but are still loaded
// into memory to play, so cap the size to keep things snappy.
const MAX_SOUND_BYTES = 1024 * 1024; // 1 MB

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

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

const buttonStyle: CSSProperties = {
  border: "1px solid var(--rta-border, #b7c9a7)",
  borderRadius: 8,
  padding: "6px 14px",
  background: "var(--rta-surface, #fff)",
  color: "var(--rta-text, #1b241d)",
  fontWeight: 500,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  width: 110,
  background: "var(--rta-input-bg, #fff)",
  color: "var(--rta-text, #1b241d)",
  border: "1px solid var(--rta-border, #b7c9a7)",
  borderRadius: 8,
  padding: "6px 10px",
};

export default function NotificationsPage() {
  const { settings, updateSetting, loading } = useSettings();

  if (loading || !settings) return <div>Loading...</div>;

  const sendTest = (isFailed: boolean) => {
    chrome.runtime.sendMessage({
      action: TestNotificationMessage.action,
      title: "Test Notification",
      message: isFailed ? "This is a failed notification." : "This is a successful notification.",
      isFailed,
      popupDurationMs: settings.notificationsDurationMs,
      playSound: settings.notificationsSoundEnabled,
    } as ITestNotificationMessage);
  };

  return (
    <div style={{ maxWidth: 640 }}>
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
      </section>

      {settings.notificationsSoundEnabled && (
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Custom sounds</h3>
          <p style={{ marginTop: 0, marginBottom: 16, color: "var(--rta-text-muted, #888)", fontSize: 13 }}>
            Pick your own audio files to play when a torrent is added or fails. Leave a slot empty to use the built-in default.
          </p>
          <SoundPicker kind="success" label="Success sound" />
          <SoundPicker kind="failure" label="Failure sound" />
        </section>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={() => sendTest(false)}
          style={{ ...buttonStyle, background: "var(--rta-success, #228B22)", color: "#fff", border: "none", padding: "9px 18px" }}
        >
          Test Success Notification
        </button>
        <button
          onClick={() => sendTest(true)}
          style={{ ...buttonStyle, background: "var(--rta-danger, #B22222)", color: "#fff", border: "none", padding: "9px 18px" }}
        >
          Test Failed Notification
        </button>
      </div>
    </div>
  );
}

function SoundPicker({ kind, label }: { kind: SoundKind; label: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getCustomSound(kind)
      .then(stored => { if (active) setFileName(stored?.name ?? null); })
      .catch(() => { if (active) setFileName(null); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [kind]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_SOUND_BYTES) {
      alert(`That sound file is too large (max ${Math.round(MAX_SOUND_BYTES / 1024)} KB).`);
      return;
    }
    setBusy(true);
    try {
      await saveCustomSound(kind, file, file.name);
      setFileName(file.name);
    } catch (e) {
      console.error(e);
      alert("Could not save that sound file.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await deleteCustomSound(kind);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    let src = `../assets/sounds/${kind}.ogg`;
    let objectUrl: string | undefined;
    try {
      const stored = await getCustomSound(kind);
      if (stored) {
        objectUrl = URL.createObjectURL(stored.blob);
        src = objectUrl;
      }
      const audio = new Audio(src);
      if (objectUrl) audio.addEventListener("ended", () => URL.revokeObjectURL(objectUrl!));
      await audio.play();
    } catch (e) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      console.error(e);
    }
  };

  return (
    <div style={{ ...rowStyle, marginBottom: 12 }}>
      <span style={{ width: 110, fontWeight: 500 }}>{label}</span>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: fileName ? "var(--rta-text, #1b241d)" : "var(--rta-text-muted, #888)",
          fontStyle: fileName ? "normal" : "italic",
        }}
        title={fileName ?? "Default sound"}
      >
        {busy ? "…" : fileName ?? "Default sound"}
      </span>

      <button type="button" style={buttonStyle} onClick={preview} disabled={busy} title="Preview">
        ▶
      </button>

      <button type="button" style={buttonStyle} onClick={() => fileInputRef.current?.click()} disabled={busy}>
        Choose…
      </button>

      {fileName && (
        <button
          type="button"
          style={{ ...buttonStyle, color: "var(--rta-danger, #B22222)" }}
          onClick={reset}
          disabled={busy}
          title="Reset to default"
        >
          Reset
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={e => handleFile(e.target.files?.[0])}
        style={{ display: "none" }}
      />
    </div>
  );
}
