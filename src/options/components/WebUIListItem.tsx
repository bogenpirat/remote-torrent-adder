import { useEffect, useState, type CSSProperties } from "react";
import { ClientDisplayName, WebUIFactory } from "../../models/clients";
import type { WebUISettings } from "../../models/webui";
import { FIELD_INPUT_STYLE, UNNAMED_WEBUI_NAME } from "./webui-fields";
import { TEXT, MUTED, GREEN, GREEN_DARK, ACCENT } from "../theme";

const REORDER_STEP_BY_KEY = new Map([["ArrowUp", -1], ["ArrowDown", 1]]);

const DROP_SHADOW_BY_INDICATOR: Record<DropIndicator, string | undefined> = {
  none: undefined,
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
  background: GREEN,
  borderRadius: 6,
  padding: "2px 6px",
  whiteSpace: "nowrap",
};

export type DropIndicator = "above" | "below" | "none";

interface WebUIListItemProps {
  webUiSettings: WebUISettings;
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
  const { webUiSettings, selected } = props;
  const subtitle = WebUIFactory.supports(webUiSettings.client) ? ClientDisplayName[webUiSettings.client] : "No client selected";
  // Only the handle arms dragging, so the inline name input stays selectable.
  const arming = useDragArming(props);

  return (
    <div onClick={props.onSelect} draggable={arming.dragArmed} {...dragHandlers(props, arming.disarm)} style={itemStyle(props)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ReorderHandle webUiSettings={webUiSettings} index={props.index} selected={selected} onMove={props.onMove} onArm={arming.arm} />
        <ItemName webUiSettings={webUiSettings} selected={selected} onNameChange={props.onNameChange} />
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

type DraggedItem = Pick<WebUIListItemProps, "webUiSettings" | "onDragStart" | "onDragOver" | "onDragEnd" | "onDrop">;

function dragHandlers(item: DraggedItem, disarm: () => void) {
  return {
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.webUiSettings.id);
      item.onDragStart();
    },
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      item.onDragOver();
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
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
    background: selected ? ACCENT : "transparent",
    border: selected ? `1px solid ${GREEN_DARK}` : "1px solid transparent",
    boxShadow: DROP_SHADOW_BY_INDICATOR[dropIndicator],
    transition: "background 0.15s",
  };
}

type ReorderHandleProps = Pick<WebUIListItemProps, "webUiSettings" | "index" | "selected" | "onMove"> & { onArm: () => void };

function ReorderHandle({ webUiSettings, index, selected, onMove, onArm }: ReorderHandleProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const step = REORDER_STEP_BY_KEY.get(event.key);
    if (step === undefined) return;
    event.preventDefault();
    onMove(index, index + step);
  };
  return (
    <button
      type="button"
      title="Drag to reorder (or use the arrow keys)"
      aria-label={`Reorder ${webUiSettings.name || UNNAMED_WEBUI_NAME}`}
      onClick={e => e.stopPropagation()}
      onPointerDown={onArm}
      onKeyDown={handleKeyDown}
      style={{ ...HANDLE_STYLE, color: selected ? GREEN_DARK : MUTED }}
    >⠿</button>
  );
}

type ItemNameProps = Pick<WebUIListItemProps, "webUiSettings" | "selected" | "onNameChange">;

function ItemName({ webUiSettings, selected, onNameChange }: ItemNameProps) {
  if (!selected) {
    return (
      <span style={{ ...NAME_STYLE, color: webUiSettings.name ? TEXT : MUTED }}>
        {webUiSettings.name || UNNAMED_WEBUI_NAME}
      </span>
    );
  }
  return (
    <input
      type="text"
      value={webUiSettings.name}
      autoFocus={!webUiSettings.name}
      onClick={e => e.stopPropagation()}
      onChange={e => onNameChange(e.target.value)}
      placeholder={UNNAMED_WEBUI_NAME}
      style={{ ...FIELD_INPUT_STYLE, flex: 1, minWidth: 0, padding: "4px 8px", fontWeight: 600 }}
    />
  );
}
