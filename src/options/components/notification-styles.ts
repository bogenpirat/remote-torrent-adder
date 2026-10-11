import { type CSSProperties } from "react";

export const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

export const buttonStyle: CSSProperties = {
  border: "1px solid var(--rta-border, #b7c9a7)",
  borderRadius: 8,
  padding: "6px 14px",
  background: "var(--rta-surface, #fff)",
  color: "var(--rta-text, #1b241d)",
  fontWeight: 500,
  cursor: "pointer",
};
