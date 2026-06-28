import { useEffect, useState } from "react";
import { useSettings } from "../SettingsContext";
import ChipList from "../components/ChipList";
import AutoLabelDirSettingsEditor from "../components/AutoLabelDirSettingsEditor";
import Select from "../components/Select";
import { Client, ClientClassByClient, ClientDisplayName, WebUIFactory } from "../../models/clients";
import type { ConnectionTestResult, WebUISettings } from "../../models/webui";
import { TestConnectionMessage, type ITestConnectionMessage } from "../../models/messages";
import Toggle from "../components/Toggle";
import { generateId } from "../../util/utils";

const clientOptions = Object.values(Client).map(c => ({ value: c, label: ClientDisplayName[c] }));

function isClientSelected(client: Client | ""): client is Client {
  return !!client && client in ClientClassByClient;
}

const fieldInputStyle: React.CSSProperties = {
  fontSize: 15,
  borderRadius: 8,
  padding: "6px 12px",
  border: "1px solid var(--rta-border, #b7c9a7)",
  background: "var(--rta-input-bg, #fff)",
  color: "var(--rta-text, #1b241d)",
};

function getDefaultWebUISettings(): WebUISettings {
  return {
    id: generateId(),
    // No client is chosen yet: the user picks one in the detail panel, which is
    // what reveals the rest of the configuration. Until then this entry is a
    // draft and is filtered out by consumers that resolve a concrete client.
    client: "" as Client,
    name: "",
    host: "",
    port: 80,
    secure: false,
    relativePath: "",
    username: "",
    password: "",
    showPerTorrentConfigSelector: false,
    defaultLabel: null,
    defaultDir: null,
    labels: [],
    dirs: [],
    addPaused: false,
    autoLabelDirSettings: [],
    clientSpecificSettings: {},
    useAlternativeLabelDirChooser: false,
  };
}

interface WebUIListItemProps {
  webui: WebUISettings;
  selected: boolean;
  isPrimary: boolean;
  onSelect: () => void;
  onNameChange: (name: string) => void;
}

function WebUIListItem({ webui, selected, isPrimary, onSelect, onNameChange }: WebUIListItemProps) {
  const subtitle = isClientSelected(webui.client) ? ClientDisplayName[webui.client] : "No client selected";

  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "10px 12px",
        borderRadius: 10,
        cursor: "pointer",
        background: selected ? "var(--rta-accent, #b7c9a7)" : "transparent",
        border: selected ? "1px solid var(--rta-green-dark, #4e6a57)" : "1px solid transparent",
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {selected ? (
          <input
            type="text"
            value={webui.name}
            autoFocus={!webui.name}
            onClick={e => e.stopPropagation()}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Unnamed WebUI"
            style={{
              ...fieldInputStyle,
              flex: 1,
              minWidth: 0,
              padding: "4px 8px",
              fontWeight: 600,
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontWeight: 600,
              fontSize: 15,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: webui.name ? "var(--rta-text, #1b241d)" : "var(--rta-text-muted, #888)",
            }}
          >
            {webui.name || "Unnamed WebUI"}
          </span>
        )}
        {isPrimary && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              background: "var(--rta-green, #6e8b74)",
              borderRadius: 6,
              padding: "2px 6px",
              whiteSpace: "nowrap",
            }}
          >
            Primary
          </span>
        )}
      </div>
      <span style={{ fontSize: 12, color: selected ? "var(--rta-green-dark, #4e6a57)" : "var(--rta-text-muted, #888)" }}>
        {subtitle}
      </span>
    </div>
  );
}

interface WebUIDetailProps {
  webui: WebUISettings;
  onChange: (w: WebUISettings) => void;
  onRemove: () => void;
  onPromote: () => void;
  isPrimary: boolean;
}

