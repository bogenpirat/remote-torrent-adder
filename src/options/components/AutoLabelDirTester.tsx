import React, { useMemo, useRef, useState } from "react";
import type { Torrent } from "../../models/torrent";
import { explainAutoLabelDir } from "../../util/auto-label-dir-matcher";
import { buildTorrentFromMagnetLink, parseTorrentFile } from "../../util/torrent-source";
import AutoLabelDirTestResult, { type AutoLabelDirTesterProps } from "./AutoLabelDirTestResult";
import { BORDER, DANGER, MUTED, SUCCESS } from "./auto-label-dir-tester-styles";

interface TorrentTest {
  torrent: Torrent | null;
  error: string | null;
  magnetLink: string;
  setMagnetLink: (magnetLink: string) => void;
  showFile: (torrent: Torrent) => void;
  showMagnet: (torrent: Torrent) => void;
  fail: (message: string) => void;
  reset: () => void;
}

interface DropZoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
}

const MAX_TORRENT_BYTES = 10 * 1024 * 1024;

const DROP_ZONE_SHAPE_STYLE: React.CSSProperties = { borderRadius: 10, padding: "16px 12px", textAlign: "center" };

const ACCENT_BUTTON_STYLE: React.CSSProperties = {
  background: "var(--rta-accent, #b7c9a7)",
  color: "var(--rta-green-dark, #4e6a57)",
  border: "none",
  borderRadius: 8,
  padding: "4px 12px",
  fontWeight: 500,
  cursor: "pointer",
};

const MAGNET_INPUT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontFamily: "monospace",
  fontSize: 14,
  border: `1px solid ${BORDER}`,
  background: "var(--rta-input-bg, #fff)",
  color: "var(--rta-text, #1b241d)",
  borderRadius: 8,
  padding: "4px 10px",
};

function useTorrentTest(): TorrentTest {
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
    showFile: shown => { settle(shown, null); setMagnetLink(""); },
    showMagnet: shown => settle(shown, null),
    fail: message => settle(null, message),
    reset: () => { settle(null, null); setMagnetLink(""); },
  };
}

async function testFile(file: File | undefined, test: TorrentTest): Promise<void> {
  if (!file) return;
  if (file.size > MAX_TORRENT_BYTES) {
    test.fail(`That file is too large (max ${Math.round(MAX_TORRENT_BYTES / 1024 / 1024)} MB).`);
    return;
  }
  try {
    test.showFile(await parseTorrentFile(file));
  } catch (e) {
    test.fail((e as Error).message);
  }
}

function testMagnet(test: TorrentTest): void {
  const trimmed = test.magnetLink.trim();
  if (!trimmed.startsWith("magnet:")) {
    test.fail("That doesn't look like a magnet link.");
    return;
  }
  test.showMagnet(buildTorrentFromMagnetLink(trimmed));
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
        background: dragging ? "var(--rta-chip-bg, #eaf5ea)" : "var(--rta-surface, #fff)",
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

function MagnetForm({ test }: { test: TorrentTest }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
      <input
        type="text"
        value={test.magnetLink}
        onChange={e => test.setMagnetLink(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") testMagnet(test); }}
        placeholder="…or paste a magnet link"
        style={MAGNET_INPUT_STYLE}
      />
      <button onClick={() => testMagnet(test)} style={ACCENT_BUTTON_STYLE}>
        Test
      </button>
    </div>
  );
}

function AutoLabelDirTester(props: AutoLabelDirTesterProps) {
  const test = useTorrentTest();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { torrent } = test;
  const explanation = useMemo(() => (torrent ? explainAutoLabelDir(torrent, props.settings) : null), [torrent, props.settings]);

  const clear = () => {
    test.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Test these rules</div>
      <div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>
        Drop a .torrent file or paste a magnet link to see which rules would match it. Nothing is uploaded or added to your client.
      </div>

      <DropZone fileInputRef={fileInputRef} onFile={file => testFile(file, test)} />

      <MagnetForm test={test} />

      {test.error && <div style={{ color: DANGER, marginTop: 10 }}>{test.error}</div>}

      {torrent && explanation && <AutoLabelDirTestResult torrent={torrent} explanation={explanation} tester={props} onClear={clear} />}
    </div>
  );
}

export default AutoLabelDirTester;
