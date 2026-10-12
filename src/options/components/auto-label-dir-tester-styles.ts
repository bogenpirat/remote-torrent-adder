import { type CSSProperties } from "react";
import { CHIP_BG, CHIP_BORDER } from "../theme";

export const MONOSPACE_STYLE: CSSProperties = {
  fontFamily: "monospace",
  background: CHIP_BG,
  border: `1px solid ${CHIP_BORDER}`,
  borderRadius: 6,
  padding: "1px 6px"
};
