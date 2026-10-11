import { type CSSProperties } from "react";
import { type Client, ClientClassByClient } from "../../models/clients";
import { type TorrentWebUI, type WebUISettings } from "../../models/webui";

export interface WebUISectionProps {
  webui: WebUISettings;
  webUiInstance: TorrentWebUI;
  onChange: (w: WebUISettings) => void;
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
}

export const MUTED = "var(--rta-text-muted, #888)";
export const GREEN_DARK = "var(--rta-green-dark, #4e6a57)";

export const fieldInputStyle: CSSProperties = {
  fontSize: 15,
  borderRadius: 8,
  padding: "6px 12px",
  border: "1px solid var(--rta-border, #b7c9a7)",
  background: "var(--rta-input-bg, #fff)",
  color: "var(--rta-text, #1b241d)",
};

export const FIELD_LABEL_STYLE: CSSProperties = { fontWeight: 500, marginBottom: 4, display: "block" };

export function isClientSelected(client: Client | ""): client is Client {
  return !!client && client in ClientClassByClient;
}

export function TextField({ label, value, onChange, type = "text" }: TextFieldProps) {
  return (
    <div>
      <label style={FIELD_LABEL_STYLE}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldInputStyle, minWidth: 120 }} />
    </div>
  );
}
