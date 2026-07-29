import React, { useMemo, useRef, useState } from "react";
import type { AutoLabelDirSetting } from "../../models/webui";
import type { Torrent } from "../../models/torrent";
import {
  explainAutoLabelDir,
  type AutoLabelDirCriterionEvaluation,
  type AutoLabelDirRuleEvaluation
} from "../../util/auto-label-dir-matcher";
import { buildTorrentFromMagnetLink, parseTorrentFile } from "../../util/torrent-source";
import { fieldLabel } from "./auto-label-dir-fields";

interface AutoLabelDirTesterProps {
  settings: AutoLabelDirSetting[];
  defaultLabel: string | null;
  defaultDir: string | null;
  showLabel: boolean;
  showDir: boolean;
}

const MAX_TORRENT_BYTES = 10 * 1024 * 1024;

const monospace: React.CSSProperties = {
  fontFamily: "monospace",
  background: "var(--rta-chip-bg, #eaf5ea)",
  border: "1px solid var(--rta-chip-border, #b7c9a7)",
  borderRadius: 6,
  padding: "1px 6px"
};

function Outcome({ caption, value, source }: { caption: string; value: string | null; source: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontWeight: 500, minWidth: 74 }}>{caption}</span>
      <span style={value ? { ...monospace, fontSize: 15 } : { color: "var(--rta-text-muted, #888)" }}>
        {value || "(none)"}
      </span>
      {source && <span style={{ color: "var(--rta-text-muted, #888)", fontSize: 13 }}>{source}</span>}
    </div>
  );
}

function CriterionRow({ evaluation }: { evaluation: AutoLabelDirCriterionEvaluation }) {
  const { criterion, matched, matchedCandidates, invalidPattern } = evaluation;

  const verdict = () => {
    if (invalidPattern) {
      return <span style={{ color: "var(--rta-danger, #B22222)" }}>❌ invalid regular expression</span>;
    }
    if (!criterion.value) {
      return <span style={{ color: "var(--rta-text-muted, #888)" }}>✅ empty pattern, always matches</span>;
    }
    if (!matched) {
      return <span style={{ color: "var(--rta-danger, #B22222)" }}>❌ no match</span>;
    }
    const extra = matchedCandidates.length - 1;
    return (
      <span style={{ color: "var(--rta-success, #228B22)" }}>
        ✅ {matchedCandidates[0]}{extra > 0 ? ` (+${extra} more)` : ""}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", fontSize: 14, marginTop: 4 }}>
      <span style={{ color: "var(--rta-text-muted, #888)", minWidth: 96 }}>{fieldLabel(criterion.field)}</span>
      <span style={monospace}>{criterion.value || "(empty)"}</span>
      {verdict()}
    </div>
  );
}

function RuleRow({ rule, winningRuleIndex, showLabel, showDir }: {
  rule: AutoLabelDirRuleEvaluation;
  winningRuleIndex: number | null;
  showLabel: boolean;
  showDir: boolean;
}) {
  const isWinner = rule.index === winningRuleIndex;
  const isShadowed = rule.matched && !isWinner;

  const outcomeParts: string[] = [];
  if (showLabel) outcomeParts.push(`label ${rule.setting.label ? `"${rule.setting.label}"` : "(none)"}`);
  if (showDir) outcomeParts.push(`dir ${rule.setting.dir ? `"${rule.setting.dir}"` : "(none)"}`);

  return (
    <div style={{
      padding: "8px 10px",
      marginTop: 8,
      borderRadius: 8,
      background: "var(--rta-surface, #fff)",
      border: `1px solid ${isWinner ? "var(--rta-success, #228B22)" : "var(--rta-border, #b7c9a7)"}`
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>Rule {rule.index + 1}</span>
        {isWinner && <span style={{ color: "var(--rta-success, #228B22)", fontWeight: 500 }}>✅ applied → {outcomeParts.join(", ")}</span>}
        {isShadowed && (
          <span style={{ color: "var(--rta-text-muted, #888)" }}>
            ✅ matches, but rule {(winningRuleIndex ?? 0) + 1} wins
          </span>
        )}
        {!rule.matched && <span style={{ color: "var(--rta-text-muted, #888)" }}>❌ does not match</span>}
      </div>
      {rule.criteria.length === 0
        ? <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 14, marginTop: 4 }}>No criteria — a rule without criteria never matches.</div>
        : rule.criteria.map((evaluation, idx) => <CriterionRow key={idx} evaluation={evaluation} />)}
    </div>
  );
}

function TorrentContents({ torrent }: { torrent: Torrent }) {
  const [open, setOpen] = useState(false);
  const trackers = torrent.trackers ?? [];
  const files = torrent.files ?? [];

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--rta-info, #4682b4)", fontSize: 14 }}>
        {open ? "▾" : "▸"} Torrent contents ({trackers.length} {trackers.length === 1 ? "tracker" : "trackers"}, {files.length} {files.length === 1 ? "file" : "files"})
      </button>
      {open && (
        <div style={{ marginTop: 8, maxHeight: 260, overflowY: "auto", border: "1px solid var(--rta-border, #b7c9a7)", borderRadius: 8, padding: 10, background: "var(--rta-surface, #fff)" }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Trackers</div>
          {trackers.length === 0
            ? <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 14 }}>None.</div>
            : trackers.map((tracker, idx) => <div key={idx} style={{ fontFamily: "monospace", fontSize: 13 }}>{tracker}</div>)}
          <div style={{ fontWeight: 500, margin: "10px 0 4px" }}>Files</div>
          {files.length === 0
            ? <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 14 }}>None.</div>
            : files.map((file, idx) => <div key={idx} style={{ fontFamily: "monospace", fontSize: 13 }}>{file}</div>)}
        </div>
      )}
    </div>
  );
}

