import React from "react";
import { SURFACE, NEUTRAL, SUCCESS } from "../theme";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
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
  background: SURFACE,
  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
  transition: "left 0.2s",
};

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
    <span style={{ position: "relative", width: 44, height: 24, display: "inline-block" }}>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} style={CHECKBOX_STYLE} />
      <Track background={checked ? SUCCESS : NEUTRAL} />
      <span style={{ position: "absolute", top: 2, left: checked ? 20 : 4, ...THUMB_SHAPE_STYLE }}></span>
    </span>
    <span style={{ fontWeight: 500 }}>{label}</span>
  </label>
);

function Track({ background }: { background: string }) {
  return <span style={{ ...TRACK_SHAPE_STYLE, background, transition: "background 0.2s" }}></span>;
}

export default Toggle;
