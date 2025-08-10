import React, { createContext, useContext, useState, useEffect } from "react";
import type { RTASettings } from "../models/settings";
import { GetSettingsMessage, SaveSettingsMessage } from "../models/messages";
import { deserializeSettings } from "../util/serializer";

interface SettingsContextType {
  settings: RTASettings | null;
  setSettings: (settings: RTASettings) => void;
  updateSetting: <K extends keyof RTASettings>(key: K, value: RTASettings[K]) => void;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<RTASettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch settings from service worker on mount
  useEffect(() => {
    chrome.runtime.sendMessage(GetSettingsMessage, (serializedSettings) => {
      const settings: RTASettings = deserializeSettings(serializedSettings);
      setSettings(settings);
      setLoading(false);
    });
  }, []);

  // Save settings to service worker whenever they change
  const saveSettings = (newSettings: RTASettings) => {
    setSettings(newSettings);
    chrome.runtime.sendMessage({ action: SaveSettingsMessage.action, settings: newSettings });
  };

  const updateSetting = <K extends keyof RTASettings>(key: K, value: RTASettings[K]) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    saveSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings: saveSettings, updateSetting, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
