import React, { useState } from "react";

interface ChipListProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const ChipList: React.FC<ChipListProps> = ({ label, values, onChange, placeholder }) => {
  const [input, setInput] = useState("");
  const handleAdd = () => {
    if (input.trim() && !values.includes(input.trim())) {
      onChange([...values, input.trim()]);
      setInput("");
    }
  };
  const handleRemove = (idx: number) => {
    const arr = [...values];
    arr.splice(idx, 1);
    onChange(arr);
  };
  const handleEdit = (idx: number, newValue: string) => {
    const arr = [...values];
    arr[idx] = newValue;
    onChange(arr);
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontWeight: 500, marginBottom: 8, display: "block" }}>{label}</label>
      {values.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 40 }}>
          {values.map((v, idx) => (
            <span key={idx} style={{ display: "inline-flex", alignItems: "center", background: "#eaf5ea", border: "1px solid #b7c9a7", borderRadius: 16, padding: "4px 12px", fontFamily: "monospace", fontSize: 15 }}>
              <input
                type="text"
                value={v}
                onChange={e => handleEdit(idx, e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 15, border: "none", outline: "none", background: "#fff", borderRadius: 8, padding: "2px 8px", marginRight: 4 }}
              />
              <button onClick={() => handleRemove(idx)} style={{ fontSize: 13, marginLeft: 2 }}>🗑</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: values.length > 0 ? 8 : 0 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder || "Add new entry"}
          style={{ fontFamily: "monospace", fontSize: 15, border: "1px solid #b7c9a7", borderRadius: 8, padding: "4px 10px" }}
        />
        <button onClick={handleAdd} style={{ background: "#b7c9a7", color: "#4e6a57", border: "none", borderRadius: 8, padding: "4px 12px", fontWeight: 500, cursor: "pointer" }}>Add</button>
      </div>
    </div>
  );
};

export default ChipList;
