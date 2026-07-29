import { useState, type JSX } from "react";
import { useSettings } from "../SettingsContext";
import { serializeSettings, deserializeSettings } from "../../util/serializer";
import { migrateSettingsClientIdentifiers } from "../../util/legacy-client-identifiers";

export default function ImportExportPage(): JSX.Element {
  const { settings, setSettings, loading } = useSettings();
  const [importValue, setImportValue] = useState<string>("");
  const [importError, setImportError] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  if (loading || !settings) return <div>Loading...</div>;

  const handleCopy = (): void => {
    navigator.clipboard.writeText(serializeSettings(settings));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleImport = (): void => {
    setImportError("");
    // Pasted text is arbitrary: both a parse failure and a parse that yields
    // something which is not a settings export have to be reported, rather
    // than thrown out of the click handler.
    let imported;
    try {
      imported = deserializeSettings(importValue);
    } catch {
      setImportError("That is not valid JSON.");
      return;
    }
    if (!imported || !Array.isArray(imported.webuiSettings)) {
      setImportError("That JSON is not a Remote Torrent Adder settings export.");
      return;
    }
    setSettings(migrateSettingsClientIdentifiers(imported));
    setImportValue("");
  };

  return (
    <div className="rta-page">
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

      <section className="rta-card">
        <h3 className="rta-card__heading">Import</h3>
        <label className="rta-muted" htmlFor="rta-import">Paste a previously exported configuration.</label>
        <textarea
          id="rta-import"
          className="rta-textarea"
          value={importValue}
          onChange={e => setImportValue(e.target.value)}
          placeholder="Paste exported settings JSON here..."
          aria-describedby={importError ? "rta-import-error" : undefined}
          aria-invalid={importError ? true : undefined}
        />
        <button type="button" onClick={handleImport} className="rta-button">
          Import settings
        </button>
        {importError && <div id="rta-import-error" role="alert" className="rta-error">{importError}</div>}
      </section>
    </div>
  );
}
