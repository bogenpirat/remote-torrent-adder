import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

const CHECKBOX_STYLE: React.CSSProperties = {
  opacity: 0,
  width: 44,
  height: 24,
  position: "absolute",
  left: 0,
  top: 0,
  margin: 0,
  cursor: "pointer",
};

const TRACK_SHAPE_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: 16,
};

const THUMB_SHAPE_STYLE: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: "var(--rta-surface, #fff)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
  transition: "left 0.2s",
};

const Track: React.FC<{ background: string }> = ({ background }) => (
  <span style={{ ...TRACK_SHAPE_STYLE, background, transition: "background 0.2s" }}></span>
);

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
    <span style={{ position: "relative", width: 44, height: 24, display: "inline-block" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={CHECKBOX_STYLE} />
      <Track background={checked ? "var(--rta-success, #228B22)" : "var(--rta-neutral, #ccc)"} />
      <span style={{ position: "absolute", top: 2, left: checked ? 20 : 4, ...THUMB_SHAPE_STYLE }}></span>
    </span>
    <span style={{ fontWeight: 500 }}>{label}</span>
  </label>
);

export default Toggle;
