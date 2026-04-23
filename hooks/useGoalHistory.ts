/**
 * useGoalHistory Hook
 *
 * Fetches paginated entries for a goal and groups the loaded history:
 * 1. First by period
 * 2. Then by day within each period
 *
 * This is used for the full ledger/history view.
 */

import { addDays, addMonths, addWeeks } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";
import type { Entry, Goal, GoalType, ResetUnit } from "../types/domain";
import {
  calculatePeriodStartInTimezone,
  formatDateInTimezone,
  formatDisplayDateInTimezone,
  getDateKeyInTimezone,
  startOfDayInTimezone,
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
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

interface HistoryCursor {
  timestamp: Date;
  id: string;
}

const HISTORY_PAGE_SIZE = 50;

/**
 * Calculate all period boundaries from goal creation to now
 */
function calculateAllPeriods(
  createdAt: Date,
  resetValue: number,
  resetUnit: ResetUnit,
  timezone: string,
  startReference: Date = createdAt,
  endReference: Date = new Date()
): { start: Date; end: Date | null }[] {
  if (resetUnit === "none" || resetValue === 0) {
    // Lifetime goal - single period from creation to now
    return [
      {
        start: startOfDayInTimezone(
          startReference < createdAt ? startReference : createdAt,
          timezone
        ),
        end: null,
      },
    ];
  }

  const periods: { start: Date; end: Date | null }[] = [];

  let currentStart = getAnchoredPeriodStart(
    createdAt,
    resetValue,
    resetUnit,
    timezone,
    startReference
  );

  // Walk forward through periods until we've covered the visible history range
  while (currentStart <= endReference) {
    const nextStart = getNextPeriodStart(
      currentStart,
      resetValue,
      resetUnit,
      timezone
    );

    // If nextStart is the same or earlier, we have a problem
    if (nextStart <= currentStart) {
      periods.push({ start: currentStart, end: null });
      break;
    }

    periods.push({ start: currentStart, end: nextStart });

    if (nextStart > endReference) break;
    currentStart = nextStart;
  }

  return periods.reverse(); // Most recent first
}

function getPreviousPeriodStart(
  currentStart: Date,
  resetValue: number,
  resetUnit: ResetUnit,
  timezone: string
): Date {
  const zonedStart = toZonedTime(currentStart, timezone);

  let shiftedDate: Date;
  switch (resetUnit) {
    case "day":
      shiftedDate = addDays(zonedStart, -resetValue);
      break;
    case "week":
      shiftedDate = addWeeks(zonedStart, -resetValue);
      break;
    case "month":
      shiftedDate = addMonths(zonedStart, -resetValue);
      break;
    default:
      return currentStart;
  }

  return fromZonedTime(
    new Date(
      shiftedDate.getFullYear(),
      shiftedDate.getMonth(),
      shiftedDate.getDate(),
      0,
      0,
      0,
      0
    ),
    timezone
  );
}

function getAnchoredPeriodStart(
  createdAt: Date,
  resetValue: number,
  resetUnit: ResetUnit,
  timezone: string,
  referenceTime: Date
): Date {
  const anchorStart = startOfDayInTimezone(createdAt, timezone);

  if (referenceTime >= anchorStart) {
    return calculatePeriodStartInTimezone(
      createdAt,
      resetValue,
      resetUnit,
      timezone,
      referenceTime
    );
  }

  const maxIterations = Math.min(
    100000,
    Math.ceil((365 * 100) / Math.max(resetValue, 1))
  );
  let iterations = 0;
  let currentStart = anchorStart;

  while (currentStart > referenceTime && iterations < maxIterations) {
    const previousStart = getPreviousPeriodStart(
      currentStart,
      resetValue,
      resetUnit,
      timezone
    );

    if (previousStart >= currentStart) {
      break;
    }

    currentStart = previousStart;
    iterations++;
  }

  return currentStart;
}

/**
 * Format period label
 */
function formatPeriodLabel(
  start: Date,
  end: Date | null,
  timezone: string,
  goalType: GoalType
): string {
  if (goalType === "measurement") {
    return "All Measurements";
  }

  const startStr = formatDateInTimezone(start, timezone, "MMM d");
  if (!end) {
    return `Since ${startStr}`;
  }

  const inclusiveEnd = new Date(end.getTime() - 1);
  const endStr = formatDateInTimezone(inclusiveEnd, timezone, "MMM d");

  if (
    getDateKeyInTimezone(start, timezone) ===
    getDateKeyInTimezone(inclusiveEnd, timezone)
  ) {
    return startStr;
  }

  return `${startStr} – ${endStr}`;
}

function getNextPeriodStart(
  currentStart: Date,
  resetValue: number,
  resetUnit: ResetUnit,
  timezone: string
): Date {
  const zonedStart = toZonedTime(currentStart, timezone);

  let shiftedDate: Date;
  switch (resetUnit) {
    case "day":
      shiftedDate = addDays(zonedStart, resetValue);
      break;
    case "week":
      shiftedDate = addWeeks(zonedStart, resetValue);
      break;
    case "month":
      shiftedDate = addMonths(zonedStart, resetValue);
      break;
    default:
      return currentStart;
  }

  return fromZonedTime(
    new Date(
      shiftedDate.getFullYear(),
      shiftedDate.getMonth(),
      shiftedDate.getDate(),
      0,
      0,
      0,
      0
    ),
    timezone
  );
}

function normalizeEntry(entry: Entry): NormalizedEntry {
  return {
    ...entry,
    timestamp:
      entry.timestamp instanceof Date
        ? entry.timestamp
        : new Date(entry.timestamp),
  };
}

function compareEntriesDesc(left: NormalizedEntry, right: NormalizedEntry) {
  const timestampDifference =
    right.timestamp.getTime() - left.timestamp.getTime();

  if (timestampDifference !== 0) {
    return timestampDifference;
  }

  return right.id.localeCompare(left.id);
}

function mergeEntries(
  existingEntries: NormalizedEntry[],
  incomingEntries: NormalizedEntry[]
): NormalizedEntry[] {
  const entryMap = new Map<string, NormalizedEntry>();

  existingEntries.forEach((entry) => {
    entryMap.set(entry.id, entry);
  });

  incomingEntries.forEach((entry) => {
    entryMap.set(entry.id, entry);
  });

  return Array.from(entryMap.values()).sort(compareEntriesDesc);
}

function getNextCursor(entriesList: NormalizedEntry[]): HistoryCursor | null {
  const lastEntry = entriesList[entriesList.length - 1];

  if (!lastEntry) {
    return null;
  }

  return {
    timestamp: lastEntry.timestamp,
    id: lastEntry.id,
  };
}

async function fetchEntryById(entryId: string): Promise<NormalizedEntry | null> {
  const result = await db
    .select()
    .from(entries)
    .where(eq(entries.id, entryId))
    .limit(1);

  const entry = result[0];

  return entry ? normalizeEntry(entry) : null;
}

/**
 * Hook to fetch all entries for a goal grouped by period, then by day
 */
export function useGoalHistory(goal: Goal | null): UseGoalHistoryResult {
  const [allEntries, setAllEntries] = useState<NormalizedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<HistoryCursor | null>(null);
  const { settings } = useSettings();

  const fetchEntries = useCallback(async () => {
    if (!goal) {
      setAllEntries([]);
      setError(null);
      setIsLoading(false);
      setIsLoadingMore(false);
      setHasMore(false);
      setCursor(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await db
        .select()
        .from(entries)
        .where(eq(entries.goalId, goal.id))
        .orderBy(desc(entries.timestamp), desc(entries.id))
        .limit(HISTORY_PAGE_SIZE + 1);

      const pageEntries = result
        .slice(0, HISTORY_PAGE_SIZE)
        .map(normalizeEntry)
        .sort(compareEntriesDesc);

      setAllEntries(pageEntries);
      setCursor(getNextCursor(pageEntries));
      setHasMore(result.length > HISTORY_PAGE_SIZE);
    } catch (err) {
      console.error("[useGoalHistory] Error fetching entries:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch entries")
      );
      setAllEntries([]);
      setCursor(null);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [goal]);

  const loadMore = useCallback(async () => {
    if (!goal || !cursor || isLoading || isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setError(null);

      const result = await db
        .select()
        .from(entries)
        .where(
          and(
            eq(entries.goalId, goal.id),
            or(
              lt(entries.timestamp, cursor.timestamp),
              and(eq(entries.timestamp, cursor.timestamp), lt(entries.id, cursor.id))
            )
          )
        )
        .orderBy(desc(entries.timestamp), desc(entries.id))
        .limit(HISTORY_PAGE_SIZE + 1);

      const pageEntries = result
        .slice(0, HISTORY_PAGE_SIZE)
        .map(normalizeEntry)
        .sort(compareEntriesDesc);

      setAllEntries((existingEntries) =>
        mergeEntries(existingEntries, pageEntries)
      );
      setCursor(getNextCursor(pageEntries));
      setHasMore(result.length > HISTORY_PAGE_SIZE);
    } catch (err) {
      console.error("[useGoalHistory] Error loading more entries:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch more entries")
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, goal, hasMore, isLoading, isLoadingMore]);

  // Initial fetch
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Subscribe to cache invalidation
  useEffect(() => {
    if (!goal) {
      return;
    }

    const unsubscribe = queryCache.subscribe((event) => {
      void (async () => {
        try {
          await fetchEntries();

          if (event?.type !== "entry-updated" || !event.entryId) {
            return;
          }

          const updatedEntry = await fetchEntryById(event.entryId);

          if (!updatedEntry || updatedEntry.goalId !== goal.id) {
            return;
          }

          setAllEntries((existingEntries) =>
            mergeEntries(existingEntries, [updatedEntry])
          );
        } catch (err) {
          console.error("[useGoalHistory] Error processing cache event:", err);
        }
      })();
    });
    return unsubscribe;
  }, [fetchEntries, goal]);

  // Group entries by period, then by day
  const periods = useMemo(() => {
    if (!goal || allEntries.length === 0) return [];

    const resetValue = goal.resetValue ?? 1;
    const resetUnit = (goal.resetUnit ?? "day") as ResetUnit;
    const goalType = goal.type ?? "counter";
    const createdAt =
      goal.createdAt instanceof Date
        ? goal.createdAt
        : new Date(goal.createdAt ?? Date.now());
    const latestLoadedEntry = allEntries[0]?.timestamp ?? null;
    const oldestLoadedEntry = allEntries[allEntries.length - 1]?.timestamp ?? null;
    const historyStartReference =
      oldestLoadedEntry && oldestLoadedEntry < createdAt
        ? oldestLoadedEntry
        : createdAt;
    const historyEndReference =
      latestLoadedEntry && latestLoadedEntry > new Date()
        ? latestLoadedEntry
        : new Date();

    // Calculate all period boundaries
    const periodBounds = calculateAllPeriods(
      createdAt,
      resetValue,
      resetUnit,
      settings.timezone,
      historyStartReference,
      historyEndReference
    );

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
          goalType
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
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch: fetchEntries,
  };
}
