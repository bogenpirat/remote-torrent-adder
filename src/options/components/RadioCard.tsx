import React from "react";
import { TEXT, MUTED, GREEN_DARK, ACCENT, BORDER, CHIP_BG, SURFACE, SELECTED_SHADOW } from "../theme";

interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  note?: string;
  onChange: (value: string) => void;
}

const RADIO_STYLE: React.CSSProperties = { marginTop: 3, accentColor: GREEN_DARK };

const LABEL_STYLE: React.CSSProperties = { fontWeight: 600, display: "block", color: TEXT };

const DESCRIPTION_STYLE: React.CSSProperties = {
  color: MUTED,
  fontSize: 13,
  display: "block",
  marginTop: 2,
  maxWidth: 440,
};

const NOTE_STYLE: React.CSSProperties = {
  color: MUTED,
  fontSize: 12,
  fontStyle: "italic",
  display: "block",
  marginTop: 4,
};

function cardStyle({ checked, disabled }: Pick<RadioCardProps, "checked" | "disabled">): React.CSSProperties {
  return {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: "12px 16px",
    borderRadius: 10,
    border: `1px solid ${checked ? ACCENT : BORDER}`,
    background: checked ? CHIP_BG : SURFACE,
    boxShadow: checked ? SELECTED_SHADOW : "none",
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
  };
}

const RadioCard: React.FC<RadioCardProps> = ({ name, value, checked, disabled, label, description, note, onChange }) => (
  <label style={cardStyle({ checked, disabled })}>
    <input
      type="radio" name={name} value={value} checked={checked} disabled={disabled}
      onChange={() => onChange(value)} style={RADIO_STYLE}
    />
    <span>
      <span style={LABEL_STYLE}>{label}</span>
      <span style={DESCRIPTION_STYLE}>{description}</span>
      {note && <span style={NOTE_STYLE}>{note}</span>}
    </span>
  </label>
);

export default RadioCard;
