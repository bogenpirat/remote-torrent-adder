import { useState, type CSSProperties } from "react";
import { Client, ClientDisplayName, WebUIFactory } from "../../models/clients";
import type { WebUISettings } from "../../models/webui";
import AutoLabelDirSettingsEditor from "./AutoLabelDirSettingsEditor";
import ClientSpecificSettingsEditor from "./ClientSpecificSettingsEditor";
import Select from "./Select";
import WebUIGeneralSettings from "./WebUIGeneralSettings";
import WebUILabelDirSettings from "./WebUILabelDirSettings";
import { UNNAMED_WEBUI_NAME, type WebUISectionProps } from "./webui-fields";
import { MUTED, DANGER } from "../theme";

const CLIENT_OPTIONS = Object.values(Client).map(c => ({ value: c, label: ClientDisplayName[c] }));

const HEADER_BUTTON_STYLE: CSSProperties = {
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const CANCEL_BUTTON_STYLE: CSSProperties = {
  background: "var(--rta-neutral, #eee)",
  color: DANGER,
  border: "none",
  borderRadius: 8,
  padding: "6px 12px",
  fontWeight: 500,
  cursor: "pointer",
};

interface WebUIDetailProps {
  webUiSettings: WebUISettings;
  onChange: (w: WebUISettings) => void;
  onRemove: () => void;
  onPromote: () => void;
  isPrimary: boolean;
}

export default function WebUIDetail({ webUiSettings, onChange, onRemove, onPromote, isPrimary }: WebUIDetailProps) {
  return (
    <div>
      <DetailHeader webUiSettings={webUiSettings} isPrimary={isPrimary} onPromote={onPromote} onRemove={onRemove} />

      <ClientSelect webUiSettings={webUiSettings} onChange={onChange} />

      {WebUIFactory.supports(webUiSettings.client)
        ? <ConfiguredClient webUiSettings={webUiSettings} webUi={WebUIFactory.createWebUI(webUiSettings)} onChange={onChange} />
        : <div style={{ color: MUTED, fontSize: 15 }}>Select a client type above to configure this WebUI.</div>}
    </div>
  );
}

type DetailHeaderProps = Omit<WebUIDetailProps, "onChange">;

function DetailHeader({ webUiSettings, isPrimary, onPromote, onRemove }: DetailHeaderProps) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
      <span style={{ fontWeight: 700, fontSize: 22, flex: 1 }}>{webUiSettings.name || UNNAMED_WEBUI_NAME}</span>
      {!isPrimary && (
        <button
          onClick={onPromote}
          style={{ background: "var(--rta-info, #4682B4)", ...HEADER_BUTTON_STYLE, transition: "all 0.15s" }}
        >Promote to Primary</button>
      )}
      <RemoveControls onRemove={onRemove} />
    </div>
  );
}

function RemoveControls({ onRemove }: Pick<WebUIDetailProps, "onRemove">) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const handleRemove = () => {
    if (confirmRemove) onRemove();
    else setConfirmRemove(true);
  };
  return (
    <>
      <button
        onClick={handleRemove}
        style={{
          background: confirmRemove ? "var(--rta-danger-dark, #8B0000)" : DANGER,
          ...HEADER_BUTTON_STYLE,
          boxShadow: confirmRemove ? "0 0 8px 2px var(--rta-danger-dark, #8B0000)" : undefined,
          transition: "all 0.15s",
        }}
      >
        {confirmRemove ? "For real?" : "Remove"}
      </button>
      {confirmRemove && <button onClick={() => setConfirmRemove(false)} style={CANCEL_BUTTON_STYLE}>Cancel</button>}
    </>
  );
}

function ClientSelect({ webUiSettings, onChange }: Pick<WebUIDetailProps, "webUiSettings" | "onChange">) {
  const clientChosen = WebUIFactory.supports(webUiSettings.client);
  const chooseClient = (value: string) => onChange({ ...webUiSettings, client: value as Client });
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Client type: choosable while still a draft, locked once chosen. */}
      <Select
        label="Client"
        value={webUiSettings.client}
        changeable={!clientChosen}
        options={CLIENT_OPTIONS}
        onChange={clientChosen ? undefined : chooseClient}
      />
    </div>
  );
}

function ConfiguredClient(props: WebUISectionProps) {
  const { webUiSettings, webUi, onChange } = props;
  const descriptors = webUi.clientSpecificSettingDescriptors;
  return (
    <>
      <WebUIGeneralSettings {...props} />
      {descriptors.length > 0 && (
        <ClientSpecificSettingsEditor
          descriptors={descriptors}
          value={webUiSettings.clientSpecificSettings ?? {}}
          onChange={clientSpecificSettings => onChange({ ...webUiSettings, clientSpecificSettings })}
        />
      )}
      {(webUi.isLabelSupported || webUi.isDirSupported) && <WebUILabelDirSettings {...props} />}
      {webUi.isLabelDirChooserSupported && <AutoLabelDirRules {...props} />}
    </>
  );
}

function AutoLabelDirRules({ webUiSettings, webUi, onChange }: WebUISectionProps) {
  return (
    <AutoLabelDirSettingsEditor
      value={webUiSettings.autoLabelDirSettings ?? []}
      onChange={autoLabelDirSettings => onChange({ ...webUiSettings, autoLabelDirSettings })}
      showLabel={!!webUi.isLabelSupported}
      showDir={!!webUi.isDirSupported}
      labels={webUiSettings.labels}
      dirs={webUiSettings.dirs}
      defaultLabel={webUiSettings.defaultLabel}
      defaultDir={webUiSettings.defaultDir}
    />
  );
}
