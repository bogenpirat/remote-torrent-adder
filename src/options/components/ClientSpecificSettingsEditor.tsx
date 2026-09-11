import React from "react";
import { type ClientSpecificSettingDescriptor } from "../../models/webui";
import SettingsGroup from "./SettingsGroup";
import Toggle from "./Toggle";

interface ClientSpecificSettingsEditorProps {
  descriptors: ReadonlyArray<ClientSpecificSettingDescriptor>;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

const ClientSpecificSettingsEditor: React.FC<ClientSpecificSettingsEditorProps> = ({ descriptors, value, onChange }) => (
  <SettingsGroup title="Client-specific settings">
    {descriptors.map(descriptor => (
      <div key={descriptor.key} style={{ marginBottom: 12 }}>
        <span style={{ display: "inline-flex" }} title={descriptor.description}>
          <Toggle
            checked={(value[descriptor.key] as boolean | undefined) ?? descriptor.default}
            onChange={v => onChange({ ...value, [descriptor.key]: v })}
            label={descriptor.label}
          />
        </span>
      </div>
    ))}
  </SettingsGroup>
);

export default ClientSpecificSettingsEditor;
