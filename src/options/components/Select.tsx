import React from "react";
import { FIELD_LABEL_STYLE } from "../shared-styles";
import { TEXT, BORDER, INPUT_BG } from "../theme";

interface SelectProps {
  label: string;
  value: string;
  changeable?: boolean;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

const SELECT_STYLE: React.CSSProperties = {
  fontSize: 15,
  borderRadius: 8,
  padding: "6px 12px",
  border: `1px solid ${BORDER}`,
  background: INPUT_BG,
  color: TEXT,
  minWidth: 180,
};

const Select: React.FC<SelectProps> = ({ label, value, changeable, options, onChange }) => (
  <div>
    <label style={FIELD_LABEL_STYLE}>{label}</label>
    <select
      value={value}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      style={SELECT_STYLE}
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
