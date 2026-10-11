import { useState, type CSSProperties } from "react";
import type { AutoLabelDirSetting, AutoLabelDirCriterion } from "../../models/webui";
import AutoLabelDirTester from "./AutoLabelDirTester";
import SettingsGroup from "./SettingsGroup";
import { CRITERIA_FIELDS, fieldLabel, type CriterionField } from "./auto-label-dir-fields";

interface AutoLabelDirSettingsEditorProps {
  value: AutoLabelDirSetting[];
  onChange: (settings: AutoLabelDirSetting[]) => void;
  showLabel: boolean;
  showDir: boolean;
  labels: string[];
  dirs: string[];
  defaultLabel: string | null;
  defaultDir: string | null;
}

interface CriteriaEditorProps {
  criteria: AutoLabelDirCriterion[];
  onChange: (c: AutoLabelDirCriterion[]) => void;
}

interface CriterionFormProps {
  hasCriteria: boolean;
  onAdd: (criterion: AutoLabelDirCriterion) => void;
}

interface ChoiceSelectProps {
  title: string;
  choice: string | null;
  knownChoices: string[];
  onChange: (choice: string | null) => void;
}

type RuleChoices = Pick<AutoLabelDirSettingsEditorProps, "showLabel" | "showDir" | "labels" | "dirs">;

type TestedRules = Pick<AutoLabelDirSettingsEditorProps, "value" | "defaultLabel" | "defaultDir" | "showLabel" | "showDir">;

interface RuleCardProps {
  setting: AutoLabelDirSetting;
  choices: RuleChoices;
  onPatch: (patch: Partial<AutoLabelDirSetting>) => void;
  onRemove: () => void;
}

const FIELD_TITLE_STYLE: CSSProperties = { fontWeight: 500, marginBottom: 4, display: "block" };

const CHIP_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  background: "var(--rta-chip-bg, #eaf5ea)",
  border: "1px solid var(--rta-chip-border, #b7c9a7)",
  borderRadius: 16,
  padding: "4px 12px",
  fontFamily: "monospace",
  fontSize: 15,
};

const SELECT_STYLE: CSSProperties = {
  fontSize: 15,
  borderRadius: 8,
  padding: "4px 10px",
  border: "1px solid var(--rta-border, #b7c9a7)",
  background: "var(--rta-input-bg, #fff)",
  color: "var(--rta-text, #1b241d)",
};

const PATTERN_INPUT_STYLE: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontFamily: "monospace",
  fontSize: 15,
  border: "1px solid var(--rta-border, #b7c9a7)",
  background: "var(--rta-input-bg, #fff)",
  color: "var(--rta-text, #1b241d)",
  borderRadius: 8,
  padding: "4px 10px",
};

const ADD_CRITERION_BUTTON_STYLE: CSSProperties = {
  background: "var(--rta-accent, #b7c9a7)",
  color: "var(--rta-green-dark, #4e6a57)",
  border: "none",
  borderRadius: 8,
  padding: "4px 12px",
  fontWeight: 500,
  cursor: "pointer",
};

const ADD_RULE_BUTTON_STYLE: CSSProperties = {
  background: "var(--rta-success, #228B22)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 16px",
  fontWeight: 500,
  cursor: "pointer",
};

const RULE_CARD_STYLE: CSSProperties = {
  marginBottom: 18,
  padding: 12,
  border: "1px solid var(--rta-border, #b7c9a7)",
  borderRadius: 8,
  background: "var(--rta-surface, #fff)",
  position: "relative",
};

const REMOVE_RULE_BUTTON_STYLE: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  background: "var(--rta-danger, #B22222)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "4px 10px",
  fontWeight: 500,
  cursor: "pointer"
};

function CriteriaEditor({ criteria, onChange }: CriteriaEditorProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={FIELD_TITLE_STYLE}>Criteria</label>
      <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 13, marginBottom: 6 }}>
        All criteria of a rule must match (AND). For alternatives, create one rule per case — the first matching rule wins.
      </div>
      {criteria.length > 0 && <CriterionChips criteria={criteria} onChange={onChange} />}
      <CriterionForm hasCriteria={criteria.length > 0} onAdd={criterion => onChange([...criteria, criterion])} />
    </div>
  );
}

