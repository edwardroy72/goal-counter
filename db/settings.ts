/**
 * User Settings Storage
 *
 * Simple key-value settings persisted in AsyncStorage.
 * Used for user preferences like timezone.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "@goal_counter_settings";

/**
 * Available setting keys and their types
 */
export interface Settings {
  /** User's preferred timezone (IANA timezone name, e.g., "America/New_York") */
  timezone: string;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  // Default to device's local timezone
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

/**
 * Load all settings from storage
 */
export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error("[Settings] Failed to load settings:", error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save a single setting
 */
export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  try {
    const current = await loadSettings();
    const updated = { ...current, [key]: value };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[Settings] Failed to save setting:", error);
    throw error;
  }
}

/**
 * Get a single setting value
 */
export async function getSetting<K extends keyof Settings>(
  key: K
): Promise<Settings[K]> {
  const settings = await loadSettings();
  return settings[key];
}

/**
 * Clear all settings (reset to defaults)
 */
export async function clearSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error("[Settings] Failed to clear settings:", error);
    throw error;
  }
}
