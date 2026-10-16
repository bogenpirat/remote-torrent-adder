import { useRef, useState, type ComponentType } from "react";
import { SettingsProvider } from "./SettingsContext";
import WebUIsPage from "./pages/WebUIsPage";
import NotificationsPage from "./pages/NotificationsPage";
import LinkCatchingPage from "./pages/LinkCatchingPage";
import IconClickPage from "./pages/IconClickPage";
import AboutPage from "./pages/AboutPage";
import ImportExportPage from "./pages/ImportExportPage";
import HostPermissionNotice from "./components/HostPermissionNotice";

interface Tab {
  id: string;
  title: string;
  Content: ComponentType;
}

const TABS: Tab[] = [
  { id: "webuis", title: "WebUIs", Content: WebUIsPage },
  { id: "icon-click", title: "Icon Click", Content: IconClickPage },
  { id: "notifications", title: "Notifications", Content: NotificationsPage },
  { id: "link-catching", title: "Link Catching", Content: LinkCatchingPage },
  { id: "import-export", title: "Import/Export Settings", Content: ImportExportPage },
  { id: "about", title: "About", Content: AboutPage },
];

export default function OptionsPage() {
  const navigation = useTabNavigation();
  const active = TABS[navigation.activeTab] ?? TABS[0]!;

  return (
    <SettingsProvider>
      <div className="rta-shell">
        <div className="rta-shell__header">
          <h1 className="rta-shell__title">Remote Torrent Adder Options</h1>
        </div>

        <HostPermissionNotice />

        <TabList navigation={navigation} />

        <TabPanel tab={active} />
      </div>
    </SettingsProvider>
  );
}

interface TabNavigation {
  activeTab: number;
  setActiveTab: (index: number) => void;
  tabRefs: React.RefObject<Array<HTMLButtonElement | null>>;
  handleKeyDown: (event: React.KeyboardEvent, index: number) => void;
}

function useTabNavigation(): TabNavigation {
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
    const target = targetTabIndex(event.key, index);
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    focusTab(target);
  };

  return { activeTab, setActiveTab, tabRefs, handleKeyDown };
}

function targetTabIndex(key: string, index: number): number | undefined {
  const moves: Record<string, number> = {
    ArrowLeft: index - 1,
    ArrowRight: index + 1,
    Home: 0,
    End: TABS.length - 1,
  };
  return moves[key];
}

function TabList({ navigation }: { navigation: TabNavigation }) {
  const { activeTab, setActiveTab, tabRefs, handleKeyDown } = navigation;
  return (
    <div className="rta-tablist" role="tablist" aria-label="Options sections">
      {TABS.map((tab, index) => (
        <TabButton
          key={tab.id}
          tab={tab}
          selected={activeTab === index}
          buttonRef={element => {
            tabRefs.current[index] = element;
          }}
          onSelect={() => setActiveTab(index)}
          onKeyDown={event => handleKeyDown(event, index)}
        />
      ))}
    </div>
  );
}

interface TabButtonProps {
  tab: Tab;
  selected: boolean;
  buttonRef: (element: HTMLButtonElement | null) => void;
  onSelect: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

function TabButton({ tab, selected, buttonRef, onSelect, onKeyDown }: TabButtonProps) {
  return (
    <button
      ref={buttonRef}
      className="rta-tab"
      role="tab"
      id={`rta-tab-${tab.id}`}
      type="button"
      aria-selected={selected}
      aria-controls={`rta-tabpanel-${tab.id}`}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {tab.title}
    </button>
  );
}

function TabPanel({ tab }: { tab: Tab }) {
  return (
    <div
      className="rta-tabpanel"
      role="tabpanel"
      id={`rta-tabpanel-${tab.id}`}
      aria-labelledby={`rta-tab-${tab.id}`}
      tabIndex={0}
    >
      <tab.Content />
    </div>
  );
}
