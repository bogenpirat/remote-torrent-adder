import { type Client } from "../../models/clients";
import { type WebUISettings } from "../../models/webui";
import { generateId, moveItem } from "../../util/utils";

export interface WebUIEditing {
  append: (webUiSettings: WebUISettings) => void;
  change: (id: string, updated: WebUISettings) => void;
  remove: (id: string) => void;
  move: (from: number, to: number) => void;
  promote: (id: string) => void;
}

const DRAFT_WEBUI_SETTINGS: Omit<WebUISettings, "id"> = {
  // No client is chosen yet: the user picks one in the detail panel, which is
  // what reveals the rest of the configuration. Until then this entry is a
  // draft and is filtered out by consumers that resolve a concrete client.
  client: "" as Client,
  name: "",
  host: "",
  port: null,
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

export function createDraftWebUISettings(): WebUISettings {
  return { id: generateId(), ...structuredClone(DRAFT_WEBUI_SETTINGS) };
}

export function createWebUIEditing(webuis: WebUISettings[], save: (webuis: WebUISettings[]) => void): WebUIEditing {
  // The stored order is what the context menu and the "primary" WebUI are
  // derived from, so reordering the list is all this needs to do.
  const move = (from: number, to: number) => {
    const reordered = moveItem(webuis, from, to);
    if (reordered !== webuis) save(reordered);
  };
  return {
    append: webUiSettings => save([...webuis, webUiSettings]),
    change: (id, updated) => save(webuis.map(w => (w.id === id ? updated : w))),
    remove: id => save(webuis.filter(w => w.id !== id)),
    move,
    promote: id => move(webuis.findIndex(w => w.id === id), 0),
  };
}
