import { useRef, useState, type ComponentType } from "react";
import { SettingsProvider } from "./SettingsContext";
import WebUIsPage from "./pages/WebUIsPage";
import NotificationsPage from "./pages/NotificationsPage";
import LinkCatchingPage from "./pages/LinkCatchingPage";
import AboutPage from "./pages/AboutPage";
import ImportExportPage from "./pages/ImportExportPage";

interface Tab {
  id: string;
  title: string;
  Content: ComponentType;
}

const TABS: Tab[] = [
  { id: "webuis", title: "WebUIs", Content: WebUIsPage },
  { id: "notifications", title: "Notifications", Content: NotificationsPage },
  { id: "link-catching", title: "Link Catching", Content: LinkCatchingPage },
  { id: "import-export", title: "Import/Export Settings", Content: ImportExportPage },
  { id: "about", title: "About", Content: AboutPage },
];

export default function OptionsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    const wrapped = (index + TABS.length) % TABS.length;
    setActiveTab(wrapped);
    tabRefs.current[wrapped]?.focus();
  };

  // Arrow keys move between tabs, per the WAI-ARIA tabs pattern. Only the
  // active tab is in the tab order, so Tab jumps straight to the panel.
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: TABS.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    focusTab(target);
  };

  const active = TABS[activeTab] ?? TABS[0]!;

  return (
    <SettingsProvider>
      <div className="rta-shell">
        <div className="rta-shell__header">
          <h1 className="rta-shell__title">Remote Torrent Adder Options</h1>
        </div>

        <div className="rta-tablist" role="tablist" aria-label="Options sections">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={element => {
                tabRefs.current[index] = element;
              }}
              className="rta-tab"
              role="tab"
              id={`rta-tab-${tab.id}`}
              type="button"
              aria-selected={activeTab === index}
              aria-controls={`rta-tabpanel-${tab.id}`}
              tabIndex={activeTab === index ? 0 : -1}
              onClick={() => setActiveTab(index)}
              onKeyDown={event => handleKeyDown(event, index)}
            >
              {tab.title}
            </button>
          ))}
        </div>

        <div
          className="rta-tabpanel"
          role="tabpanel"
          id={`rta-tabpanel-${active.id}`}
          aria-labelledby={`rta-tab-${active.id}`}
          tabIndex={0}
        >
          <active.Content />
        </div>
      </div>
    </SettingsProvider>
  );
}
