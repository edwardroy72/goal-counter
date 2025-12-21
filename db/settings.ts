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

/**
 * Common timezone options for user selection
 * These are the most common IANA timezone names with GMT offsets
 * Sorted by GMT offset (most negative to most positive)
 */
export const COMMON_TIMEZONES = [
  // UTC-8 to UTC-5 (Americas)
  { label: "Pacific Time (US)", value: "America/Los Angeles", offset: -8 },
  { label: "Mountain Time (US)", value: "America/Denver", offset: -7 },
  { label: "Central Time (US)", value: "America/Chicago", offset: -6 },
  { label: "Eastern Time (US)", value: "America/New York", offset: -5 },
  // UTC-3 (South America)
  { label: "São Paulo", value: "America/Sao Paulo", offset: -3 },
  // UTC+0
  { label: "UTC", value: "UTC", offset: 0 },
  { label: "London", value: "Europe/London", offset: 0 },
  // UTC+1 to UTC+3 (Europe)
  { label: "Paris / Central Europe", value: "Europe/Paris", offset: 1 },
  { label: "Berlin", value: "Europe/Berlin", offset: 1 },
  { label: "Moscow", value: "Europe/Moscow", offset: 3 },
  // UTC+4 to UTC+5:30 (Middle East / South Asia)
  { label: "Dubai", value: "Asia/Dubai", offset: 4 },
  { label: "India", value: "Asia/Kolkata", offset: 5.5 },
  // UTC+7 to UTC+9 (East Asia)
  { label: "Singapore", value: "Asia/Singapore", offset: 8 },
  { label: "Hong Kong", value: "Asia/Hong Kong", offset: 8 },
  { label: "Shanghai", value: "Asia/Shanghai", offset: 8 },
  { label: "Tokyo", value: "Asia/Tokyo", offset: 9 },
  { label: "Seoul", value: "Asia/Seoul", offset: 9 },
  // UTC+10 to UTC+13 (Oceania)
  { label: "Sydney", value: "Australia/Sydney", offset: 10 },
  { label: "Auckland", value: "Pacific/Auckland", offset: 13 },
].sort((a, b) => a.offset - b.offset);

/**
 * Format GMT offset for display
 */
export function formatGmtOffset(offset: number): string {
  const sign = offset >= 0 ? "+" : "";
  if (Number.isInteger(offset)) {
    return `GMT ${sign}${offset}`;
  }
  const hours = Math.floor(Math.abs(offset));
  const minutes = (Math.abs(offset) - hours) * 60;
  const signChar = offset >= 0 ? "+" : "-";
  return `GMT ${signChar}${hours}:${minutes.toString().padStart(2, "0")}`;
}
