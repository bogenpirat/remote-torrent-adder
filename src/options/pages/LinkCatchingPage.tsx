import { useState, type CSSProperties, type JSX } from "react";
import Toggle from "../components/Toggle";
import { useSettings } from "../SettingsContext";
import { TEXT, GREEN_DARK, BORDER, INPUT_BG, SUCCESS, DANGER } from "../theme";

const HEADING_STYLE: CSSProperties = { fontWeight: 500, marginBottom: 8, display: "block" };

const CHIP_STYLE: CSSProperties = {
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
};

const CHIP_EDITOR_STYLE: CSSProperties = {
  fontFamily: "monospace",
  fontSize: 15,
  border: "none",
  outline: "none",
  background: INPUT_BG,
  color: TEXT,
  borderRadius: 8,
  padding: "2px 8px",
  marginRight: 4
};

const NEW_REGEX_INPUT_STYLE: CSSProperties = {
  fontFamily: "monospace",
  fontSize: 15,
  border: `1px solid ${BORDER}`,
  background: INPUT_BG,
  color: TEXT,
  borderRadius: 8,
  padding: "4px 10px"
};

const ADD_BUTTON_STYLE: CSSProperties = {
  background: "var(--rta-accent, #b7c9a7)",
  color: GREEN_DARK,
  border: "none",
  borderRadius: 8,
  padding: "4px 12px",
  fontWeight: 500,
  cursor: "pointer"
};

const SEPARATOR_STYLE: CSSProperties = {
  margin: "32px 0 24px 0",
  border: "none",
  borderTop: `1px solid ${BORDER}`,
};

const TESTER_INPUT_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: 400,
  fontSize: 15,
  padding: "6px 12px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: INPUT_BG,
  color: TEXT,
  marginBottom: 12,
};

const MATCH_RESULT_STYLE: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontWeight: 600 };

export default function LinkCatchingPage(): JSX.Element {
  const { settings, updateSetting, loading } = useSettings();

  if (loading || !settings) return <div>Loading...</div>;

  const saveRegexes = (regexes: RegExp[]): void => updateSetting("linkCatchingRegexes", regexes);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Toggle
          checked={settings.linkCatchingEnabled}
          onEnable={() => updateSetting("linkCatchingEnabled", true)}
          onDisable={() => updateSetting("linkCatchingEnabled", false)}
          label="Enable link catching"
        />
      </div>
      <RegexList regexes={settings.linkCatchingRegexes} onChange={saveRegexes} />
      <hr style={SEPARATOR_STYLE} />
      <RegexTester regexes={settings.linkCatchingRegexes} />
    </div>
  );
}

interface RegexListProps {
  regexes: RegExp[];
  onChange: (regexes: RegExp[]) => void;
}

function RegexList({ regexes, onChange }: RegexListProps): JSX.Element {
  const editing = useRegexEditing({ regexes, onChange });
  const removeAt = (idx: number): void => onChange(regexes.filter((_regex, position) => position !== idx));

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={HEADING_STYLE}>Link matching regexes:</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 40 }}>
        {regexes.map((regex, idx) => (
          <span key={idx} style={CHIP_STYLE}>
            {editing.editIdx === idx
              ? <ChipEditor idx={idx} editing={editing} />
              : <ChipView source={regex.source} onEdit={() => editing.start(idx)} onRemove={() => removeAt(idx)} />}
          </span>
        ))}
      </div>
      <NewRegexForm onAdd={regex => onChange([...regexes, regex])} />
    </div>
  );
}

interface RegexEditing {
  editIdx: number | null;
  editValue: string;
  setEditValue: (value: string) => void;
  start: (idx: number) => void;
  save: (idx: number) => void;
  cancel: () => void;
}

function useRegexEditing({ regexes, onChange }: RegexListProps): RegexEditing {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const start = (idx: number): void => {
    setEditIdx(idx);
    setEditValue(regexes[idx]?.source ?? "");
  };

  const save = (idx: number): void => {
    if (isValidRegex(editValue)) {
      const reg = new RegExp(editValue);
      onChange(regexes.map((existing, position) => (position === idx ? reg : existing)));
      setEditIdx(null);
      setEditValue("");
    }
  };

  return { editIdx, editValue, setEditValue, start, save, cancel: () => setEditIdx(null) };
}

function ChipEditor({ idx, editing }: { idx: number; editing: RegexEditing }): JSX.Element {
  return (
    <>
      <input
        type="text"
        value={editing.editValue}
        onChange={e => editing.setEditValue(e.target.value)}
        style={CHIP_EDITOR_STYLE}
      />
      <button onClick={() => editing.save(idx)} style={{ marginRight: 2, fontSize: 13 }}>✔</button>
      <button onClick={editing.cancel} style={{ fontSize: 13 }}>✖</button>
    </>
  );
}

interface ChipViewProps {
  source: string;
  onEdit: () => void;
  onRemove: () => void;
}

function ChipView({ source, onEdit, onRemove }: ChipViewProps): JSX.Element {
  return (
    <>
      <span>{source}</span>
      <button onClick={onEdit} style={{ marginLeft: 6, fontSize: 13 }}>✎</button>
      <button onClick={onRemove} style={{ marginLeft: 2, fontSize: 13 }}>🗑</button>
    </>
  );
}

function NewRegexForm({ onAdd }: { onAdd: (regex: RegExp) => void }): JSX.Element {
  const [newRegex, setNewRegex] = useState<string>("");

  const handleAdd = (): void => {
    if (isValidRegex(newRegex)) {
      onAdd(new RegExp(newRegex));
      setNewRegex("");
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
      <input
        type="text"
        value={newRegex}
        onChange={e => setNewRegex(e.target.value)}
        placeholder="Add new regex"
        style={NEW_REGEX_INPUT_STYLE}
      />
      <button onClick={handleAdd} style={ADD_BUTTON_STYLE}>Add</button>
    </div>
  );
}

function isValidRegex(source: string): boolean {
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}

function RegexTester({ regexes }: { regexes: RegExp[] }): JSX.Element {
  const [testerValue, setTesterValue] = useState<string>("");

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={HEADING_STYLE}>Test your regexes:</label>
      <input
        type="text"
        placeholder="Paste a link to test..."
        value={testerValue}
        onChange={e => setTesterValue(e.target.value)}
        style={TESTER_INPUT_STYLE}
      />
      <div>
        {testerValue && <MatchResults regexes={regexes} link={testerValue} />}
      </div>
    </div>
  );
}

function MatchResults({ regexes, link }: { regexes: RegExp[]; link: string }): JSX.Element {
  return (
    <ul style={{ paddingLeft: 20 }}>
      {regexes.map((reg: RegExp, idx: number) => (
        <MatchResult key={idx} pattern={reg.source} matched={testRegexSafely(reg, link)} />
      ))}
      <MatchResult pattern="magnet:" matched={link.startsWith('magnet:')} />
    </ul>
  );
}

function MatchResult({ pattern, matched }: { pattern: string; matched: boolean }): JSX.Element {
  const color = matched ? SUCCESS : DANGER;
  return (
    <li style={{ ...MATCH_RESULT_STYLE, color }}>
      <span style={{ fontFamily: "monospace" }}>{pattern}</span>
      <span style={{ color }}>{matched ? "✔" : "✖"}</span>
    </li>
  );
}

/** A stored pattern can be anything the user pasted, so a throw means "no match". */
function testRegexSafely(regex: RegExp, value: string): boolean {
  try {
    return regex.test(value);
  } catch {
    return false;
  }
}
