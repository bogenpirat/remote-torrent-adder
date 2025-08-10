import React from "react";

interface SelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

const Select: React.FC<SelectProps> = ({ label, value, options, onChange }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontWeight: 500, marginBottom: 8, display: "block" }}>{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ fontSize: 15, borderRadius: 8, padding: "6px 12px", border: "1px solid #b7c9a7", minWidth: 180 }}
    >
      <option value="" disabled>Select...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export default Select;
