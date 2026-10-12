import { useState } from "react";
import { useSettings } from "../SettingsContext";
import WebUIDetail from "../components/WebUIDetail";
import WebUIList from "../components/WebUIList";
import { createWebUIEditing, getDefaultWebUISettings, type WebUIEditing } from "../components/webui-editing";
import type { WebUISettings } from "../../models/webui";
import { MUTED } from "../theme";

export default function WebUIsPage() {
  const { settings, updateSetting, loading } = useSettings();

  if (loading || !settings) return <div>Loading...</div>;

  return <WebUIsEditor webuis={settings.webuiSettings ?? []} onSave={webuis => updateSetting("webuiSettings", webuis)} />;
}

interface WebUIsEditorProps {
  webuis: WebUISettings[];
  onSave: (webuis: WebUISettings[]) => void;
}

function WebUIsEditor({ webuis, onSave }: WebUIsEditorProps) {
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const editing = createWebUIEditing(webuis, onSave);

  // Default to the primary WebUI so the page never opens to an empty panel, and
  // keep the selection valid if the selected entry is removed. Derived during
  // render so no effect has to chase the settings list.
  const selectedId = webuis.some(w => w.id === requestedId) ? requestedId : (webuis[0]?.id ?? null);
  const selected = webuis.find(w => w.id === selectedId) ?? null;

  const handleAdd = () => {
    const newWebUI = getDefaultWebUISettings();
    editing.append(newWebUI);
    setRequestedId(newWebUI.id);
  };

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "stretch", minHeight: 360 }}>
      <WebUIList webuis={webuis} selectedId={selectedId} editing={editing} onSelect={setRequestedId} onAdd={handleAdd} />

      <DetailPanel webuis={webuis} selected={selected} editing={editing} />
    </div>
  );
}

interface DetailPanelProps {
  webuis: WebUISettings[];
  selected: WebUISettings | null;
  editing: WebUIEditing;
}

function DetailPanel({ webuis, selected, editing }: DetailPanelProps) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {selected ? (
        <WebUIDetail
          key={selected.id}
          webUiSettings={selected}
          onChange={updated => editing.change(selected.id, updated)}
          onRemove={() => editing.remove(selected.id)}
          onPromote={() => editing.promote(selected.id)}
          isPrimary={webuis[0]?.id === selected.id}
        />
      ) : (
        <div style={{ color: MUTED, fontSize: 15, paddingTop: 8 }}>
          Select a WebUI on the left, or click + to add a new one.
        </div>
      )}
    </div>
  );
}
