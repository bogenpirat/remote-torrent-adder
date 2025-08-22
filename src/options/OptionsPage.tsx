

import { useState } from "react";
import { SettingsProvider } from "./SettingsContext";
import WebUIsPage from "./pages/WebUIsPage";
import NotificationsPage from "./pages/NotificationsPage";
import LinkCatchingPage from "./pages/LinkCatchingPage";
import AboutPage from "./pages/AboutPage";
import ImportExportPage from "./pages/ImportExportPage";


const FALLBACK_THEME = {
  bg: "#eaf5ea",
  green: "#6e8b74",
  greenDark: "#4e6a57",
  accent: "#b7c9a7",
  white: "#ffffff"
};

const TAB_TITLES = ["WebUIs", "Notifications", "Link Catching", "Import/Export Settings", "About"];

const TAB_CONTENT = [
  <WebUIsPage />,
  <NotificationsPage />,
  <LinkCatchingPage />,
  <ImportExportPage />,
  <AboutPage />
];

export default function OptionsPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <SettingsProvider>
      <div
        style={{
          fontFamily: "sans-serif",
          width: "80%",
          margin: "40px auto",
          background: "var(--rta-bg, " + FALLBACK_THEME.bg + ")",
          borderRadius: 16,
          boxShadow: "0 2px 16px var(--rta-shadow-color, rgba(110,139,116,0.10))",
          border: "1px solid var(--rta-green-dark, " + FALLBACK_THEME.greenDark + ")",
          minHeight: 400,
          color: "var(--rta-text, #1b241d)"
        }}
      >
        <div
          style={{
            width: "100%",
            margin: "0 auto",
            padding: "24px 0 8px 0",
            textAlign: "center"
          }}
        >
          <h1
            style={{
              color: "var(--rta-green-dark, " + FALLBACK_THEME.greenDark + ")",
              fontWeight: 700,
              fontSize: 32,
              margin: 0,
              letterSpacing: 1,
              textShadow: "0 2px 8px var(--rta-accent, " + FALLBACK_THEME.accent + ")"
            }}
          >
            Remote Torrent Adder Options
          </h1>
        </div>
        <div style={{ display: "flex", borderBottom: "2px solid var(--rta-green, " + FALLBACK_THEME.green + ")" }}>
          {TAB_TITLES.map((title, idx) => (
            <button
              key={title}
              onClick={() => setActiveTab(idx)}
              style={{
                flex: 1,
                padding: "16px 0",
                background: activeTab === idx ? "var(--rta-accent, " + FALLBACK_THEME.accent + ")" : "var(--rta-bg, " + FALLBACK_THEME.bg + ")",
                border: "none",
                borderBottom: activeTab === idx ? "4px solid var(--rta-green-dark, " + FALLBACK_THEME.greenDark + ")" : "4px solid transparent",
                fontWeight: activeTab === idx ? "bold" : "normal",
                color: "var(--rta-green-dark, " + FALLBACK_THEME.greenDark + ")",
                fontSize: 18,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              {title}
            </button>
          ))}
        </div>
        <div style={{
          padding: "10px",
          background: "var(--rta-surface, " + FALLBACK_THEME.white + ")",
          minHeight: 200,
          borderRadius: "0 0 16px 16px",
          boxShadow: "0 2px 8px var(--rta-accent, " + FALLBACK_THEME.accent + ")"
        }}>
          {TAB_CONTENT[activeTab]}
        </div>
      </div>
    </SettingsProvider>
  );
}
