import React, { useMemo, useRef, useState } from "react";
import type { Torrent } from "../../models/torrent";
import { messageOf } from "../../models/error-message";
import { explainAutoLabelDir } from "../../util/auto-label-dir-matcher";
import { buildTorrentFromMagnetLink, parseTorrentFile } from "../../util/torrent-source";
import AutoLabelDirTestResult, { type TestedRules } from "./AutoLabelDirTestResult";
import { ACCENT_BUTTON_STYLE } from "../shared-styles";
import { TEXT, MUTED, BORDER, CHIP_BG, SURFACE, INPUT_BG, SUCCESS, DANGER } from "../theme";

const MAX_TORRENT_BYTES = 10 * 1024 * 1024;

const DROP_ZONE_SHAPE_STYLE: React.CSSProperties = { borderRadius: 10, padding: "16px 12px", textAlign: "center" };

const MAGNET_INPUT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontFamily: "monospace",
  fontSize: 14,
  border: `1px solid ${BORDER}`,
  background: INPUT_BG,
  color: TEXT,
  borderRadius: 8,
  padding: "4px 10px",
};

type AutoLabelDirTesterProps = TestedRules;

function AutoLabelDirTester(props: AutoLabelDirTesterProps) {
  const trial = useRuleTrial();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { torrent } = trial;
  const explanation = useMemo(() => (torrent ? explainAutoLabelDir(torrent, props.settings) : null), [torrent, props.settings]);

  const clear = () => {
    trial.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Test these rules</div>
      <div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>
        Drop a .torrent file or paste a magnet link to see which rules would match it. Nothing is uploaded or added to your client.
      </div>

      <DropZone fileInputRef={fileInputRef} onFile={file => tryTorrentFile(file, trial)} />

      <MagnetForm trial={trial} />

      {trial.error && <div style={{ color: DANGER, marginTop: 10 }}>{trial.error}</div>}

      {torrent && explanation && <AutoLabelDirTestResult torrent={torrent} explanation={explanation} rules={props} onClear={clear} />}
    </div>
  );
}

interface RuleTrial {
  torrent: Torrent | null;
  error: string | null;
  magnetLink: string;
  setMagnetLink: (magnetLink: string) => void;
  showParsedFile: (torrent: Torrent) => void;
  showMagnetTorrent: (torrent: Torrent) => void;
  fail: (message: string) => void;
  reset: () => void;
}

function useRuleTrial(): RuleTrial {
  const [torrent, setTorrent] = useState<Torrent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [magnetLink, setMagnetLink] = useState("");
  const settle = (shown: Torrent | null, message: string | null) => {
    setTorrent(shown);
    setError(message);
  };
  return {
    torrent,
    error,
    magnetLink,
    setMagnetLink,
    showParsedFile: shown => { settle(shown, null); setMagnetLink(""); },
    showMagnetTorrent: shown => settle(shown, null),
    fail: message => settle(null, message),
    reset: () => { settle(null, null); setMagnetLink(""); },
  };
}

interface DropZoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
}

function DropZone({ fileInputRef, onFile }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files?.[0]); }}
      style={{
        border: `2px dashed ${dragging ? SUCCESS : BORDER}`,
        background: dragging ? CHIP_BG : SURFACE,
        ...DROP_ZONE_SHAPE_STYLE,
      }}>
      <span style={{ marginRight: 8 }}>Drop a .torrent file here</span>
      <button onClick={() => fileInputRef.current?.click()} style={ACCENT_BUTTON_STYLE}>
        Choose file…
      </button>
      <TorrentFileInput fileInputRef={fileInputRef} onFile={onFile} />
    </div>
  );
}

function TorrentFileInput({ fileInputRef, onFile }: DropZoneProps) {
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept=".torrent,application/x-bittorrent"
      onChange={e => onFile(e.target.files?.[0])}
      style={{ display: "none" }}
    />
  );
}

async function tryTorrentFile(file: File | undefined, trial: RuleTrial): Promise<void> {
  if (!file) return;
  if (file.size > MAX_TORRENT_BYTES) {
    trial.fail(`That file is too large (max ${Math.round(MAX_TORRENT_BYTES / 1024 / 1024)} MB).`);
    return;
  }
  try {
    trial.showParsedFile(await parseTorrentFile(file));
  } catch (error) {
    trial.fail(messageOf(error));
  }
}

function MagnetForm({ trial }: { trial: RuleTrial }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
      <input
        type="text"
        value={trial.magnetLink}
        onChange={e => trial.setMagnetLink(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") tryMagnetLink(trial); }}
        placeholder="…or paste a magnet link"
        style={MAGNET_INPUT_STYLE}
      />
      <button onClick={() => tryMagnetLink(trial)} style={ACCENT_BUTTON_STYLE}>
        Test
      </button>
    </div>
  );
}

function tryMagnetLink(trial: RuleTrial): void {
  const trimmed = trial.magnetLink.trim();
  if (!trimmed.startsWith("magnet:")) {
    trial.fail("That doesn't look like a magnet link.");
    return;
  }
  trial.showMagnetTorrent(buildTorrentFromMagnetLink(trimmed));
}

export default AutoLabelDirTester;
