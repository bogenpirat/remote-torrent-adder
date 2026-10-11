import { useState, type CSSProperties } from "react";
import { Client, ClientDisplayName, WebUIFactory } from "../../models/clients";
import type { WebUISettings } from "../../models/webui";
import AutoLabelDirSettingsEditor from "./AutoLabelDirSettingsEditor";
import ClientSpecificSettingsEditor from "./ClientSpecificSettingsEditor";
import Select from "./Select";
import WebUIGeneralSettings from "./WebUIGeneralSettings";
import WebUILabelDirSettings from "./WebUILabelDirSettings";
import { isClientSelected, type WebUISectionProps } from "./webui-fields";
import { MUTED, DANGER } from "../theme";

interface WebUIDetailProps {
  webui: WebUISettings;
  onChange: (w: WebUISettings) => void;
  onRemove: () => void;
  onPromote: () => void;
  isPrimary: boolean;
}

type DetailHeaderProps = Omit<WebUIDetailProps, "onChange">;

const clientOptions = Object.values(Client).map(c => ({ value: c, label: ClientDisplayName[c] }));

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

function DetailHeader({ webui, isPrimary, onPromote, onRemove }: DetailHeaderProps) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
      <span style={{ fontWeight: 700, fontSize: 22, flex: 1 }}>{webui.name || "Unnamed WebUI"}</span>
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

function AutoLabelDirRules({ webui, webUiInstance, onChange }: WebUISectionProps) {
  return (
    <AutoLabelDirSettingsEditor
      value={webui.autoLabelDirSettings ?? []}
      onChange={autoLabelDirSettings => onChange({ ...webui, autoLabelDirSettings })}
      showLabel={!!webUiInstance.isLabelSupported}
      showDir={!!webUiInstance.isDirSupported}
      labels={webui.labels}
      dirs={webui.dirs}
      defaultLabel={webui.defaultLabel}
      defaultDir={webui.defaultDir}
    />
  );
}

function ConfiguredClient(props: WebUISectionProps) {
  const { webui, webUiInstance, onChange } = props;
  const descriptors = webUiInstance.clientSpecificSettingDescriptors;
  return (
    <>
      <WebUIGeneralSettings {...props} />
      {descriptors.length > 0 && (
        <ClientSpecificSettingsEditor
          descriptors={descriptors}
          value={webui.clientSpecificSettings ?? {}}
          onChange={clientSpecificSettings => onChange({ ...webui, clientSpecificSettings })}
        />
      )}
      {(webUiInstance.isLabelSupported || webUiInstance.isDirSupported) && <WebUILabelDirSettings {...props} />}
      {webUiInstance.isLabelDirChooserSupported && <AutoLabelDirRules {...props} />}
    </>
  );
}

function ClientSelect({ webui, onChange }: Pick<WebUIDetailProps, "webui" | "onChange">) {
  const clientChosen = isClientSelected(webui.client);
  const chooseClient = (value: string) => onChange({ ...webui, client: value as Client });
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Client type: choosable while still a draft, locked once chosen. */}
      <Select
        label="Client"
        value={webui.client}
        changeable={!clientChosen}
        options={clientOptions}
        onChange={clientChosen ? undefined : chooseClient}
      />
    </div>
  );
}

export default function WebUIDetail({ webui, onChange, onRemove, onPromote, isPrimary }: WebUIDetailProps) {
  const webUiInstance = isClientSelected(webui.client) ? WebUIFactory.createWebUI(webui) : null;

  return (
    <div>
      <DetailHeader webui={webui} isPrimary={isPrimary} onPromote={onPromote} onRemove={onRemove} />

      <ClientSelect webui={webui} onChange={onChange} />

      {webUiInstance
        ? <ConfiguredClient webui={webui} webUiInstance={webUiInstance} onChange={onChange} />
        : <div style={{ color: MUTED, fontSize: 15 }}>Select a client type above to configure this WebUI.</div>}
    </div>
  );
}
