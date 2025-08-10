import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
    <span style={{ position: "relative", width: 44, height: 24, display: "inline-block" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 44, height: 24, position: "absolute", left: 0, top: 0, margin: 0, cursor: "pointer" }}
      />
      <span
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          borderRadius: 16,
          background: checked ? "#228B22" : "#ccc",
          transition: "background 0.2s",
        }}
      ></span>
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 20 : 4,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          transition: "left 0.2s",
        }}
      ></span>
    </span>
    <span style={{ fontWeight: 500 }}>{label}</span>
  </label>
);

export default Toggle;
