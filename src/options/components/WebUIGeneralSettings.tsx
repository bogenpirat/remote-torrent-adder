import { type CSSProperties } from "react";
import type { WebUISettings } from "../../models/webui";
import { parsePortInput, MAX_PORT, MIN_PORT } from "../../util/utils";
import SettingsGroup from "./SettingsGroup";
import Toggle from "./Toggle";
import WebUIConnectionTest from "./WebUIConnectionTest";
import { FIELD_INPUT_STYLE, TextField, type WebUISectionProps } from "./webui-fields";
import { FIELD_LABEL_STYLE } from "../shared-styles";
import { MUTED } from "../theme";

const FIELD_ROW_STYLE: CSSProperties = { display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" };

export default function WebUIGeneralSettings({ webUiSettings, webUi, onChange }: WebUISectionProps) {
  const patch = (changes: Partial<WebUISettings>) => onChange({ ...webUiSettings, ...changes });
  return (
    <SettingsGroup title="General">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <EndpointFields webUiSettings={webUiSettings} onPatch={patch} />
        <div style={{ color: MUTED }}>Base URL for API calls: {webUi.createBaseUrl()}</div>
        <div style={FIELD_ROW_STYLE}>
          <TextField label="Username" value={webUiSettings.username} onChange={username => patch({ username })} />
          <TextField label="Password" value={webUiSettings.password} onChange={password => patch({ password })} type="password" />
        </div>
        {webUi.isConnectionTestSupported && <WebUIConnectionTest webUiSettings={webUiSettings} />}
        {(webUi.isAddPausedSupported || webUi.isLabelDirChooserSupported) && (
          <BehaviourToggles webUiSettings={webUiSettings} webUi={webUi} onPatch={patch} />
        )}
      </div>
    </SettingsGroup>
  );
}

interface PatchableProps {
  webUiSettings: WebUISettings;
  onPatch: (changes: Partial<WebUISettings>) => void;
}

function EndpointFields({ webUiSettings, onPatch }: PatchableProps) {
  return (
    <div style={FIELD_ROW_STYLE}>
      <TextField label="Host" value={webUiSettings.host} onChange={host => onPatch({ host })} />
      <PortField webUiSettings={webUiSettings} onPatch={onPatch} />
      <Toggle checked={webUiSettings.secure} onChange={secure => onPatch({ secure })} label="Secure (HTTPS)" />
      <TextField label="Relative Path" value={webUiSettings.relativePath || ""} onChange={relativePath => onPatch({ relativePath })} />
    </div>
  );
}

function PortField({ webUiSettings, onPatch }: PatchableProps) {
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
        placeholder={webUiSettings.secure ? "443" : "80"}
        value={webUiSettings.port ?? ""}
        onChange={e => patchPort(e.target.value)}
        style={{ ...FIELD_INPUT_STYLE, minWidth: 80 }}
      />
    </div>
  );
}

type BehaviourTogglesProps = PatchableProps & Pick<WebUISectionProps, "webUi">;

function BehaviourToggles({ webUiSettings, webUi, onPatch }: BehaviourTogglesProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
      {webUi.isAddPausedSupported && (
        <Toggle checked={webUiSettings.addPaused} onChange={addPaused => onPatch({ addPaused })} label="Add torrents paused" />
      )}
      {webUi.isLabelDirChooserSupported && <ChooserToggles webUiSettings={webUiSettings} onPatch={onPatch} />}
    </div>
  );
}

function ChooserToggles({ webUiSettings, onPatch }: PatchableProps) {
  return (
    <>
      <Toggle
        checked={webUiSettings.showPerTorrentConfigSelector}
        onChange={showPerTorrentConfigSelector => onPatch({ showPerTorrentConfigSelector })}
        label="Show per-torrent config selector"
      />
      <Toggle
        checked={webUiSettings.useAlternativeLabelDirChooser ?? false}
        onChange={useAlternativeLabelDirChooser => onPatch({ useAlternativeLabelDirChooser })}
        label="Use alternative container (window instead of popup)"
      />
    </>
  );
}
