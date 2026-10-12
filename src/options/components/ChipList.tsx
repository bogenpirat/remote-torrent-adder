import React, { useState } from "react";
import { ACCENT_BUTTON_STYLE, CHIP_STYLE, LIST_HEADING_STYLE } from "../shared-styles";
import { TEXT, BORDER, INPUT_BG } from "../theme";

interface ChipListProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const CHIP_INPUT_STYLE: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 15,
  border: "none",
  outline: "none",
  background: INPUT_BG,
  color: TEXT,
  borderRadius: 8,
  padding: "2px 8px",
  marginRight: 4,
};

const NEW_ENTRY_INPUT_STYLE: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 15,
  border: `1px solid ${BORDER}`,
  background: INPUT_BG,
  color: TEXT,
  borderRadius: 8,
  padding: "4px 10px",
};

interface ChipProps {
  value: string;
  onEdit: (newValue: string) => void;
  onRemove: () => void;
}

interface NewEntryProps {
  values: string[];
  placeholder?: string;
  onAdd: (value: string) => void;
}

const ChipList: React.FC<ChipListProps> = ({ label, values, onChange, placeholder }) => {
  const removeAt = (index: number) => onChange(values.filter((_value, position) => position !== index));
  const replaceAt = (index: number, newValue: string) => {
    onChange(values.map((value, position) => (position === index ? newValue : value)));
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={LIST_HEADING_STYLE}>{label}</label>
      {values.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 40 }}>
          {values.map((value, index) => (
            <Chip key={index} value={value} onEdit={newValue => replaceAt(index, newValue)} onRemove={() => removeAt(index)} />
          ))}
        </div>
      )}
      <NewEntry values={values} placeholder={placeholder} onAdd={value => onChange([...values, value])} />
    </div>
  );
};

function Chip({ value, onEdit, onRemove }: ChipProps) {
  return (
    <span style={CHIP_STYLE}>
      <input type="text" value={value} onChange={e => onEdit(e.target.value)} style={CHIP_INPUT_STYLE} />
      <button onClick={onRemove} style={{ fontSize: 13, marginLeft: 2 }}>🗑</button>
    </span>
  );
}

function NewEntry({ values, placeholder, onAdd }: NewEntryProps) {
  const [input, setInput] = useState("");
  const handleAdd = () => {
    if (input.trim() && !values.includes(input.trim())) {
      onAdd(input.trim());
      setInput("");
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: values.length > 0 ? 8 : 0 }}>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={placeholder || "Add new entry"}
        style={NEW_ENTRY_INPUT_STYLE}
      />
      <button onClick={handleAdd} style={ACCENT_BUTTON_STYLE}>Add</button>
    </div>
  );
}

export default ChipList;
