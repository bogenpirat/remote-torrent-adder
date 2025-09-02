import { useState, ChangeEvent } from "react";
import Toggle from "../components/Toggle";
import { useSettings } from "../SettingsContext";

function regexToString(r: RegExp): string {
  return r.source;
}

function stringToRegex(s: string): RegExp | null {
  try {
    return new RegExp(s);
  } catch {
    return null;
  }
}

export default function LinkCatchingPage(): JSX.Element {
  const { settings, updateSetting, loading } = useSettings();
  const [newRegex, setNewRegex] = useState<string>("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [testerValue, setTesterValue] = useState<string>("");

  if (loading || !settings) return <div>Loading...</div>;

  const regexStrings: string[] = settings.linkCatchingRegexes.map(regexToString);

  const handleAdd = (): void => {
    const reg = stringToRegex(newRegex);
    if (reg) {
      updateSetting("linkCatchingRegexes", [...settings.linkCatchingRegexes, reg]);
      setNewRegex("");
    }
  };

  const handleRemove = (idx: number): void => {
    const arr = [...settings.linkCatchingRegexes];
    arr.splice(idx, 1);
    updateSetting("linkCatchingRegexes", arr);
  };

  const handleEdit = (idx: number): void => {
    setEditIdx(idx);
    setEditValue(regexStrings[idx]);
  };

  const handleEditSave = (idx: number): void => {
    const reg = stringToRegex(editValue);
    if (reg) {
      const arr = [...settings.linkCatchingRegexes];
      arr[idx] = reg;
      updateSetting("linkCatchingRegexes", arr);
      setEditIdx(null);
      setEditValue("");
    }
  };

  const handleTesterChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setTesterValue(e.target.value);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Toggle
          checked={settings.linkCatchingEnabled}
          onChange={v => updateSetting("linkCatchingEnabled", v)}
          label="Enable link catching"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500, marginBottom: 8, display: "block" }}>Link matching regexes:</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 40 }}>
          {regexStrings.map((r, idx) => (
            <span
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--rta-chip-bg, #eaf5ea)",
                border: "1px solid var(--rta-chip-border, #b7c9a7)",
                borderRadius: 16,
                padding: "4px 12px",
                fontFamily: "monospace",
                fontSize: 15,
                boxShadow: "0 1px 4px rgba(110,139,116,0.08)",
                transition: "box-shadow 0.2s"
              }}
            >
              {editIdx === idx ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    style={{
                      fontFamily: "monospace",
                      fontSize: 15,
                      border: "none",
                      outline: "none",
                      background: "var(--rta-input-bg, #fff)",
                      color: "var(--rta-text, #1b241d)",
                      borderRadius: 8,
                      padding: "2px 8px",
                      marginRight: 4
                    }}
                  />
                  <button onClick={() => handleEditSave(idx)} style={{ marginRight: 2, fontSize: 13 }}>✔</button>
                  <button onClick={() => setEditIdx(null)} style={{ fontSize: 13 }}>✖</button>
                </>
              ) : (
                <>
                  <span>{r}</span>
                  <button onClick={() => handleEdit(idx)} style={{ marginLeft: 6, fontSize: 13 }}>✎</button>
                  <button onClick={() => handleRemove(idx)} style={{ marginLeft: 2, fontSize: 13 }}>🗑</button>
                </>
              )}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <input
            type="text"
            value={newRegex}
            onChange={e => setNewRegex(e.target.value)}
            placeholder="Add new regex"
            style={{
              fontFamily: "monospace",
              fontSize: 15,
              border: "1px solid var(--rta-border, #b7c9a7)",
              background: "var(--rta-input-bg, #fff)",
              color: "var(--rta-text, #1b241d)",
              borderRadius: 8,
              padding: "4px 10px"
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              background: "var(--rta-accent, #b7c9a7)",
              color: "var(--rta-green-dark, #4e6a57)",
              border: "none",
              borderRadius: 8,
              padding: "4px 12px",
              fontWeight: 500,
              cursor: "pointer"
            }}
          >Add</button>
        </div>
      </div>
      <hr style={{ margin: "32px 0 24px 0", border: "none", borderTop: "1px solid var(--rta-border, #b7c9a7)" }} />
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500, marginBottom: 8, display: "block" }}>Test your regexes:</label>
        <input
          type="text"
          placeholder="Paste a link to test..."
          value={testerValue}
          onChange={handleTesterChange}
          style={{ width: "100%", maxWidth: 400, fontSize: 15, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--rta-border, #b7c9a7)", background: "var(--rta-input-bg, #fff)", color: "var(--rta-text, #1b241d)", marginBottom: 12 }}
        />
        <div>
          {testerValue && (
            <ul style={{ paddingLeft: 20 }}>
              {settings.linkCatchingRegexes.map((reg: RegExp, idx: number) => {
                let match = false;
                try {
                  match = reg.test(testerValue);
                } catch { }
                return (
                  <li key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: match ? "var(--rta-success, #228B22)" : "var(--rta-danger, #B22222)" }}>
                    <span style={{ fontFamily: "monospace" }}>{reg.source}</span>
                    {match ? <span style={{ color: "var(--rta-success, #228B22)" }}>✔</span> : <span style={{ color: "var(--rta-danger, #B22222)" }}>✖</span>}
                  </li>
                );
              })}
              {/* Magnet link detection */}
              {(() => {
                const magnetMatch = testerValue.startsWith && testerValue.startsWith('magnet:');
                return (
                  <li style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: magnetMatch ? "var(--rta-success, #228B22)" : "var(--rta-danger, #B22222)" }}>
                    <span style={{ fontFamily: "monospace" }}>magnet:</span>
                    {magnetMatch ? <span style={{ color: "var(--rta-success, #228B22)" }}>✔</span> : <span style={{ color: "var(--rta-danger, #B22222)" }}>✖</span>}
                  </li>
                );
              })()}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
