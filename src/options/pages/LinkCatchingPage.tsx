import { useState, type CSSProperties, type JSX } from "react";
import Toggle from "../components/Toggle";
import { useSettings } from "../SettingsContext";
import { ACCENT_BUTTON_STYLE, CHIP_INPUT_STYLE, CHIP_STYLE, LIST_HEADING_STYLE, MONOSPACE_INPUT_STYLE } from "../shared-styles";
import { TEXT, BORDER, INPUT_BG, SUCCESS, DANGER } from "../theme";

const REGEX_CHIP_STYLE: CSSProperties = {
  ...CHIP_STYLE,
  boxShadow: "0 1px 4px rgba(110,139,116,0.08)",
  transition: "box-shadow 0.2s"
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
          onChange={enabled => updateSetting("linkCatchingEnabled", enabled)}
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
  const removeAt = (index: number): void => onChange(regexes.filter((_regex, position) => position !== index));

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={LIST_HEADING_STYLE}>Link matching regexes:</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 40 }}>
        {regexes.map((regex, index) => (
          <span key={index} style={REGEX_CHIP_STYLE}>
            {editing.editedIndex === index
              ? <ChipEditor index={index} editing={editing} />
              : <ChipView source={regex.source} onEdit={() => editing.start(index)} onRemove={() => removeAt(index)} />}
          </span>
        ))}
      </div>
      <NewRegexForm onAdd={regex => onChange([...regexes, regex])} />
    </div>
  );
}

interface RegexEditing {
  editedIndex: number | null;
  editValue: string;
  setEditValue: (value: string) => void;
  start: (index: number) => void;
  save: (index: number) => void;
  cancel: () => void;
}

function useRegexEditing({ regexes, onChange }: RegexListProps): RegexEditing {
  const [editedIndex, setEditedIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const start = (index: number): void => {
    setEditedIndex(index);
    setEditValue(regexes[index]?.source ?? "");
  };

  const save = (index: number): void => {
    const editedRegex = toRegex(editValue);
    if (editedRegex) {
      onChange(regexes.map((existing, position) => (position === index ? editedRegex : existing)));
      setEditedIndex(null);
      setEditValue("");
    }
  };

  return { editedIndex, editValue, setEditValue, start, save, cancel: () => setEditedIndex(null) };
}

function ChipEditor({ index, editing }: { index: number; editing: RegexEditing }): JSX.Element {
  return (
    <>
      <input
        type="text"
        value={editing.editValue}
        onChange={e => editing.setEditValue(e.target.value)}
        style={CHIP_INPUT_STYLE}
      />
      <button onClick={() => editing.save(index)} style={{ marginRight: 2, fontSize: 13 }}>✔</button>
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
    const addedRegex = toRegex(newRegex);
    if (addedRegex) {
      onAdd(addedRegex);
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
        style={MONOSPACE_INPUT_STYLE}
      />
      <button onClick={handleAdd} style={ACCENT_BUTTON_STYLE}>Add</button>
    </div>
  );
}

function toRegex(source: string): RegExp | undefined {
  try {
    return new RegExp(source);
  } catch {
    return undefined;
  }
}

function RegexTester({ regexes }: { regexes: RegExp[] }): JSX.Element {
  const [testerValue, setTesterValue] = useState<string>("");

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={LIST_HEADING_STYLE}>Test your regexes:</label>
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
      {regexes.map((regex: RegExp, index: number) => (
        <MatchResult key={index} pattern={regex.source} matched={testRegexSafely(regex, link)} />
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
