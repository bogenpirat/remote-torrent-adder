import { type CSSProperties } from "react";

export const MUTED = "var(--rta-text-muted, #888)";
export const DANGER = "var(--rta-danger, #B22222)";
export const SUCCESS = "var(--rta-success, #228B22)";
export const BORDER = "var(--rta-border, #b7c9a7)";


export const monospace: CSSProperties = {
  fontFamily: "monospace",
  background: "var(--rta-chip-bg, #eaf5ea)",
  border: "1px solid var(--rta-chip-border, #b7c9a7)",
  borderRadius: 6,
  padding: "1px 6px"
};
