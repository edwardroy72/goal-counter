/**
 * useGoalEntries Hook
 *
 * Fetches entries for a goal within the current period.
 * Groups entries by day for display in the ledger view.
 * Uses timezone-aware calculations based on user settings.
 * Automatically refetches when data changes via cache invalidation.
 */

import { and, desc, eq, gte } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";
import type { Entry, Goal } from "../types/domain";
import {
  calculatePeriodStartInTimezone,
  formatDisplayDateInTimezone,
  getDateKeyInTimezone,
} from "../utils/timezone-utils";

/**
 * Entry with normalized timestamp for display
 */
export interface NormalizedEntry extends Omit<Entry, "timestamp"> {
  timestamp: Date;
}

/**
 * Entries grouped by day for ledger display
 */
export interface DayGroup {
  date: string; // ISO date string (YYYY-MM-DD)
  displayDate: string; // Formatted for display (e.g., "Today", "Yesterday", "Dec 20")
  entries: NormalizedEntry[];
  dayTotal: number;
}

interface UseGoalEntriesResult {
  entries: NormalizedEntry[];
  groupedByDay: DayGroup[];
  isLoading: boolean;
  error: Error | null;
  periodStart: Date;
  refetch: () => Promise<void>;
}

/**
 * Normalizes entry timestamp to Date object
 */
function normalizeEntry(entry: Entry): NormalizedEntry {
  return {
    ...entry,
    timestamp:
      entry.timestamp instanceof Date
        ? entry.timestamp
        : new Date(entry.timestamp),
  };
}

/**
 * Groups entries by day in the user's timezone
 */
function groupEntriesByDay(
  entries: NormalizedEntry[],
  timezone: string
): DayGroup[] {
  const groups = new Map<string, NormalizedEntry[]>();

  for (const entry of entries) {
    // Use timezone-aware date key
    const dateKey = getDateKeyInTimezone(entry.timestamp, timezone);
    const existing = groups.get(dateKey) || [];
    groups.set(dateKey, [...existing, entry]);
  }

  // Convert to array and sort by date descending (most recent first)
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayEntries]) => ({
      date,
      displayDate: formatDisplayDateInTimezone(
        new Date(date + "T12:00:00"),
        timezone
      ),
      entries: dayEntries.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
      dayTotal: dayEntries.reduce((sum, e) => sum + e.amount, 0),
    }));
}

/**
 * Hook to fetch entries for a goal's current period
 * @param goal - The goal to fetch entries for
 * @returns Entries, grouped entries, loading state, and period info
 */
export function useGoalEntries(goal: Goal | null): UseGoalEntriesResult {
  const [entriesList, setEntriesList] = useState<NormalizedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { settings } = useSettings();

  // Calculate period start using user's timezone
  const periodStart = useMemo(() => {
    if (!goal) return new Date();

    const resetValue = goal.resetValue ?? 1;
    const resetUnit = goal.resetUnit ?? "day";
    const createdAt = goal.createdAt ?? new Date();

    try {
      const createdAtDate =
        createdAt instanceof Date ? createdAt : new Date(createdAt);
      return calculatePeriodStartInTimezone(
        createdAtDate,
        resetValue,
        resetUnit,
        settings.timezone
      );
    } catch (err) {
      console.error("[useGoalEntries] Error calculating period start:", err);
      return new Date();
    }
  }, [
    goal?.id,
    goal?.createdAt,
    goal?.resetValue,
    goal?.resetUnit,
    settings.timezone,
  ]);

  const fetchEntries = useCallback(async () => {
    if (!goal) {
      setEntriesList([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await db
        .select()
        .from(entries)
        .where(
          and(eq(entries.goalId, goal.id), gte(entries.timestamp, periodStart))
        )
        .orderBy(desc(entries.timestamp));

      const normalized = result.map(normalizeEntry);
      setEntriesList(normalized);
    } catch (err) {
      console.error("[useGoalEntries] Error fetching entries:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch entries")
      );
      setEntriesList([]);
    } finally {
      setIsLoading(false);
    }
  }, [goal?.id, periodStart]);

  // Initial fetch
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Subscribe to cache invalidation
  useEffect(() => {
    const unsubscribe = queryCache.subscribe(() => {
      fetchEntries();
    });

    return unsubscribe;
  }, [fetchEntries]);

  // Group entries by day using user's timezone
  const groupedByDay = useMemo(
    () => groupEntriesByDay(entriesList, settings.timezone),
    [entriesList, settings.timezone]
  );

  return {
    entries: entriesList,
    groupedByDay,
    isLoading,
    error,
    periodStart,
    refetch: fetchEntries,
  };
}
