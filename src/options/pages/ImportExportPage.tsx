import { useState } from "react";
import { useSettings } from "../SettingsContext";
import { serializeSettings, deserializeSettings } from "../../util/serializer";

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
    const imported = deserializeSettings(importValue);
    if (imported) {
      setSettings(imported);
      setImportValue("");
    } else {
      setImportError("Invalid settings JSON");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <div style={{
        background: "var(--rta-bg, #eaf5ea)",
        border: "1px solid var(--rta-border, #b7c9a7)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
        boxShadow: "0 2px 8px var(--rta-accent, #b7c9a7)"
      }}>
        <h3 style={{ marginTop: 0 }}>Export</h3>
        <textarea
          readOnly
          value={serializeSettings(settings)}
          style={{ width: "100%", height: 120, fontFamily: "monospace", fontSize: 14, borderRadius: 8, border: "1px solid var(--rta-border, #b7c9a7)", marginBottom: 12, background: "var(--rta-surface, #fff)", color: "var(--rta-text, #1b241d)" }}
        />
        <button
          onClick={handleCopy}
          style={{ background: copied ? "var(--rta-success, #228B22)" : "var(--rta-accent, #b7c9a7)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 500, cursor: "pointer", transition: "background 0.2s" }}
        >
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>
      </div>
      <div style={{
        background: "var(--rta-bg, #eaf5ea)",
        border: "1px solid var(--rta-border, #b7c9a7)",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 2px 8px var(--rta-accent, #b7c9a7)"
      }}>
        <h3 style={{ marginTop: 0 }}>Import</h3>
        <textarea
          value={importValue}
          onChange={e => setImportValue(e.target.value)}
          placeholder="Paste exported settings JSON here..."
          style={{ width: "100%", height: 120, fontFamily: "monospace", fontSize: 14, borderRadius: 8, border: "1px solid var(--rta-border, #b7c9a7)", marginBottom: 12, background: "var(--rta-surface, #fff)", color: "var(--rta-text, #1b241d)" }}
        />
        <button
          onClick={handleImport}
          style={{ background: "var(--rta-green, #6e8b74)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 500, cursor: "pointer", transition: "background 0.2s" }}
        >
          Import settings
        </button>
        {importError && <div style={{ color: "var(--rta-danger, #B22222)", marginTop: 8 }}>{importError}</div>}
      </div>
    </div>
  );
}
