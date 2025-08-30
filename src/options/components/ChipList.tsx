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
    const handlePromote = (idx: number) => {
      if (idx === 0) return;
      const arr = [...values];
      const [promoted] = arr.splice(idx, 1);
      arr.unshift(promoted);
      onChange(arr);
    };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontWeight: 500, marginBottom: 8, display: "block" }}>{label}</label>
      {values.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 40 }}>
          {values.map((v, idx) => (
            <span key={idx} style={{ display: "inline-flex", alignItems: "center", background: "var(--rta-chip-bg, #eaf5ea)", border: "1px solid var(--rta-chip-border, #b7c9a7)", borderRadius: 16, padding: "4px 12px", fontFamily: "monospace", fontSize: 15 }}>
              <input
                type="text"
                value={v}
                onChange={e => handleEdit(idx, e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 15, border: "none", outline: "none", background: "var(--rta-input-bg, #fff)", color: "var(--rta-text, #1b241d)", borderRadius: 8, padding: "2px 8px", marginRight: 4 }}
              />
              <button onClick={() => handleRemove(idx)} style={{ fontSize: 13, marginLeft: 2 }}>🗑</button>
                {idx !== 0 && (
                  <button
                    title="Als Standard setzen"
                    onClick={() => handlePromote(idx)}
                    style={{
                      fontSize: 13,
                      marginLeft: 4,
                      background: "var(--rta-info, #4682B4)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "2px 8px",
                      cursor: "pointer"
                    }}
                  >★</button>
                )}
                {idx === 0 && (
                  <span style={{ marginLeft: 6, fontSize: 12, color: "var(--rta-success, #228B22)", fontWeight: 500 }}>(Standard)</span>
                )}
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
          style={{ fontFamily: "monospace", fontSize: 15, border: "1px solid var(--rta-border, #b7c9a7)", background: "var(--rta-input-bg, #fff)", color: "var(--rta-text, #1b241d)", borderRadius: 8, padding: "4px 10px" }}
        />
        <button onClick={handleAdd} style={{ background: "var(--rta-accent, #b7c9a7)", color: "var(--rta-green-dark, #4e6a57)", border: "none", borderRadius: 8, padding: "4px 12px", fontWeight: 500, cursor: "pointer" }}>Add</button>
      </div>
    </div>
  );
};

export default ChipList;
