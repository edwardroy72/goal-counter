/**
 * useGoalHistory Hook
 *
 * Fetches ALL entries for a goal (across all periods) and groups them:
 * 1. First by period
 * 2. Then by day within each period
 *
 * This is used for the full ledger/history view.
 */

import { desc, eq } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";
import type { Entry, Goal, ResetUnit } from "../types/domain";
import {
  calculatePeriodStartInTimezone,
  formatDateInTimezone,
  formatDisplayDateInTimezone,
  getDateKeyInTimezone,
} from "../utils/timezone-utils";

/**
 * Entry with normalized timestamp
 */
export interface NormalizedEntry extends Omit<Entry, "timestamp"> {
  timestamp: Date;
}

/**
 * Entries grouped by day
 */
export interface DayGroup {
  date: string;
  displayDate: string;
  entries: NormalizedEntry[];
  dayTotal: number;
}

/**
 * A period containing grouped days
 */
export interface PeriodGroup {
  periodStart: Date;
  periodEnd: Date | null;
  periodLabel: string;
  isCurrentPeriod: boolean;
  days: DayGroup[];
  periodTotal: number;
}

interface UseGoalHistoryResult {
  periods: PeriodGroup[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Calculate all period boundaries from goal creation to now
 */
function calculateAllPeriods(
  createdAt: Date,
  resetValue: number,
  resetUnit: ResetUnit,
  timezone: string
): { start: Date; end: Date | null }[] {
  if (resetUnit === "none" || resetValue === 0) {
    // Lifetime goal - single period from creation to now
    return [{ start: createdAt, end: null }];
  }

  const periods: { start: Date; end: Date | null }[] = [];
  const now = new Date();

  let currentStart = calculatePeriodStartInTimezone(
    createdAt,
    resetValue,
    resetUnit,
    timezone,
    createdAt // Start from creation time
  );

  // Walk forward through periods until we're past now
  while (currentStart <= now) {
    const nextStart = calculatePeriodStartInTimezone(
      createdAt,
      resetValue,
      resetUnit,
      timezone,
      new Date(
        currentStart.getTime() +
          1000 * 60 * 60 * 24 * (resetUnit === "month" ? 32 : resetValue + 1)
      )
    );

    // If nextStart is the same or earlier, we have a problem
    if (nextStart <= currentStart) {
      periods.push({ start: currentStart, end: null });
      break;
    }

    periods.push({ start: currentStart, end: nextStart });

    if (nextStart > now) break;
    currentStart = nextStart;
  }

  return periods.reverse(); // Most recent first
}

/**
 * Format period label
 */
function formatPeriodLabel(
  start: Date,
  end: Date | null,
  timezone: string,
  isCurrentPeriod: boolean
): string {
  if (isCurrentPeriod) {
    return "Current Period";
  }

  const startStr = formatDateInTimezone(start, timezone, "MMM d");
  if (!end) {
    return `Since ${startStr}`;
  }

  const endStr = formatDateInTimezone(
    new Date(end.getTime() - 1), // End is exclusive, show last day
    timezone,
    "MMM d"
  );

  return `${startStr} – ${endStr}`;
}

/**
 * Hook to fetch all entries for a goal grouped by period, then by day
 */
export function useGoalHistory(goal: Goal | null): UseGoalHistoryResult {
  const [allEntries, setAllEntries] = useState<NormalizedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { settings } = useSettings();

  const fetchEntries = useCallback(async () => {
    if (!goal) {
      setAllEntries([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await db
        .select()
        .from(entries)
        .where(eq(entries.goalId, goal.id))
        .orderBy(desc(entries.timestamp));

      const normalized = result.map((e) => ({
        ...e,
        timestamp:
          e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp),
      }));

      setAllEntries(normalized);
    } catch (err) {
      console.error("[useGoalHistory] Error fetching entries:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch entries")
      );
      setAllEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [goal?.id]);

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

  // Group entries by period, then by day
  const periods = useMemo(() => {
    if (!goal || allEntries.length === 0) return [];

    const resetValue = goal.resetValue ?? 1;
    const resetUnit = (goal.resetUnit ?? "day") as ResetUnit;
    const createdAt =
      goal.createdAt instanceof Date
        ? goal.createdAt
        : new Date(goal.createdAt ?? Date.now());

    // Calculate all period boundaries
    const periodBounds = calculateAllPeriods(
      createdAt,
      resetValue,
      resetUnit,
      settings.timezone
    );

    const now = new Date();
    const currentPeriodStart = calculatePeriodStartInTimezone(
      createdAt,
      resetValue,
      resetUnit,
      settings.timezone
    );

    // Group entries into periods
    const result: PeriodGroup[] = [];

    for (const { start, end } of periodBounds) {
      const isCurrentPeriod = start.getTime() === currentPeriodStart.getTime();

      // Filter entries for this period
      const periodEntries = allEntries.filter((e) => {
        const ts = e.timestamp.getTime();
        return ts >= start.getTime() && (end === null || ts < end.getTime());
      });

      if (periodEntries.length === 0) continue;

      // Group by day within this period
      const dayGroups = new Map<string, NormalizedEntry[]>();

      for (const entry of periodEntries) {
        const dateKey = getDateKeyInTimezone(
          entry.timestamp,
          settings.timezone
        );
        const existing = dayGroups.get(dateKey) || [];
        dayGroups.set(dateKey, [...existing, entry]);
      }

      const days: DayGroup[] = Array.from(dayGroups.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, dayEntries]) => ({
          date,
          displayDate: formatDisplayDateInTimezone(
            new Date(date + "T12:00:00"),
            settings.timezone
          ),
          entries: dayEntries.sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
          ),
          dayTotal: dayEntries.reduce((sum, e) => sum + e.amount, 0),
        }));

      result.push({
        periodStart: start,
        periodEnd: end,
        periodLabel: formatPeriodLabel(
          start,
          end,
          settings.timezone,
          isCurrentPeriod
        ),
        isCurrentPeriod,
        days,
        periodTotal: periodEntries.reduce((sum, e) => sum + e.amount, 0),
      });
    }

    return result;
  }, [goal, allEntries, settings.timezone]);

  return {
    periods,
    isLoading,
    error,
    refetch: fetchEntries,
  };
}