function CriterionChips({ criteria, onChange }: CriteriaEditorProps) {
  const removeAt = (idx: number) => onChange(criteria.filter((_criterion, position) => position !== idx));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 32 }}>
      {criteria.map((c, idx) => (
        <span key={idx} style={CHIP_STYLE}>
          <span style={{ marginRight: 8 }}>{fieldLabel(c.field)}:</span>
          <span style={{ marginRight: 8 }}>{c.value}</span>
          <button onClick={() => removeAt(idx)} style={{ fontSize: 13, marginLeft: 2 }}>🗑</button>
        </span>
      ))}
    </div>
  );
}

function CriterionForm({ hasCriteria, onAdd }: CriterionFormProps) {
  const [field, setField] = useState<CriterionField>("trackerUrl");
  const [value, setValue] = useState("");

  const handleAdd = () => {
    if (value.trim()) {
      onAdd({ field, value: value.trim() });
      setValue("");
    }
  };
  const placeholder = CRITERIA_FIELDS.find(f => f.value === field)?.placeholder;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: hasCriteria ? 8 : 0 }}>
      <select value={field} onChange={e => setField(e.target.value as CriterionField)} style={SELECT_STYLE}>
        {CRITERIA_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <input type="text" value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} style={PATTERN_INPUT_STYLE} />
      <button onClick={handleAdd} style={ADD_CRITERION_BUTTON_STYLE}>Add</button>
    </div>
  );
}

function selectableChoices(choice: string | null, knownChoices: string[]): string[] {
  const choices = knownChoices.includes(choice ?? "") || !choice ? knownChoices : [choice, ...knownChoices];
  return choices.filter((candidate, idx) => candidate && choices.indexOf(candidate) === idx);
}

function ChoiceSelect({ title, choice, knownChoices, onChange }: ChoiceSelectProps) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={FIELD_TITLE_STYLE}>{title}</label>
      <select
        value={choice ?? ""}
        onChange={e => onChange(e.target.value === "" ? null : e.target.value)}
        style={{ ...SELECT_STYLE, minWidth: 120 }}>
        <option value="">(none)</option>
        {selectableChoices(choice, knownChoices).map(candidate => <option key={candidate} value={candidate}>{candidate}</option>)}
      </select>
    </div>
  );
}

function RuleCard({ setting, choices, onPatch, onRemove }: RuleCardProps) {
  return (
    <div style={RULE_CARD_STYLE}>
      <button onClick={onRemove} style={REMOVE_RULE_BUTTON_STYLE} title="Remove rule">🗑</button>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <CriteriaEditor criteria={setting.criteria} onChange={criteria => onPatch({ criteria })} />
        </div>
        <div style={{ flex: 1 }}>
          {choices.showLabel && (
            <ChoiceSelect title="Label" choice={setting.label} knownChoices={choices.labels} onChange={label => onPatch({ label })} />
          )}
          {choices.showDir && (
            <ChoiceSelect title="Directory" choice={setting.dir} knownChoices={choices.dirs} onChange={dir => onPatch({ dir })} />
          )}
        </div>
      </div>
    </div>
  );
}

function RuleTester({ value, defaultLabel, defaultDir, showLabel, showDir }: TestedRules) {
  return (
    <AutoLabelDirTester settings={value} defaultLabel={defaultLabel} defaultDir={defaultDir} showLabel={showLabel} showDir={showDir} />
  );
}

function AutoLabelDirSettingsEditor(props: AutoLabelDirSettingsEditorProps) {
  const { value, onChange, showLabel, showDir } = props;
  const handleAdd = () => {
    onChange([...value, { criteria: [], label: showLabel ? "" : null, dir: showDir ? "" : null }]);
  };
  const removeAt = (idx: number) => onChange(value.filter((_setting, position) => position !== idx));
  const patchAt = (idx: number, patch: Partial<AutoLabelDirSetting>) => {
    onChange(value.map((setting, position) => (position === idx ? { ...setting, ...patch } : setting)));
  };
  return (
    <SettingsGroup title="Auto Label/Dir Settings" actions={<button onClick={handleAdd} style={ADD_RULE_BUTTON_STYLE}>Add Rule</button>}>
      {value.length === 0 && <div style={{ color: "var(--rta-text-muted, #888)", marginBottom: 8 }}>No rules defined yet.</div>}
      {value.map((setting, idx) => (
        <RuleCard key={idx} setting={setting} choices={props} onPatch={patch => patchAt(idx, patch)} onRemove={() => removeAt(idx)} />
      ))}
      {value.length > 0 && <RuleTester {...props} />}
    </SettingsGroup>
  );
}

export default AutoLabelDirSettingsEditor;
