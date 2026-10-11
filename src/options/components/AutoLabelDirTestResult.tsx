import React, { useState } from "react";
import type { AutoLabelDirSetting } from "../../models/webui";
import type { Torrent } from "../../models/torrent";
import { type AutoLabelDirExplanation } from "../../util/auto-label-dir-matcher";
import RuleRow from "./AutoLabelDirRuleRow";
import { type CriterionField } from "./auto-label-dir-fields";
import { BORDER, monospace } from "./auto-label-dir-tester-styles";
import { MUTED } from "./webui-fields";

export interface TestedRules {
  settings: AutoLabelDirSetting[];
  defaultLabel: string | null;
  defaultDir: string | null;
  showLabel: boolean;
  showDir: boolean;
}

interface OutcomeProps {
  caption: string;
  value: string | null;
  source: string | null;
}

interface SourcedOutcomeProps {
  caption: string;
  noun: string;
  ruleValue: string | null;
  defaultValue: string | null;
  winningRule: number | null;
}

interface EntryListProps {
  title: string;
  titleStyle: React.CSSProperties;
  entries: string[];
}

interface ResultPanelProps {
  torrent: Torrent;
  explanation: AutoLabelDirExplanation;
  rules: TestedRules;
  onClear: () => void;
}

const CONTENTS_TOGGLE_STYLE: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: "var(--rta-info, #4682b4)",
  fontSize: 14,
};

const CONTENTS_STYLE: React.CSSProperties = {
  marginTop: 8,
  maxHeight: 260,
  overflowY: "auto",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: 10,
  background: "var(--rta-surface, #fff)",
};

const RESULT_PANEL_STYLE: React.CSSProperties = {
  marginTop: 14,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: 12,
  background: "var(--rta-surface-alt, #f7faf7)",
};

const CLEAR_BUTTON_STYLE: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 13 };

const WARNING_STYLE: React.CSSProperties = { color: MUTED, fontSize: 13, marginTop: 8 };

function Outcome({ caption, value, source }: OutcomeProps) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontWeight: 500, minWidth: 74 }}>{caption}</span>
      <span style={value ? { ...monospace, fontSize: 15 } : { color: MUTED }}>
        {value || "(none)"}
      </span>
      {source && <span style={{ color: MUTED, fontSize: 13 }}>{source}</span>}
    </div>
  );
}

function SourcedOutcome({ caption, noun, ruleValue, defaultValue, winningRule }: SourcedOutcomeProps) {
  const source = ruleValue != null ? `from rule ${winningRule}` : (defaultValue ? `from the default ${noun}` : null);
  return <Outcome caption={caption} value={ruleValue ?? defaultValue ?? null} source={source} />;
}

function EntryList({ title, titleStyle, entries }: EntryListProps) {
  return (
    <>
      <div style={titleStyle}>{title}</div>
      {entries.length === 0
        ? <div style={{ color: MUTED, fontSize: 14 }}>None.</div>
        : entries.map((entry, idx) => <div key={idx} style={{ fontFamily: "monospace", fontSize: 13 }}>{entry}</div>)}
    </>
  );
}

function countOf(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function TorrentContents({ torrent }: { torrent: Torrent }) {
  const [open, setOpen] = useState(false);
  const trackers = torrent.trackers ?? [];
  const files = torrent.files ?? [];

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen(!open)} style={CONTENTS_TOGGLE_STYLE}>
        {open ? "▾" : "▸"} Torrent contents ({countOf(trackers.length, "tracker")}, {countOf(files.length, "file")})
      </button>
      {open && (
        <div style={CONTENTS_STYLE}>
          <EntryList title="Trackers" titleStyle={{ fontWeight: 500, marginBottom: 4 }} entries={trackers} />
          <EntryList title="Files" titleStyle={{ fontWeight: 500, margin: "10px 0 4px" }} entries={files} />
        </div>
      )}
    </div>
  );
}

function Outcomes({ explanation, rules }: Pick<ResultPanelProps, "explanation" | "rules">) {
  const winningRule = explanation.winningRuleIndex != null ? explanation.winningRuleIndex + 1 : null;
  const { label, dir } = explanation;
  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      {rules.showLabel && (
        <SourcedOutcome caption="Label" noun="label" ruleValue={label} defaultValue={rules.defaultLabel} winningRule={winningRule} />
      )}
      {rules.showDir && (
        <SourcedOutcome caption="Directory" noun="directory" ruleValue={dir} defaultValue={rules.defaultDir} winningRule={winningRule} />
      )}
    </div>
  );
}

function Warnings({ torrent, settings }: { torrent: Torrent; settings: AutoLabelDirSetting[] }) {
  const usesField = (field: CriterionField) => settings.some(setting => setting.criteria.some(criterion => criterion.field === field));
  return (
    <>
      {torrent.isMagnet && usesField("filePath") && (
        <div style={WARNING_STYLE}>
          This is a magnet link, so it carries trackers but no file list — file criteria can never match it.
          {torrent.declaredName ? " Torrent name and tracker criteria still work." : ""}
        </div>
      )}

      {!torrent.declaredName && usesField("torrentName") && (
        <div style={WARNING_STYLE}>
          This torrent declares no name of its own, so torrent name criteria can never match it —
          “{torrent.name}” is only a stand-in for display.
        </div>
      )}
    </>
  );
}

export default function AutoLabelDirTestResult({ torrent, explanation, rules, onClear }: ResultPanelProps) {
  const { showLabel, showDir } = rules;
  return (
    <div style={RESULT_PANEL_STYLE}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600, wordBreak: "break-all" }}>{torrent.name}</span>
        <button onClick={onClear} style={CLEAR_BUTTON_STYLE}>
          Clear
        </button>
      </div>

      <Outcomes explanation={explanation} rules={rules} />

      <Warnings torrent={torrent} settings={rules.settings} />

      {explanation.rules.map(rule => (
        <RuleRow key={rule.index} rule={rule} winningRuleIndex={explanation.winningRuleIndex} showLabel={showLabel} showDir={showDir} />
      ))}

      <TorrentContents torrent={torrent} />
    </div>
  );
}
