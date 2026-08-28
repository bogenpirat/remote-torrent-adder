import { useEffect, useState } from "react";
import { useSettings } from "../SettingsContext";
import ChipList from "../components/ChipList";
import AutoLabelDirSettingsEditor from "../components/AutoLabelDirSettingsEditor";
import ClientSpecificSettingsEditor from "../components/ClientSpecificSettingsEditor";
import Select from "../components/Select";
import { Client, ClientClassByClient, ClientDisplayName, WebUIFactory } from "../../models/clients";
import type { ConnectionTestResult, WebUISettings } from "../../models/webui";
import { TestConnectionMessage, type ITestConnectionMessage } from "../../models/messages";
import Toggle from "../components/Toggle";
import { generateId, moveItem } from "../../util/utils";

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

type DropIndicator = "above" | "below" | null;

interface WebUIListItemProps {
  webui: WebUISettings;
  index: number;
  selected: boolean;
  isPrimary: boolean;
  isDragging: boolean;
  dropIndicator: DropIndicator;
  onSelect: () => void;
  onNameChange: (name: string) => void;
  onMove: (from: number, to: number) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}

function WebUIListItem({
  webui,
  index,
  selected,
  isPrimary,
  isDragging,
  dropIndicator,
  onSelect,
  onNameChange,
  onMove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: WebUIListItemProps) {
  const subtitle = isClientSelected(webui.client) ? ClientDisplayName[webui.client] : "No client selected";
  // Only the handle arms dragging, so the inline name input stays selectable.
  const [dragArmed, setDragArmed] = useState(false);

  useEffect(() => {
    if (!dragArmed || isDragging) return;
    const disarm = () => setDragArmed(false);
    window.addEventListener("pointerup", disarm);
    window.addEventListener("pointercancel", disarm);
    return () => {
      window.removeEventListener("pointerup", disarm);
      window.removeEventListener("pointercancel", disarm);
    };
  }, [dragArmed, isDragging]);

  const indicatorColor = "var(--rta-green-dark, #4e6a57)";

  return (
    <div
      onClick={onSelect}
      draggable={dragArmed}
      onDragStart={e => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", webui.id);
        onDragStart();
      }}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDrop={e => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={() => {
        setDragArmed(false);
        onDragEnd();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "10px 12px",
        borderRadius: 10,
        cursor: "pointer",
        opacity: isDragging ? 0.4 : 1,
        background: selected ? "var(--rta-accent, #b7c9a7)" : "transparent",
        border: selected ? "1px solid var(--rta-green-dark, #4e6a57)" : "1px solid transparent",
        boxShadow:
          dropIndicator === "above"
            ? `inset 0 3px 0 0 ${indicatorColor}`
            : dropIndicator === "below"
              ? `inset 0 -3px 0 0 ${indicatorColor}`
              : undefined,
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          title="Drag to reorder (or use the arrow keys)"
          aria-label={`Reorder ${webui.name || "Unnamed WebUI"}`}
          onClick={e => e.stopPropagation()}
          onPointerDown={() => setDragArmed(true)}
          onKeyDown={e => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onMove(index, index - 1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onMove(index, index + 1);
            }
          }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 15,
            lineHeight: 1,
            cursor: "grab",
            touchAction: "none",
            color: selected ? "var(--rta-green-dark, #4e6a57)" : "var(--rta-text-muted, #888)",
          }}
        >⠿</button>
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

interface TestConnectionState {
  signature: string;
  testing: boolean;
  result: ConnectionTestResult | null;
}

function WebUIDetail({ webui, onChange, onRemove, onPromote, isPrimary }: WebUIDetailProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const clientChosen = isClientSelected(webui.client);
  const webUiInstance = clientChosen ? WebUIFactory.createWebUI(webui) : null;

  // A result only describes the endpoint + credentials it was produced for, so
  // it is stored together with a signature of those fields. Anything that would
  // change the request makes the stored result stale, which is derived during
  // render rather than cleared from an effect.
  const endpointSignature = JSON.stringify([
    webui.id, webui.client, webui.host, webui.port, webui.secure, webui.relativePath, webui.username, webui.password,
  ]);
  const [testState, setTestState] = useState<TestConnectionState>({ signature: endpointSignature, testing: false, result: null });
  const isCurrent = testState.signature === endpointSignature;
  const testing = isCurrent && testState.testing;
  const testResult = isCurrent ? testState.result : null;

  const handleTest = async () => {
    setTestState({ signature: endpointSignature, testing: true, result: null });
    try {
      const result = await chrome.runtime.sendMessage({
        action: TestConnectionMessage.action,
        webUiSettings: webui,
      } as ITestConnectionMessage);
      setTestState({ signature: endpointSignature, testing: false, result: result as ConnectionTestResult });
    } catch (error) {
      setTestState({
        signature: endpointSignature,
        testing: false,
        result: { reachable: false, authenticated: null, httpResponseCode: 0, message: String(error) },
      });
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
          {webUiInstance && webUiInstance.clientSpecificSettingDescriptors.length > 0 && (
            <ClientSpecificSettingsEditor
              descriptors={webUiInstance.clientSpecificSettingDescriptors}
              value={webui.clientSpecificSettings ?? {}}
              onChange={clientSpecificSettings => onChange({ ...webui, clientSpecificSettings })}
            />
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
              value={webui.autoLabelDirSettings ?? []}
              onChange={autoLabelDirSettings => onChange({ ...webui, autoLabelDirSettings })}
              showLabel={!!webUiInstance?.isLabelSupported}
              showDir={!!webUiInstance?.isDirSupported}
              labels={webui.labels}
              dirs={webui.dirs}
              defaultLabel={webui.defaultLabel}
              defaultDir={webui.defaultDir}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function WebUIsPage() {
  const { settings, updateSetting, loading } = useSettings();
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const webuis = settings?.webuiSettings ?? [];

  // Default to the primary WebUI so the page never opens to an empty panel, and
  // keep the selection valid if the selected entry is removed. Derived during
  // render so no effect has to chase the settings list.
  const selectedId = webuis.some(w => w.id === requestedId) ? requestedId : (webuis[0]?.id ?? null);
  const setSelectedId = setRequestedId;

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

  // The stored order is what the context menu and the "primary" WebUI are
  // derived from, so reordering the list is all this needs to do.
  const handleMove = (from: number, to: number) => {
    const reordered = moveItem(webuis, from, to);
    if (reordered !== webuis) updateSetting("webuiSettings", reordered);
  };

  const handlePromote = (id: string) => {
    handleMove(webuis.findIndex(w => w.id === id), 0);
  };

  const handleDrop = () => {
    if (dragIndex !== null && overIndex !== null) handleMove(dragIndex, overIndex);
    setDragIndex(null);
    setOverIndex(null);
  };

  const dropIndicatorFor = (idx: number): DropIndicator => {
    if (dragIndex === null || overIndex !== idx || dragIndex === idx) return null;
    return dragIndex > idx ? "above" : "below";
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
                index={idx}
                selected={webui.id === selectedId}
                isPrimary={idx === 0}
                isDragging={dragIndex === idx}
                dropIndicator={dropIndicatorFor(idx)}
                onSelect={() => setSelectedId(webui.id)}
                onNameChange={name => handleChange(webui.id, { ...webui, name })}
                onMove={handleMove}
                onDragStart={() => setDragIndex(idx)}
                onDragOver={() => setOverIndex(idx)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDrop={handleDrop}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel: configuration for the selected WebUI */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {selected ? (
          <WebUIDetail
            key={selected.id}
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
