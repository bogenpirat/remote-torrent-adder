import { useEffect, useRef, useState, type CSSProperties } from "react";
import { deleteCustomSound, getCustomSound, saveCustomSound, type SoundKind } from "../../util/sound-storage";
import { buttonStyle, rowStyle } from "./notification-styles";

interface CustomSound {
  fileName: string | null;
  busy: boolean;
  store: (file: File) => Promise<void>;
  reset: () => Promise<void>;
}

interface SoundActionsProps {
  sound: CustomSound;
  onPreview: () => void;
  onChoose: () => void;
  onReset: () => void;
}

// Custom sounds are kept small; they live in IndexedDB but are still loaded
// into memory to play, so cap the size to keep things snappy.
const MAX_SOUND_BYTES = 1024 * 1024; // 1 MB

const soundNameStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function reportSaveFailure(error: unknown): void {
  console.error(error);
  alert("Could not save that sound file.");
}

function useCustomSound(kind: SoundKind): CustomSound {
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    getCustomSound(kind)
      .then(stored => { if (active) setFileName(stored?.name ?? null); })
      .catch(() => { if (active) setFileName(null); })
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
  const reset = () => whileBusy(() => deleteCustomSound(kind).then(() => setFileName(null)));
  return { fileName, busy, store, reset };
}

async function previewSound(kind: SoundKind): Promise<void> {
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
}

export default function SoundPicker({ kind, label }: { kind: SoundKind; label: string }) {
  const sound = useCustomSound(kind);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (file && file.size > MAX_SOUND_BYTES) {
      alert(`That sound file is too large (max ${Math.round(MAX_SOUND_BYTES / 1024)} KB).`);
    } else if (file) {
      void sound.store(file);
    }
  };

  const reset = async () => {
    await sound.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ ...rowStyle, marginBottom: 12 }}>
      <span style={{ width: 110, fontWeight: 500 }}>{label}</span>

      <SoundName sound={sound} />

      <SoundActions sound={sound} onPreview={() => previewSound(kind)} onChoose={() => fileInputRef.current?.click()} onReset={reset} />

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

function SoundName({ sound }: { sound: CustomSound }) {
  const { fileName, busy } = sound;
  return (
    <span
      style={{
        ...soundNameStyle,
        color: fileName ? "var(--rta-text, #1b241d)" : "var(--rta-text-muted, #888)",
        fontStyle: fileName ? "normal" : "italic",
      }}
      title={fileName ?? "Default sound"}
    >
      {busy ? "…" : fileName ?? "Default sound"}
    </span>
  );
}

function SoundActions({ sound, onPreview, onChoose, onReset }: SoundActionsProps) {
  const { fileName, busy } = sound;
  return (
    <>
      <button type="button" style={buttonStyle} onClick={onPreview} disabled={busy} title="Preview">
        ▶
      </button>

      <button type="button" style={buttonStyle} onClick={onChoose} disabled={busy}>
        Choose…
      </button>

      {fileName && (
        <button
          type="button"
          style={{ ...buttonStyle, color: "var(--rta-danger, #B22222)" }}
          onClick={onReset}
          disabled={busy}
          title="Reset to default"
        >
          Reset
        </button>
      )}
    </>
  );
}
