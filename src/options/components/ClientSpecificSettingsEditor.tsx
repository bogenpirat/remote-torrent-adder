import React from "react";
import { type ClientSpecificSettingDescriptor } from "../../models/webui";
import Toggle from "./Toggle";

interface ClientSpecificSettingsEditorProps {
  descriptors: ReadonlyArray<ClientSpecificSettingDescriptor>;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

const ClientSpecificSettingsEditor: React.FC<ClientSpecificSettingsEditorProps> = ({ descriptors, value, onChange }) => (
  <div style={{ marginBottom: 20, border: "1px solid var(--rta-border, #b7c9a7)", borderRadius: 10, padding: 16, background: "var(--rta-surface-alt, #f7faf7)" }}>
    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Client-specific settings</div>
    {descriptors.map(descriptor => (
      <div key={descriptor.key} style={{ marginBottom: 12 }}>
        <Toggle
          checked={(value[descriptor.key] as boolean | undefined) ?? descriptor.default}
          onChange={v => onChange({ ...value, [descriptor.key]: v })}
          label={descriptor.label}
        />
        {descriptor.description && (
          <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 13, marginTop: 4 }}>{descriptor.description}</div>
        )}
      </div>
    ))}
  </div>
);

export default ClientSpecificSettingsEditor;
