import { useEffect, useState, type CSSProperties } from "react";
import { ClientDisplayName } from "../../models/clients";
import type { WebUISettings } from "../../models/webui";
import { FIELD_INPUT_STYLE, isClientSelected } from "./webui-fields";
import { TEXT, MUTED, GREEN_DARK } from "../theme";

const REORDER_STEP_BY_KEY = new Map([["ArrowUp", -1], ["ArrowDown", 1]]);

const DROP_SHADOW_BY_INDICATOR = {
  above: `inset 0 3px 0 0 ${GREEN_DARK}`,
  below: `inset 0 -3px 0 0 ${GREEN_DARK}`,
};

const HANDLE_STYLE: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  fontSize: 15,
  lineHeight: 1,
  cursor: "grab",
  touchAction: "none",
};

const NAME_STYLE: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontWeight: 600,
  fontSize: 15,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const PRIMARY_BADGE_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#fff",
  background: "var(--rta-green, #6e8b74)",
  borderRadius: 6,
  padding: "2px 6px",
  whiteSpace: "nowrap",
};

export type DropIndicator = "above" | "below" | null;

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

export default function WebUIListItem(props: WebUIListItemProps) {
  const { webui, selected } = props;
  const subtitle = isClientSelected(webui.client) ? ClientDisplayName[webui.client] : "No client selected";
  // Only the handle arms dragging, so the inline name input stays selectable.
  const arming = useDragArming(props);

  return (
    <div onClick={props.onSelect} draggable={arming.dragArmed} {...dragHandlers(props, arming.disarm)} style={itemStyle(props)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ReorderHandle webui={webui} index={props.index} selected={selected} onMove={props.onMove} onArm={arming.arm} />
        <ItemName webui={webui} selected={selected} onNameChange={props.onNameChange} />
        {props.isPrimary && <span style={PRIMARY_BADGE_STYLE}>Primary</span>}
      </div>
      <span style={{ fontSize: 12, color: selected ? GREEN_DARK : MUTED }}>
        {subtitle}
      </span>
    </div>
  );
}

interface DragArming {
  dragArmed: boolean;
  arm: () => void;
  disarm: () => void;
}

function useDragArming({ isDragging }: Pick<WebUIListItemProps, "isDragging">): DragArming {
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

  return { dragArmed, arm: () => setDragArmed(true), disarm: () => setDragArmed(false) };
}

type DraggedItem = Pick<WebUIListItemProps, "webui" | "onDragStart" | "onDragOver" | "onDragEnd" | "onDrop">;

function dragHandlers(item: DraggedItem, disarm: () => void) {
  return {
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.webui.id);
      item.onDragStart();
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      item.onDragOver();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      item.onDrop();
    },
    onDragEnd: () => {
      disarm();
      item.onDragEnd();
    },
  };
}

function itemStyle({ selected, isDragging, dropIndicator }: WebUIListItemProps): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    opacity: isDragging ? 0.4 : 1,
    background: selected ? "var(--rta-accent, #b7c9a7)" : "transparent",
    border: selected ? `1px solid ${GREEN_DARK}` : "1px solid transparent",
    boxShadow: dropIndicator ? DROP_SHADOW_BY_INDICATOR[dropIndicator] : undefined,
    transition: "background 0.15s",
  };
}

type ReorderHandleProps = Pick<WebUIListItemProps, "webui" | "index" | "selected" | "onMove"> & { onArm: () => void };

function ReorderHandle({ webui, index, selected, onMove, onArm }: ReorderHandleProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = REORDER_STEP_BY_KEY.get(e.key);
    if (step === undefined) return;
    e.preventDefault();
    onMove(index, index + step);
  };
  return (
    <button
      type="button"
      title="Drag to reorder (or use the arrow keys)"
      aria-label={`Reorder ${webui.name || "Unnamed WebUI"}`}
      onClick={e => e.stopPropagation()}
      onPointerDown={onArm}
      onKeyDown={handleKeyDown}
      style={{ ...HANDLE_STYLE, color: selected ? GREEN_DARK : MUTED }}
    >⠿</button>
  );
}

type ItemNameProps = Pick<WebUIListItemProps, "webui" | "selected" | "onNameChange">;

function ItemName({ webui, selected, onNameChange }: ItemNameProps) {
  if (!selected) {
    return (
      <span style={{ ...NAME_STYLE, color: webui.name ? TEXT : MUTED }}>
        {webui.name || "Unnamed WebUI"}
      </span>
    );
  }
  return (
    <input
      type="text"
      value={webui.name}
      autoFocus={!webui.name}
      onClick={e => e.stopPropagation()}
      onChange={e => onNameChange(e.target.value)}
      placeholder="Unnamed WebUI"
      style={{ ...FIELD_INPUT_STYLE, flex: 1, minWidth: 0, padding: "4px 8px", fontWeight: 600 }}
    />
  );
}
