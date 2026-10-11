import ChipList from "./ChipList";
import SettingsGroup from "./SettingsGroup";
import { FIELD_INPUT_STYLE, FIELD_LABEL_STYLE, type WebUISectionProps } from "./webui-fields";

interface ChoiceNoun {
  title: string;
  lower: string;
  plural: string;
}

interface ChoiceColumnProps {
  noun: ChoiceNoun;
  defaultChoice: string | null;
  choices: string[];
  onDefaultChange: (defaultChoice: string) => void;
  onChoicesChange: (choices: string[]) => void;
}

type EditableWebUIProps = Pick<WebUISectionProps, "webui" | "onChange">;

const LABEL_NOUN: ChoiceNoun = { title: "Label", lower: "label", plural: "Labels" };
const DIRECTORY_NOUN: ChoiceNoun = { title: "Directory", lower: "directory", plural: "Directories" };

function ChoiceColumn({ noun, defaultChoice, choices, onDefaultChange, onChoicesChange }: ChoiceColumnProps) {
  return (
    <div style={{ flex: 1, minWidth: 240 }}>
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
      <ChipList
        label={`${noun.plural} for per-torrent selection`}
        values={choices}
        onChange={onChoicesChange}
        placeholder={`Add ${noun.lower}`}
      />
    </div>
  );
}

function groupTitle({ webUiInstance }: Pick<WebUISectionProps, "webUiInstance">): string {
  if (webUiInstance.isLabelSupported && webUiInstance.isDirSupported) {
    return "Labels & Directories";
  }
  return webUiInstance.isLabelSupported ? "Labels" : "Directories";
}

function LabelColumn({ webui, onChange }: EditableWebUIProps) {
  return (
    <ChoiceColumn
      noun={LABEL_NOUN}
      defaultChoice={webui.defaultLabel}
      choices={webui.labels}
      onDefaultChange={defaultLabel => onChange({ ...webui, defaultLabel })}
      onChoicesChange={labels => onChange({ ...webui, labels })}
    />
  );
}

function DirectoryColumn({ webui, onChange }: EditableWebUIProps) {
  return (
    <ChoiceColumn
      noun={DIRECTORY_NOUN}
      defaultChoice={webui.defaultDir}
      choices={webui.dirs}
      onDefaultChange={defaultDir => onChange({ ...webui, defaultDir })}
      onChoicesChange={dirs => onChange({ ...webui, dirs })}
    />
  );
}

export default function WebUILabelDirSettings({ webui, webUiInstance, onChange }: WebUISectionProps) {
  return (
    <SettingsGroup title={groupTitle({ webUiInstance })}>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {webUiInstance.isLabelSupported && <LabelColumn webui={webui} onChange={onChange} />}
        {webUiInstance.isDirSupported && <DirectoryColumn webui={webui} onChange={onChange} />}
      </div>
    </SettingsGroup>
  );
}
