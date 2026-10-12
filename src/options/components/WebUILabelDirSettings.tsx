import ChipList from "./ChipList";
import SettingsGroup from "./SettingsGroup";
import { FIELD_INPUT_STYLE, type WebUISectionProps } from "./webui-fields";
import { FIELD_LABEL_STYLE } from "../shared-styles";

interface ChoiceNoun {
  title: string;
  lower: string;
  plural: string;
}

const LABEL_NOUN: ChoiceNoun = { title: "Label", lower: "label", plural: "Labels" };
const DIRECTORY_NOUN: ChoiceNoun = { title: "Directory", lower: "directory", plural: "Directories" };

export default function WebUILabelDirSettings({ webUiSettings, webUi, onChange }: WebUISectionProps) {
  return (
    <SettingsGroup title={groupTitle({ webUi })}>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {webUi.isLabelSupported && <LabelColumn webUiSettings={webUiSettings} onChange={onChange} />}
        {webUi.isDirSupported && <DirectoryColumn webUiSettings={webUiSettings} onChange={onChange} />}
      </div>
    </SettingsGroup>
  );
}

function groupTitle({ webUi }: Pick<WebUISectionProps, "webUi">): string {
  if (webUi.isLabelSupported && webUi.isDirSupported) {
    return "Labels & Directories";
  }
  return webUi.isLabelSupported ? "Labels" : "Directories";
}

type EditableWebUIProps = Pick<WebUISectionProps, "webUiSettings" | "onChange">;

function LabelColumn({ webUiSettings, onChange }: EditableWebUIProps) {
  return (
    <ChoiceColumn
      noun={LABEL_NOUN}
      defaultChoice={webUiSettings.defaultLabel}
      choices={webUiSettings.labels}
      onDefaultChange={defaultLabel => onChange({ ...webUiSettings, defaultLabel })}
      onChoicesChange={labels => onChange({ ...webUiSettings, labels })}
    />
  );
}

function DirectoryColumn({ webUiSettings, onChange }: EditableWebUIProps) {
  return (
    <ChoiceColumn
      noun={DIRECTORY_NOUN}
      defaultChoice={webUiSettings.defaultDir}
      choices={webUiSettings.dirs}
      onDefaultChange={defaultDir => onChange({ ...webUiSettings, defaultDir })}
      onChoicesChange={dirs => onChange({ ...webUiSettings, dirs })}
    />
  );
}

interface ChoiceColumnProps {
  noun: ChoiceNoun;
  defaultChoice: string | null;
  choices: string[];
  onDefaultChange: (defaultChoice: string) => void;
  onChoicesChange: (choices: string[]) => void;
}

function ChoiceColumn({ noun, defaultChoice, choices, onDefaultChange, onChoicesChange }: ChoiceColumnProps) {
  return (
    <div style={{ flex: 1, minWidth: 240 }}>
      <DefaultChoiceField noun={noun} defaultChoice={defaultChoice} onDefaultChange={onDefaultChange} />
      <ChipList
        label={`${noun.plural} for per-torrent selection`}
        values={choices}
        onChange={onChoicesChange}
        placeholder={`Add ${noun.lower}`}
      />
    </div>
  );
}

type DefaultChoiceFieldProps = Pick<ChoiceColumnProps, "noun" | "defaultChoice" | "onDefaultChange">;

function DefaultChoiceField({ noun, defaultChoice, onDefaultChange }: DefaultChoiceFieldProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={FIELD_LABEL_STYLE}>Default {noun.title}</label>
      <input
        type="text"
        value={defaultChoice ?? ""}
        onChange={e => onDefaultChange(e.target.value)}
        style={{ ...FIELD_INPUT_STYLE, minWidth: 180 }}
        placeholder={`Default ${noun.lower}`}
      />
    </div>
  );
}