function WebUIDetail({ webui, onChange, onRemove, onPromote, isPrimary }: WebUIDetailProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const clientChosen = isClientSelected(webui.client);
  const webUiInstance = clientChosen ? WebUIFactory.createWebUI(webui) : null;

  // The result reflects a specific endpoint + credentials, so invalidate it
  // whenever any field that affects the request changes.
  useEffect(() => {
    setTestResult(null);
    setTesting(false);
  }, [webui.id, webui.client, webui.host, webui.port, webui.secure, webui.relativePath, webui.username, webui.password]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await chrome.runtime.sendMessage({
        action: TestConnectionMessage.action,
        webUiSettings: webui,
      } as ITestConnectionMessage);
      setTestResult(result as ConnectionTestResult);
    } catch (error) {
      setTestResult({ reachable: false, authenticated: null, httpResponseCode: 0, message: String(error) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 22, flex: 1 }}>{webui.name || "Unnamed WebUI"}</span>
        {!isPrimary && (
          <button
            onClick={onPromote}
            style={{
              background: "var(--rta-info, #4682B4)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 16px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >Promote to Primary</button>
        )}
        <button
          onClick={() => {
            if (confirmRemove) onRemove();
            else setConfirmRemove(true);
          }}
          style={{
            background: confirmRemove ? "var(--rta-danger-dark, #8B0000)" : "var(--rta-danger, #B22222)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "6px 16px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: confirmRemove ? "0 0 8px 2px var(--rta-danger-dark, #8B0000)" : undefined,
            transition: "all 0.15s",
          }}
        >
          {confirmRemove ? "For real?" : "Remove"}
        </button>
        {confirmRemove && (
          <button
            onClick={() => setConfirmRemove(false)}
            style={{
              background: "var(--rta-neutral, #eee)",
              color: "var(--rta-danger, #B22222)",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >Cancel</button>
        )}
      </div>

      {/* Client type: choosable while still a draft, locked once chosen. */}
      <div style={{ marginBottom: 20 }}>
        <Select
          label="Client"
          value={webui.client}
          changeable={!clientChosen}
          options={clientOptions}
          onChange={clientChosen ? undefined : value => onChange({ ...webui, client: value as Client })}
        />
      </div>

      {!clientChosen ? (
        <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 15 }}>
          Select a client type above to configure this WebUI.
        </div>
      ) : (
        <>
          {/* Host + Port + Secure + Relative Path */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Host</label>
              <input type="text" value={webui.host} onChange={e => onChange({ ...webui, host: e.target.value })} style={{ ...fieldInputStyle, minWidth: 120 }} />
            </div>
            <div>
              <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Port</label>
              <input type="number" value={webui.port} onChange={e => onChange({ ...webui, port: Number(e.target.value) })} style={{ ...fieldInputStyle, minWidth: 80 }} />
            </div>
            <Toggle checked={webui.secure} onChange={v => onChange({ ...webui, secure: v })} label="Secure (HTTPS)" />
            <div>
              <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Relative Path</label>
              <input type="text" value={webui.relativePath || ""} onChange={e => onChange({ ...webui, relativePath: e.target.value })} style={{ ...fieldInputStyle, minWidth: 120 }} />
            </div>
          </div>
          <div style={{ marginBottom: 20, color: "var(--rta-text-muted, #888)" }}>Base URL for API calls: {webUiInstance?.createBaseUrl()}</div>
          {/* Username + Password */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Username</label>
              <input type="text" value={webui.username} onChange={e => onChange({ ...webui, username: e.target.value })} style={{ ...fieldInputStyle, minWidth: 120 }} />
            </div>
            <div>
              <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Password</label>
              <input type="password" value={webui.password} onChange={e => onChange({ ...webui, password: e.target.value })} style={{ ...fieldInputStyle, minWidth: 120 }} />
            </div>
          </div>
          {/* Test connection */}
          {webUiInstance?.isConnectionTestSupported && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <button
                onClick={handleTest}
                disabled={testing}
                style={{
                  background: "var(--rta-info, #4682B4)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 16px",
                  fontWeight: 700,
                  cursor: testing ? "default" : "pointer",
                  opacity: testing ? 0.7 : 1,
                  transition: "all 0.15s",
                }}
              >{testing ? "Testing…" : "Test connection"}</button>
              {testResult && (() => {
                const color = !testResult.reachable
                  ? "var(--rta-danger, #B22222)"
                  : testResult.authenticated === false
                    ? "var(--rta-warning, #B8860B)"
                    : "var(--rta-success, #228B22)";
                const icon = !testResult.reachable ? "❌" : testResult.authenticated === false ? "⚠" : "✅";
                return (
                  <span style={{ color, fontWeight: 600, fontSize: 14 }}>
                    {icon} {testResult.message}
                  </span>
                );
              })()}
            </div>
          )}
          {/* Only show these fields if supported by the WebUI instance */}
          {webUiInstance?.isAddPausedSupported && (
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 20 }}>
              <Toggle checked={webui.addPaused} onChange={v => onChange({ ...webui, addPaused: v })} label="Add torrents paused" />
            </div>
          )}
          {webUiInstance?.isLabelDirChooserSupported && (
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
              <Toggle checked={webui.showPerTorrentConfigSelector} onChange={v => onChange({ ...webui, showPerTorrentConfigSelector: v })} label="Show per-torrent config selector" />
              <Toggle checked={webui.useAlternativeLabelDirChooser ?? false} onChange={v => onChange({ ...webui, useAlternativeLabelDirChooser: v })} label="Use alternative container (window instead of popup)" />
            </div>
          )}
          {webUiInstance?.isLabelSupported && (
            <>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Default Label</label>
                <input
                  type="text"
                  value={webui.defaultLabel ?? ""}
                  onChange={e => onChange({ ...webui, defaultLabel: e.target.value })}
                  style={{ ...fieldInputStyle, minWidth: 180 }}
                  placeholder="Default label"
                />
              </div>
              <ChipList label="Labels for per-torrent selection" values={webui.labels} onChange={labels => onChange({ ...webui, labels })} placeholder="Add label" />
            </>
          )}
          {webUiInstance?.isDirSupported && (
            <>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Default Directory</label>
                <input
                  type="text"
                  value={webui.defaultDir ?? ""}
                  onChange={e => onChange({ ...webui, defaultDir: e.target.value })}
                  style={{ ...fieldInputStyle, minWidth: 180 }}
                  placeholder="Default directory"
                />
              </div>
              <ChipList label="Directories for per-torrent selection" values={webui.dirs} onChange={dirs => onChange({ ...webui, dirs })} placeholder="Add directory" />
            </>
          )}
          {webUiInstance?.isLabelDirChooserSupported && (
            <AutoLabelDirSettingsEditor
              value={webui.autoLabelDirSettings}
              onChange={autoLabelDirSettings => onChange({ ...webui, autoLabelDirSettings })}
              showLabel={!!webUiInstance?.isLabelSupported}
              showDir={!!webUiInstance?.isDirSupported}
              labels={webui.labels}
              dirs={webui.dirs}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function WebUIsPage() {
  const { settings, updateSetting, loading } = useSettings();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const webuis = settings?.webuiSettings ?? [];

  // Default to the primary WebUI so the page never opens to an empty panel,
  // and keep the selection valid if the selected entry is removed.
  useEffect(() => {
    if (webuis.length === 0) {
      if (selectedId !== null) setSelectedId(null);
    } else if (!webuis.some(w => w.id === selectedId)) {
      setSelectedId(webuis[0].id);
    }
  }, [webuis, selectedId]);

  if (loading || !settings) return <div>Loading...</div>;

  const handleAdd = () => {
    const newWebUI = getDefaultWebUISettings();
    updateSetting("webuiSettings", [...webuis, newWebUI]);
    setSelectedId(newWebUI.id);
  };

  const handleChange = (id: string, updated: WebUISettings) => {
    updateSetting("webuiSettings", webuis.map(w => (w.id === id ? updated : w)));
  };

  const handleRemove = (id: string) => {
    updateSetting("webuiSettings", webuis.filter(w => w.id !== id));
  };

  const handlePromote = (id: string) => {
    const idx = webuis.findIndex(w => w.id === id);
    if (idx <= 0) return; // not found or already primary
    const arr = [...webuis];
    const [item] = arr.splice(idx, 1);
    arr.unshift(item);
    updateSetting("webuiSettings", arr);
  };

  const selected = webuis.find(w => w.id === selectedId) ?? null;

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "stretch", minHeight: 360 }}>
      {/* Left panel: list of configured WebUIs */}
      <div
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: "1px solid var(--rta-border, #b7c9a7)",
          paddingRight: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>WebUIs</span>
          <button
            onClick={handleAdd}
            title="Add new WebUI"
            aria-label="Add new WebUI"
            style={{
              background: "var(--rta-success, #228B22)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >+</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {webuis.length === 0 ? (
            <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 14, padding: "8px 4px" }}>
              No WebUIs yet. Click + to add one.
            </div>
          ) : (
            webuis.map((webui, idx) => (
              <WebUIListItem
                key={webui.id}
                webui={webui}
                selected={webui.id === selectedId}
                isPrimary={idx === 0}
                onSelect={() => setSelectedId(webui.id)}
                onNameChange={name => handleChange(webui.id, { ...webui, name })}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel: configuration for the selected WebUI */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {selected ? (
          <WebUIDetail
            webui={selected}
            onChange={updated => handleChange(selected.id, updated)}
            onRemove={() => handleRemove(selected.id)}
            onPromote={() => handlePromote(selected.id)}
            isPrimary={webuis[0]?.id === selected.id}
          />
        ) : (
          <div style={{ color: "var(--rta-text-muted, #888)", fontSize: 15, paddingTop: 8 }}>
            Select a WebUI on the left, or click + to add a new one.
          </div>
        )}
      </div>
    </div>
  );
}
