import { useState } from "react";
import { useSettings } from "../SettingsContext";
import ChipList from "../components/ChipList";
import Select from "../components/Select";
import { Client } from "../../models/clients";
import type { WebUISettings } from "../../models/webui";
import Toggle from "../components/Toggle";
import { generateId } from "../../util/utils";

const clientOptions = Object.entries(Client).map(([key, value]) => ({ value: key, label: value }));

function getDefaultWebUISettings(): WebUISettings {
  return {
    id: generateId(),
    client: Client.QBittorrentWebUI,
    name: "",
    host: "",
    port: 8080,
    secure: false,
    relativePath: "",
    username: "",
    password: "",
    showPerTorrentConfigSelector: false,
    defaultLabel: "",
    defaultDir: "",
    labels: [],
    dirs: [],
    addPaused: false,
    autoLabelDirSettings: [], // TODO: implement
    clientSpecificSettings: {}, // TODO: implement
  };
}

function WebUIEditor({ webui, onChange, onRemove }: { webui: WebUISettings; onChange: (w: WebUISettings) => void; onRemove: () => void }) {
  return (
    <div style={{ border: "1px solid #b7c9a7", borderRadius: 12, padding: 20, marginBottom: 32, background: "#f7faf7" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 18 }}>{webui.name || "Unnamed WebUI"}</span>
        <button onClick={onRemove} style={{ background: "#B22222", color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontWeight: 500, cursor: "pointer" }}>Remove</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontWeight: 500 }}>ID:</span> <span style={{ fontFamily: "monospace" }}>{webui.id}</span> <span style={{ color: "#888" }}>(TODO: auto-generate)</span>
      </div>
      {/* Client + Name */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 12 }}>
        <Select
          label="Client"
          value={webui.client}
          options={clientOptions}
          onChange={client => onChange({ ...webui, client: client as Client })}
          changeable={false}
        />
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Name</label>
          <input
            type="text"
            value={webui.name}
            onChange={e => onChange({ ...webui, name: e.target.value })}
            style={{ fontSize: 15, borderRadius: 8, padding: "6px 12px", border: "1px solid #b7c9a7", minWidth: 180 }}
          />
        </div>
      </div>
      {/* Host + Port + Secure + Relative Path */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Host</label>
          <input type="text" value={webui.host} onChange={e => onChange({ ...webui, host: e.target.value })} style={{ fontSize: 15, borderRadius: 8, padding: "6px 12px", border: "1px solid #b7c9a7", minWidth: 120 }} />
        </div>
        <div>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Port</label>
          <input type="number" value={webui.port} onChange={e => onChange({ ...webui, port: Number(e.target.value) })} style={{ fontSize: 15, borderRadius: 8, padding: "6px 12px", border: "1px solid #b7c9a7", minWidth: 80 }} />
        </div>
        <Toggle checked={webui.secure} onChange={v => onChange({ ...webui, secure: v })} label="Secure (HTTPS)" />
        <div>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Relative Path</label>
          <input type="text" value={webui.relativePath || ""} onChange={e => onChange({ ...webui, relativePath: e.target.value })} style={{ fontSize: 15, borderRadius: 8, padding: "6px 12px", border: "1px solid #b7c9a7", minWidth: 120 }} />
        </div>
      </div>
      {/* Username + Password */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Username</label>
          <input type="text" value={webui.username} onChange={e => onChange({ ...webui, username: e.target.value })} style={{ fontSize: 15, borderRadius: 8, padding: "6px 12px", border: "1px solid #b7c9a7", minWidth: 120 }} />
        </div>
        <div>
          <label style={{ fontWeight: 500, marginBottom: 4, display: "block" }}>Password</label>
          <input type="password" value={webui.password} onChange={e => onChange({ ...webui, password: e.target.value })} style={{ fontSize: 15, borderRadius: 8, padding: "6px 12px", border: "1px solid #b7c9a7", minWidth: 120 }} />
        </div>
      </div>
      {/* Torrents Paused Toggle */}
      <Toggle checked={webui.addPaused} onChange={v => onChange({ ...webui, addPaused: v })} label="Add torrents paused" />
      {/* Label/Dir stuff */}
      <ChipList label="Labels" values={webui.labels} onChange={labels => onChange({ ...webui, labels })} placeholder="Add label" />
      <ChipList label="Directories" values={webui.dirs} onChange={dirs => onChange({ ...webui, dirs })} placeholder="Add directory" />
      {/* Per-torrent config selector toggle */}
      <Toggle checked={webui.showPerTorrentConfigSelector} onChange={v => onChange({ ...webui, showPerTorrentConfigSelector: v })} label="Show per-torrent config selector" />
      <div style={{ marginTop: 16, color: "#888" }}>
        <div><b>AutoLabelDirSettings:</b> <span>TODO: implement</span></div>
        <div><b>ClientSpecificSettings:</b> <span>TODO: implement</span></div>
      </div>
    </div>
  );
}

export default function WebUIsPage() {
  const { settings, updateSetting, loading } = useSettings();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClient, setNewClient] = useState("");

  if (loading || !settings) return <div>Loading...</div>;

  const handleAdd = () => {
    if (!newName || !newClient) return;
    const newWebUI: WebUISettings = { ...getDefaultWebUISettings(), name: newName, client: newClient as Client };
    updateSetting("webuiSettings", [...settings.webuiSettings, newWebUI]);
    setAdding(false);
    setNewName("");
    setNewClient("");
  };

  const handleChange = (idx: number, updated: WebUISettings) => {
    const arr = [...settings.webuiSettings];
    arr[idx] = updated;
    updateSetting("webuiSettings", arr);
  };

  const handleRemove = (idx: number) => {
    const arr = [...settings.webuiSettings];
    arr.splice(idx, 1);
    updateSetting("webuiSettings", arr);
  };

  return (
    <div>
      {adding ? (
        <div style={{ border: "1px solid #b7c9a7", borderRadius: 12, padding: 20, marginBottom: 32, background: "#f7faf7" }}>
          <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>Add New WebUI</h3>
          <Select
            label="Client"
            value={newClient}
            options={clientOptions}
            onChange={setNewClient}
          />
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500, marginBottom: 8, display: "block" }}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ fontSize: 15, borderRadius: 8, padding: "6px 12px", border: "1px solid #b7c9a7", minWidth: 180 }}
            />
          </div>
          <button onClick={handleAdd} style={{ background: "#228B22", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 500, cursor: "pointer", marginRight: 12 }}>Add</button>
          <button onClick={() => setAdding(false)} style={{ background: "#B22222", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ background: "#228B22", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 500, cursor: "pointer", marginTop: 12, marginBottom: 12 }}>Add New WebUI</button>
      )}
      {settings.webuiSettings.length === 0 && !adding && (
        <div style={{ marginBottom: 24, color: "#888" }}>No WebUIs configured yet.</div>
      )}
      {settings.webuiSettings.map((webui, idx) => (
        <WebUIEditor
          key={webui.id + idx}
          webui={webui}
          onChange={updated => handleChange(idx, updated)}
          onRemove={() => handleRemove(idx)}
        />
      ))}
    </div>
  );
}
