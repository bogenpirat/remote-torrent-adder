import React, { useState } from "react";
import type { AutoLabelDirSetting, AutoLabelDirCriterion } from "../../models/webui";
import ChipList from "./ChipList";

interface AutoLabelDirSettingsEditorProps {
  value: AutoLabelDirSetting[];
  onChange: (settings: AutoLabelDirSetting[]) => void;
  showLabel: boolean;
  showDir: boolean;
  labels: string[];
  dirs: string[];
}

const CRITERIA_FIELDS = [
  { value: "trackerUrl", label: "Tracker URL" }
];

function CriteriaEditor({ criteria, onChange }: { criteria: AutoLabelDirCriterion[]; onChange: (c: AutoLabelDirCriterion[]) => void }) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    if (value.trim()) {
      onChange([...criteria, { field: "trackerUrl", value: value.trim() }]);
      setValue("");
    }
  };
  const handleRemove = (idx: number) => {
    const arr = [...criteria];
    arr.splice(idx, 1);
    onChange(arr);
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Criteria</label>
      {criteria.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 32 }}>
          {criteria.map((c, idx) => (
            <span key={idx} style={{ display: "inline-flex", alignItems: "center", background: "var(--rta-chip-bg, #eaf5ea)", border: "1px solid var(--rta-chip-border, #b7c9a7)", borderRadius: 16, padding: "4px 12px", fontFamily: "monospace", fontSize: 15 }}>
              <span style={{ marginRight: 8 }}>Tracker URL:</span>
              <span style={{ marginRight: 8 }}>{c.value}</span>
              <button onClick={() => handleRemove(idx)} style={{ fontSize: 13, marginLeft: 2 }}>🗑</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: criteria.length > 0 ? 8 : 0 }}>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Value"
          style={{ fontFamily: "monospace", fontSize: 15, border: "1px solid var(--rta-border, #b7c9a7)", background: "var(--rta-input-bg, #fff)", color: "var(--rta-text, #1b241d)", borderRadius: 8, padding: "4px 10px" }}
        />
        <button onClick={handleAdd} style={{ background: "var(--rta-accent, #b7c9a7)", color: "var(--rta-green-dark, #4e6a57)", border: "none", borderRadius: 8, padding: "4px 12px", fontWeight: 500, cursor: "pointer" }}>Add</button>
      </div>
    </div>
  );
}

function AutoLabelDirSettingsEditor({ value, onChange, showLabel, showDir, labels, dirs }: AutoLabelDirSettingsEditorProps) {
  const handleAdd = () => {
    onChange([...value, { criteria: [], label: showLabel ? "" : null, dir: showDir ? "" : null }]);
  };
  const handleRemove = (idx: number) => {
    const arr = [...value];
    arr.splice(idx, 1);
    onChange(arr);
  };
  const handleCriteriaChange = (idx: number, criteria: AutoLabelDirCriterion[]) => {
    const arr = [...value];
    arr[idx] = { ...arr[idx], criteria };
    onChange(arr);
  };
  const handleLabelChange = (idx: number, label: string) => {
    const arr = [...value];
    arr[idx] = { ...arr[idx], label };
    onChange(arr);
  };
  const handleDirChange = (idx: number, dir: string) => {
    const arr = [...value];
    arr[idx] = { ...arr[idx], dir };
    onChange(arr);
  };
  return (
    <div style={{ marginBottom: 20, border: "1px solid var(--rta-border, #b7c9a7)", borderRadius: 10, padding: 16, background: "var(--rta-surface-alt, #f7faf7)" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 16, marginRight: 12 }}>Auto Label/Dir Settings</span>
        <button onClick={handleAdd} style={{ background: "var(--rta-success, #228B22)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontWeight: 500, cursor: "pointer" }}>Add Rule</button>
      </div>
      {value.length === 0 && <div style={{ color: "var(--rta-text-muted, #888)", marginBottom: 8 }}>No rules defined yet.</div>}
      {value.map((setting, idx) => (
        <div key={idx} style={{ marginBottom: 18, padding: 12, border: "1px solid var(--rta-border, #b7c9a7)", borderRadius: 8, background: "var(--rta-surface, #fff)", position: "relative" }}>
          <button
            onClick={() => handleRemove(idx)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "var(--rta-danger, #B22222)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "4px 10px",
              fontWeight: 500,
              cursor: "pointer"
            }}
            title="Remove rule"
          >🗑</button>
          <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <CriteriaEditor criteria={setting.criteria} onChange={c => handleCriteriaChange(idx, c)} />
            </div>
            <div style={{ flex: 1 }}>
              {showLabel && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Label</label>
                  <select
                    value={setting.label ?? ""}
                    onChange={e => handleLabelChange(idx, e.target.value === "" ? null : e.target.value)}
                    style={{ fontSize: 15, borderRadius: 8, padding: "4px 10px", border: "1px solid var(--rta-border, #b7c9a7)", background: "var(--rta-input-bg, #fff)", color: "var(--rta-text, #1b241d)", minWidth: 120 }}>
                    <option value="">(none)</option>
                    {[...(labels.includes(setting.label ?? "") || !setting.label ? labels : [setting.label, ...labels])]
                      .filter((l, i, arr) => l && arr.indexOf(l) === i)
                      .map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              {showDir && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Directory</label>
                  <select
                    value={setting.dir ?? ""}
                    onChange={e => handleDirChange(idx, e.target.value === "" ? null : e.target.value)}
                    style={{ fontSize: 15, borderRadius: 8, padding: "4px 10px", border: "1px solid var(--rta-border, #b7c9a7)", background: "var(--rta-input-bg, #fff)", color: "var(--rta-text, #1b241d)", minWidth: 120 }}>
                    <option value="">(none)</option>
                    {[...(dirs.includes(setting.dir ?? "") || !setting.dir ? dirs : [setting.dir, ...dirs])]
                      .filter((d, i, arr) => d && arr.indexOf(d) === i)
                      .map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AutoLabelDirSettingsEditor;
