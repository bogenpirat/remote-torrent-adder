import { type CSSProperties } from "react";
import { TEXT, BORDER, SURFACE } from "../theme";

export const ROW_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

export const BUTTON_STYLE: CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "6px 14px",
  background: SURFACE,
  color: TEXT,
  fontWeight: 500,
  cursor: "pointer",
};
