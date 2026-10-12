import { type CSSProperties } from "react";
import { type TorrentWebUI, type WebUISettings } from "../../models/webui";
import { TEXT, BORDER, INPUT_BG } from "../theme";

export interface WebUISectionProps {
  webUiSettings: WebUISettings;
  webUi: TorrentWebUI;
  onChange: (w: WebUISettings) => void;
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
}

export const UNNAMED_WEBUI_NAME = "Unnamed WebUI";

export const FIELD_INPUT_STYLE: CSSProperties = {
  fontSize: 15,
  borderRadius: 8,
  padding: "6px 12px",
  border: `1px solid ${BORDER}`,
  background: INPUT_BG,
  color: TEXT,
};

export const FIELD_LABEL_STYLE: CSSProperties = { fontWeight: 500, marginBottom: 4, display: "block" };

export function TextField({ label, value, onChange, type = "text" }: TextFieldProps) {
  return (
    <div>
      <label style={FIELD_LABEL_STYLE}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ ...FIELD_INPUT_STYLE, minWidth: 120 }} />
    </div>
  );
}
