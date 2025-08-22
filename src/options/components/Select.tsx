import React from "react";

interface SelectProps {
  label: string;
  value: string;
  changeable?: boolean;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

const Select: React.FC<SelectProps> = ({ label, value, changeable, options, onChange }) => (
  <div>
    <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>{label}</label>
    <select
      value={value}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      style={{ fontSize: 15, borderRadius: 8, padding: "6px 12px", border: "1px solid var(--rta-border, #b7c9a7)", background: "var(--rta-input-bg, #fff)", color: "var(--rta-text, #1b241d)", minWidth: 180 }}
      disabled={changeable === false}
    >
      <option value="" disabled>Select...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export default Select;
