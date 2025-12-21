/**
 * Settings Context
 *
 * Provides app-wide access to user settings, including timezone.
 * Settings are loaded from AsyncStorage on mount and cached in memory.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSetting,
  type Settings,
} from "../db/settings";

interface SettingsContextValue {
  settings: Settings;
  isLoading: boolean;
  /** Update a single setting */
  updateSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => Promise<void>;
  /** Reload all settings from storage */
  reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("[SettingsProvider] Failed to load settings:", error);
        setIsLoading(false);
      });
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      // Optimistic update
      setSettings((prev) => ({ ...prev, [key]: value }));
      try {
        await saveSetting(key, value);
      } catch (error) {
        // Rollback on error
        const reloaded = await loadSettings();
        setSettings(reloaded);
        throw error;
      }
    },
    []
  );

  const reloadSettings = useCallback(async () => {
    const loaded = await loadSettings();
    setSettings(loaded);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isLoading,
      updateSetting,
      reloadSettings,
    }),
    [settings, isLoading, updateSetting, reloadSettings]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to access settings
 */
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

/**
 * Hook to get just the timezone (common case)
 */
export function useTimezone(): string {
  const { settings } = useSettings();
  return settings.timezone;
}
