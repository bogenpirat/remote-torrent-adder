import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { type NotificationKind } from "../../models/notification-kind";
import { playNotificationSound } from "../../util/play-sound";
import { deleteCustomSound, getCustomSound, saveCustomSound } from "../../util/sound-storage";
import { BUTTON_STYLE, ROW_STYLE } from "./notification-styles";
import { TEXT, MUTED, DANGER } from "../theme";

// Custom sounds are kept small; they live in IndexedDB but are still loaded
// into memory to play, so cap the size to keep things snappy.
const BYTES_PER_KB = 1024;
const MAX_SOUND_KB = 1024;
const MAX_SOUND_BYTES = MAX_SOUND_KB * BYTES_PER_KB;

const DEFAULT_SOUND_LABEL = "Default sound";

const SOUND_NAME_STYLE: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export default function SoundPicker({ kind, label }: { kind: NotificationKind; label: string }) {
  const sound = useCustomSound(kind);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = async () => {
    await sound.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ ...ROW_STYLE, marginBottom: 12 }}>
      <span style={{ width: 110, fontWeight: 500 }}>{label}</span>

      <SoundName sound={sound} />

      <SoundActions
        sound={sound}
        onPreview={() => void playNotificationSound(kind)}
        onChoose={() => fileInputRef.current?.click()}
        onReset={reset}
      />

      <HiddenSoundFileInput sound={sound} inputRef={fileInputRef} />
    </div>
  );
}

function HiddenSoundFileInput({ sound, inputRef }: { sound: CustomSound; inputRef: RefObject<HTMLInputElement | null> }) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept="audio/*"
      onChange={e => storeOrAlertTooLarge(sound, e.target.files?.[0])}
      style={{ display: "none" }}
    />
  );
}

function storeOrAlertTooLarge(sound: CustomSound, file: File | undefined): void {
  if (file && file.size > MAX_SOUND_BYTES) {
    alert(`That sound file is too large (max ${MAX_SOUND_KB} KB).`);
  } else if (file) {
    void sound.store(file);
  }
}

interface CustomSound {
  fileName: string | null;
  busy: boolean;
  store: (file: File) => Promise<void>;
  reset: () => Promise<void>;
}

function useCustomSound(kind: NotificationKind): CustomSound {
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    getCustomSound(kind)
      .then(stored => { if (active) setFileName(stored?.name ?? null); })
      .catch(error => {
        console.error(`Failed loading the custom ${kind} sound:`, error);
        if (active) setFileName(null);
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [kind]);

  const whileBusy = async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); } finally { setBusy(false); }
  };
  const store = (file: File) => whileBusy(() => {
    return saveCustomSound(kind, file, file.name).then(() => setFileName(file.name), reportSaveFailure);
  });
  const reset = () => whileBusy(() => deleteCustomSound(kind).then(() => setFileName(null), reportResetFailure));
  return { fileName, busy, store, reset };
}

function reportSaveFailure(error: unknown): void {
  console.error(error);
  alert("Could not save that sound file.");
}

function reportResetFailure(error: unknown): void {
  console.error(error);
  alert("Could not reset that sound.");
}

function SoundName({ sound }: { sound: CustomSound }) {
  const { fileName, busy } = sound;
  return (
    <span
      style={{
        ...SOUND_NAME_STYLE,
        color: fileName ? TEXT : MUTED,
        fontStyle: fileName ? "normal" : "italic",
      }}
      title={fileName ?? DEFAULT_SOUND_LABEL}
    >
      {busy ? "…" : fileName ?? DEFAULT_SOUND_LABEL}
    </span>
  );
}

interface SoundActionsProps {
  sound: CustomSound;
  onPreview: () => void;
  onChoose: () => void;
  onReset: () => void;
}

function SoundActions({ sound, onPreview, onChoose, onReset }: SoundActionsProps) {
  const { fileName, busy } = sound;
  return (
    <>
      <button type="button" style={BUTTON_STYLE} onClick={onPreview} disabled={busy} title="Preview">
        ▶
      </button>

      <button type="button" style={BUTTON_STYLE} onClick={onChoose} disabled={busy}>
        Choose…
      </button>

      {fileName && <ResetButton busy={busy} onReset={onReset} />}
    </>
  );
}

function ResetButton({ busy, onReset }: { busy: boolean; onReset: () => void }) {
  return (
    <button type="button" style={{ ...BUTTON_STYLE, color: DANGER }} onClick={onReset} disabled={busy} title="Reset to default">
      Reset
    </button>
  );
}