function AutoLabelDirTester({ settings, defaultLabel, defaultDir, showLabel, showDir }: AutoLabelDirTesterProps) {
  const [torrent, setTorrent] = useState<Torrent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [magnetLink, setMagnetLink] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const explanation = useMemo(
    () => (torrent ? explainAutoLabelDir(torrent, settings) : null),
    [torrent, settings]
  );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_TORRENT_BYTES) {
      setTorrent(null);
      setError(`That file is too large (max ${Math.round(MAX_TORRENT_BYTES / 1024 / 1024)} MB).`);
      return;
    }
    try {
      setTorrent(await parseTorrentFile(file));
      setError(null);
      setMagnetLink("");
    } catch (e) {
      setTorrent(null);
      setError((e as Error).message);
    }
  };

  const handleMagnet = () => {
    const trimmed = magnetLink.trim();
    if (!trimmed.startsWith("magnet:")) {
      setTorrent(null);
      setError("That doesn't look like a magnet link.");
      return;
    }
    setTorrent(buildTorrentFromMagnetLink(trimmed));
    setError(null);
  };

  const clear = () => {
    setTorrent(null);
    setError(null);
    setMagnetLink("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const winningRule = explanation?.winningRuleIndex != null ? explanation.winningRuleIndex + 1 : null;
  const effectiveLabel = explanation?.label ?? defaultLabel ?? null;
  const effectiveDir = explanation?.dir ?? defaultDir ?? null;
  const labelSource = explanation?.label != null ? `from rule ${winningRule}` : (defaultLabel ? "from the default label" : null);
  const dirSource = explanation?.dir != null ? `from rule ${winningRule}` : (defaultDir ? "from the default directory" : null);
  const hasFileCriteria = settings.some(setting => setting.criteria.some(criterion => criterion.field === "filePath"));

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--rta-border, #b7c9a7)", paddingTop: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Test these rules</div>
      <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 13, marginBottom: 10 }}>
        Drop a .torrent file or paste a magnet link to see which rules would match it. Nothing is uploaded or added to your client.
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        style={{
          border: `2px dashed ${dragging ? "var(--rta-success, #228B22)" : "var(--rta-border, #b7c9a7)"}`,
          background: dragging ? "var(--rta-chip-bg, #eaf5ea)" : "var(--rta-surface, #fff)",
          borderRadius: 10,
          padding: "16px 12px",
          textAlign: "center"
        }}>
        <span style={{ marginRight: 8 }}>Drop a .torrent file here</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ background: "var(--rta-accent, #b7c9a7)", color: "var(--rta-green-dark, #4e6a57)", border: "none", borderRadius: 8, padding: "4px 12px", fontWeight: 500, cursor: "pointer" }}>
          Choose file…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".torrent,application/x-bittorrent"
          onChange={e => handleFile(e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        <input
          type="text"
          value={magnetLink}
          onChange={e => setMagnetLink(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleMagnet(); }}
          placeholder="…or paste a magnet link"
          style={{ flex: 1, minWidth: 0, fontFamily: "monospace", fontSize: 14, border: "1px solid var(--rta-border, #b7c9a7)", background: "var(--rta-input-bg, #fff)", color: "var(--rta-text, #1b241d)", borderRadius: 8, padding: "4px 10px" }}
        />
        <button
          onClick={handleMagnet}
          style={{ background: "var(--rta-accent, #b7c9a7)", color: "var(--rta-green-dark, #4e6a57)", border: "none", borderRadius: 8, padding: "4px 12px", fontWeight: 500, cursor: "pointer" }}>
          Test
        </button>
      </div>

      {error && <div style={{ color: "var(--rta-danger, #B22222)", marginTop: 10 }}>{error}</div>}

      {torrent && explanation && (
        <div style={{ marginTop: 14, border: "1px solid var(--rta-border, #b7c9a7)", borderRadius: 10, padding: 12, background: "var(--rta-surface-alt, #f7faf7)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, wordBreak: "break-all" }}>{torrent.name}</span>
            <button
              onClick={clear}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rta-text-muted, #888)", fontSize: 13 }}>
              Clear
            </button>
          </div>

          <div style={{ marginTop: 8, marginBottom: 4 }}>
            {showLabel && <Outcome caption="Label" value={effectiveLabel} source={labelSource} />}
            {showDir && <Outcome caption="Directory" value={effectiveDir} source={dirSource} />}
          </div>

          {torrent.isMagnet && hasFileCriteria && (
            <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 13, marginTop: 8 }}>
              This is a magnet link, so it carries trackers but no file list — file criteria can never match it.
            </div>
          )}

          {explanation.rules.map(rule => (
            <RuleRow
              key={rule.index}
              rule={rule}
              winningRuleIndex={explanation.winningRuleIndex}
              showLabel={showLabel}
              showDir={showDir}
            />
          ))}

          <TorrentContents torrent={torrent} />
        </div>
      )}
    </div>
  );
}

export default AutoLabelDirTester;
