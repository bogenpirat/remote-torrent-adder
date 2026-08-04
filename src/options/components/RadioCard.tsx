import React from "react";

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

const RadioCard: React.FC<RadioCardProps> = ({ name, value, checked, disabled, label, description, note, onChange }) => (
  <label
    style={{
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "12px 16px",
      borderRadius: 10,
      border: `1px solid ${checked ? "var(--rta-accent, #8fae7c)" : "var(--rta-border, #d8e2d3)"}`,
      background: checked ? "var(--rta-chip-bg, #eaf5ea)" : "var(--rta-surface, #fff)",
      boxShadow: checked ? "0 1px 4px rgba(110,139,116,0.15)" : "none",
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
    }}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      onChange={() => onChange(value)}
      style={{ marginTop: 3, accentColor: "var(--rta-green-dark, #4e6a57)" }}
    />
    <span>
      <span style={{ fontWeight: 600, display: "block", color: "var(--rta-text, #1b241d)" }}>{label}</span>
      <span style={{ color: "var(--rta-text-muted, #6b7a70)", fontSize: 13, display: "block", marginTop: 2, maxWidth: 440 }}>
        {description}
      </span>
      {note && (
        <span style={{ color: "var(--rta-text-muted, #6b7a70)", fontSize: 12, fontStyle: "italic", display: "block", marginTop: 4 }}>
          {note}
        </span>
      )}
    </span>
  </label>
);

export default RadioCard;
