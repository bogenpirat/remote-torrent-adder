import { useState, type CSSProperties } from "react";
import type { WebUISettings } from "../../models/webui";
import WebUIListItem, { type DropIndicator } from "./WebUIListItem";
import { type WebUIEditing } from "./webui-editing";
import { MUTED } from "./webui-fields";

interface WebUIListProps {
  webuis: WebUISettings[];
  selectedId: string | null;
  editing: WebUIEditing;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

interface DragReorder {
  dragIndex: number | null;
  start: (idx: number) => void;
  over: (idx: number) => void;
  end: () => void;
  drop: () => void;
  indicatorFor: (idx: number) => DropIndicator;
}

const PANEL_STYLE: CSSProperties = {
  width: 260,
  flexShrink: 0,
  borderRight: "1px solid var(--rta-border, #b7c9a7)",
  paddingRight: 16,
  display: "flex",
  flexDirection: "column",
};

const ADD_BUTTON_STYLE: CSSProperties = {
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
};

function useDragReorder(onMove: WebUIEditing["move"]): DragReorder {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const end = () => {
    setDragIndex(null);
    setOverIndex(null);
  };
  const drop = () => {
    if (dragIndex !== null && overIndex !== null) onMove(dragIndex, overIndex);
    end();
  };
  const indicatorFor = (idx: number): DropIndicator => {
    if (dragIndex === null || overIndex !== idx || dragIndex === idx) return null;
    return dragIndex > idx ? "above" : "below";
  };
  return { dragIndex, start: setDragIndex, over: setOverIndex, end, drop, indicatorFor };
}

function WebUIListItems({ webuis, selectedId, editing, onSelect }: Omit<WebUIListProps, "onAdd">) {
  const drag = useDragReorder(editing.move);
  return (
    <>
      {webuis.map((webui, idx) => (
        <WebUIListItem
          key={webui.id}
          webui={webui}
          index={idx}
          selected={webui.id === selectedId}
          isPrimary={idx === 0}
          isDragging={drag.dragIndex === idx}
          dropIndicator={drag.indicatorFor(idx)}
          onSelect={() => onSelect(webui.id)}
          onNameChange={name => editing.change(webui.id, { ...webui, name })}
          onMove={editing.move}
          onDragStart={() => drag.start(idx)}
          onDragOver={() => drag.over(idx)}
          onDragEnd={drag.end}
          onDrop={drag.drop}
        />
      ))}
    </>
  );
}

export default function WebUIList(props: WebUIListProps) {
  return (
    <div style={PANEL_STYLE}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>WebUIs</span>
        <button onClick={props.onAdd} title="Add new WebUI" aria-label="Add new WebUI" style={ADD_BUTTON_STYLE}>+</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {props.webuis.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 14, padding: "8px 4px" }}>
            No WebUIs yet. Click + to add one.
          </div>
        ) : (
          <WebUIListItems {...props} />
        )}
      </div>
    </div>
  );
}
