import { type CSSProperties } from "react";
import { ACCENT, CHIP_BG, CHIP_BORDER, GREEN_DARK } from "./theme";

export const FIELD_LABEL_STYLE: CSSProperties = { fontWeight: 500, marginBottom: 4, display: "block" };

export const LIST_HEADING_STYLE: CSSProperties = { ...FIELD_LABEL_STYLE, marginBottom: 8 };

export const CHIP_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  background: CHIP_BG,
  border: `1px solid ${CHIP_BORDER}`,
  borderRadius: 16,
  padding: "4px 12px",
  fontFamily: "monospace",
  fontSize: 15,
};

export const ACCENT_BUTTON_STYLE: CSSProperties = {
  background: ACCENT,
  color: GREEN_DARK,
  border: "none",
  borderRadius: 8,
  padding: "4px 12px",
  fontWeight: 500,
  cursor: "pointer",
};
