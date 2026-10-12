import { type CSSProperties, type JSX } from "react";
import { useSettings } from "../SettingsContext";
import RadioCard from "../components/RadioCard";
import { type IconClickAction } from "../../models/settings";
import { GREEN_DARK, BORDER, SURFACE_ALT } from "../theme";

const SECTION_STYLE: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  gap: 10,
  background: SURFACE_ALT,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 18,
};

const SECTION_TITLE_STYLE: CSSProperties = {
  margin: "0 0 4px 0",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: GREEN_DARK,
};

const OPTIONS: { value: IconClickAction; label: string; description: string; disabledNote?: string }[] = [
  {
    value: "openPrimaryWebUi",
    label: "Open the primary WebUI",
    description: "Clicking the extension icon opens your primary configured WebUI in a new tab.",
  },
  {
    value: "showWebUiPicker",
    label: "Let me choose which WebUI to open",
    description: "Clicking the icon shows a list of your configured WebUIs to pick from.",
    disabledNote: "Configure at least one more WebUI to enable this option.",
  },
  {
    value: "showPageLinks",
    label: "Show links found on this page",
    description: "Clicking the icon shows a popup listing torrent/magnet links detected on the current page. "
      + "Clicking one adds it, just like clicking it on the page.",
  },
];

export default function IconClickPage(): JSX.Element {
  const { settings, updateSetting, loading } = useSettings();

  if (loading || !settings) return <div>Loading...</div>;

  const current: IconClickAction = settings.iconClickAction ?? "openPrimaryWebUi";
  const multipleWebUisConfigured = settings.webuiSettings.length > 1;

  return (
    <div>
      <p style={{ marginBottom: 16 }}>Choose what happens when you click the extension&apos;s icon in the toolbar.</p>
      <section style={SECTION_STYLE}>
        <h3 style={SECTION_TITLE_STYLE}>Icon Click Behavior</h3>
        {OPTIONS.map(option => {
          const disabled = option.value === "showWebUiPicker" && !multipleWebUisConfigured;
          return (
            <RadioCard
              key={option.value}
              name="iconClickAction"
              value={option.value}
              checked={current === option.value}
              disabled={disabled}
              label={option.label}
              description={option.description}
              note={disabled ? option.disabledNote : undefined}
              onChange={value => updateSetting("iconClickAction", value as IconClickAction)}
            />
          );
        })}
      </section>
    </div>
  );
}
