import { useState, type JSX } from "react";
import { useSettings } from "../SettingsContext";
import { type RTASettings } from "../../models/settings";
import { serializeSettings, deserializeSettings } from "../../util/serializer";
import { migrateSettingsClientIdentifiers } from "../../util/legacy-client-identifiers";

const NOT_AN_EXPORT_MESSAGE = "That JSON is not a Remote Torrent Adder settings export.";

const COPIED_NOTICE_DURATION_MS = 1500;

export default function ImportExportPage(): JSX.Element {
  const { settings, setSettings, loading } = useSettings();

  if (loading || !settings) return <div>Loading...</div>;

  return (
    <div className="rta-page">
      <ExportCard settings={settings} />

      <ImportCard onImport={setSettings} />
    </div>
  );
}

function ExportCard({ settings }: { settings: RTASettings }): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (): void => {
    navigator.clipboard.writeText(serializeSettings(settings));
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_NOTICE_DURATION_MS);
  };

  return (
    <section className="rta-card">
      <h3 className="rta-card__heading">Export</h3>
      <label className="rta-muted" htmlFor="rta-export">Copy this and keep it somewhere safe.</label>
      <textarea id="rta-export" className="rta-textarea" readOnly value={serializeSettings(settings)} />
      <button
        type="button"
        onClick={handleCopy}
        className={copied ? "rta-button rta-button--success" : "rta-button rta-button--accent"}
      >
        {copied ? "Copied!" : "Copy to clipboard"}
      </button>
    </section>
  );
}

function ImportCard({ onImport }: { onImport: (settings: RTASettings) => void }): JSX.Element {
  const [importValue, setImportValue] = useState<string>("");
  const [importError, setImportError] = useState<string>("");

  const handleImport = (): void => {
    setImportError("");
    // Pasted text is arbitrary: both a parse failure and a parse that yields
    // something which is not a settings export have to be reported, rather
    // than thrown out of the click handler.
    let imported: RTASettings;
    try {
      imported = parseSettingsExport(importValue);
    } catch (error) {
      setImportError((error as Error).message);
      return;
    }
    onImport(migrateSettingsClientIdentifiers(imported));
    setImportValue("");
  };

  return (
    <section className="rta-card">
      <h3 className="rta-card__heading">Import</h3>
      <label className="rta-muted" htmlFor="rta-import">Paste a previously exported configuration.</label>
      <ImportTextarea value={importValue} onChange={setImportValue} invalid={importError !== ""} />
      <button type="button" onClick={handleImport} className="rta-button">
        Import settings
      </button>
      {importError && <div id="rta-import-error" role="alert" className="rta-error">{importError}</div>}
    </section>
  );
}

function parseSettingsExport(text: string): RTASettings {
  if (!text) {
    throw new Error(NOT_AN_EXPORT_MESSAGE);
  }
  let imported: RTASettings;
  try {
    imported = deserializeSettings(text);
  } catch {
    throw new Error("That is not valid JSON.");
  }
  if (!Array.isArray(imported?.webuiSettings)) {
    throw new Error(NOT_AN_EXPORT_MESSAGE);
  }
  return imported;
}

interface ImportTextareaProps {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}

function ImportTextarea({ value, onChange, invalid }: ImportTextareaProps): JSX.Element {
  return (
    <textarea
      id="rta-import"
      className="rta-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Paste exported settings JSON here..."
      aria-describedby={invalid ? "rta-import-error" : undefined}
      aria-invalid={invalid ? true : undefined}
    />
  );
}
