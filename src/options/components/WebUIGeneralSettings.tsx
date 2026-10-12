import { type CSSProperties } from "react";
import type { WebUISettings } from "../../models/webui";
import { parsePortInput, MAX_PORT, MIN_PORT } from "../../util/utils";
import SettingsGroup from "./SettingsGroup";
import Toggle from "./Toggle";
import WebUIConnectionTest from "./WebUIConnectionTest";
import { FIELD_INPUT_STYLE, FIELD_LABEL_STYLE, TextField, type WebUISectionProps } from "./webui-fields";
import { MUTED } from "../theme";

const FIELD_ROW_STYLE: CSSProperties = { display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" };

export default function WebUIGeneralSettings({ webui, webUiInstance, onChange }: WebUISectionProps) {
  const patch = (changes: Partial<WebUISettings>) => onChange({ ...webui, ...changes });
  return (
    <SettingsGroup title="General">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <EndpointFields webui={webui} onPatch={patch} />
        <div style={{ color: MUTED }}>Base URL for API calls: {webUiInstance.createBaseUrl()}</div>
        <div style={FIELD_ROW_STYLE}>
          <TextField label="Username" value={webui.username} onChange={username => patch({ username })} />
          <TextField label="Password" value={webui.password} onChange={password => patch({ password })} type="password" />
        </div>
        {webUiInstance.isConnectionTestSupported && <WebUIConnectionTest webui={webui} />}
        {(webUiInstance.isAddPausedSupported || webUiInstance.isLabelDirChooserSupported) && (
          <BehaviourToggles webui={webui} webUiInstance={webUiInstance} onPatch={patch} />
        )}
      </div>
    </SettingsGroup>
  );
}

interface PatchableProps {
  webui: WebUISettings;
  onPatch: (changes: Partial<WebUISettings>) => void;
}

function EndpointFields({ webui, onPatch }: PatchableProps) {
  return (
    <div style={FIELD_ROW_STYLE}>
      <TextField label="Host" value={webui.host} onChange={host => onPatch({ host })} />
      <PortField webui={webui} onPatch={onPatch} />
      <Toggle checked={webui.secure} onChange={secure => onPatch({ secure })} label="Secure (HTTPS)" />
      <TextField label="Relative Path" value={webui.relativePath || ""} onChange={relativePath => onPatch({ relativePath })} />
    </div>
  );
}

function PortField({ webui, onPatch }: PatchableProps) {
  const patchPort = (raw: string): void => {
    onPatch({ port: parsePortInput(raw) ?? null });
  };
  return (
    <div>
      <label htmlFor="rta-webui-port" style={FIELD_LABEL_STYLE}>Port</label>
      <input
        id="rta-webui-port"
        type="number"
        inputMode="numeric"
        min={MIN_PORT}
        max={MAX_PORT}
        placeholder={webui.secure ? "443" : "80"}
        value={webui.port ?? ""}
        onChange={e => patchPort(e.target.value)}
        style={{ ...FIELD_INPUT_STYLE, minWidth: 80 }}
      />
    </div>
  );
}

type BehaviourTogglesProps = PatchableProps & Pick<WebUISectionProps, "webUiInstance">;

function BehaviourToggles({ webui, webUiInstance, onPatch }: BehaviourTogglesProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
      {webUiInstance.isAddPausedSupported && (
        <Toggle checked={webui.addPaused} onChange={addPaused => onPatch({ addPaused })} label="Add torrents paused" />
      )}
      {webUiInstance.isLabelDirChooserSupported && <ChooserToggles webui={webui} onPatch={onPatch} />}
    </div>
  );
}

function ChooserToggles({ webui, onPatch }: PatchableProps) {
  return (
    <>
      <Toggle
        checked={webui.showPerTorrentConfigSelector}
        onChange={showPerTorrentConfigSelector => onPatch({ showPerTorrentConfigSelector })}
        label="Show per-torrent config selector"
      />
      <Toggle
        checked={webui.useAlternativeLabelDirChooser ?? false}
        onChange={useAlternativeLabelDirChooser => onPatch({ useAlternativeLabelDirChooser })}
        label="Use alternative container (window instead of popup)"
      />
    </>
  );
}
