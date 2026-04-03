import { and, eq, gte, lt } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";
import {
  countGoalRollingPeriodsWithEntries,
  createGoalRollingSummary,
  getGoalRollingWindow,
  type GoalRollingSummary,
} from "../services/goal-analytics";
import type { Goal } from "../types/domain";

interface UseGoalRollingSummaryOptions {
  enabled?: boolean;
  countEmptyPeriods?: boolean;
  periodCount?: number | null;
  now?: Date;
}

interface UseGoalRollingSummaryResult {
  summary: GoalRollingSummary | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGoalRollingSummary(
  goal: Goal | null,
  options: UseGoalRollingSummaryOptions = {}
): UseGoalRollingSummaryResult {
  const enabled = options.enabled ?? true;
  const countEmptyPeriods = options.countEmptyPeriods ?? false;
  const [nowReference] = useState(() => options.now ?? new Date());
  const [windowEntries, setWindowEntries] = useState<
    { amount: number; timestamp: Date | number }[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(enabled && goal !== null);
  const [error, setError] = useState<Error | null>(null);
  const { settings } = useSettings();
  const goalId = goal?.id ?? null;
  const goalCreatedAt = goal?.createdAt ?? null;
  const goalTarget = goal?.target ?? null;
  const goalResetValue = goal?.resetValue ?? null;
  const goalResetUnit = goal?.resetUnit ?? null;
  const goalRollingWindowValue = goal?.rollingWindowValue ?? null;
  const goalRollingWindowUnit = goal?.rollingWindowUnit ?? null;
  const selectedPeriodCount = options.periodCount ?? null;

  const window = useMemo(() => {
    if (!goalId || !enabled || !goalResetUnit) {
      return null;
    }

    return getGoalRollingWindow({
      goal: {
        createdAt: goalCreatedAt,
        target: goalTarget,
        resetValue: goalResetValue,
        resetUnit: goalResetUnit,
        rollingWindowValue: goalRollingWindowValue,
        rollingWindowUnit: goalRollingWindowUnit,
      },
      periodCount: selectedPeriodCount,
      timezone: settings.timezone,
      now: nowReference,
    });
  }, [
    enabled,
    goalCreatedAt,
    goalId,
    goalResetUnit,
    goalResetValue,
    goalRollingWindowUnit,
    goalRollingWindowValue,
    goalTarget,
    nowReference,
    selectedPeriodCount,
    settings.timezone,
  ]);

  const fetchSummary = useCallback(async () => {
    if (!goalId || !enabled || !window) {
      setWindowEntries(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await db
        .select({
          amount: entries.amount,
          timestamp: entries.timestamp,
        })
        .from(entries)
        .where(
          and(
            eq(entries.goalId, goalId),
            gte(entries.timestamp, window.windowStart),
            lt(entries.timestamp, window.windowEnd)
          )
        );

      setWindowEntries(result);
    } catch (err) {
      setWindowEntries(null);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch rolling summary")
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, goalId, window]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!goalId || !enabled || !window) {
      return;
    }

    const unsubscribe = queryCache.subscribe(() => {
      void fetchSummary();
    });

    return unsubscribe;
  }, [enabled, fetchSummary, goalId, window]);

  const summary = useMemo(() => {
    if (!window || windowEntries === null) {
      return null;
    }

    const actualTotal = windowEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0
    );
    const comparedPeriodCount = countEmptyPeriods
      ? window.periodCount
      : countGoalRollingPeriodsWithEntries({
          goal: {
            createdAt: goalCreatedAt,
            target: goalTarget,
            resetValue: goalResetValue,
            resetUnit: goalResetUnit,
            rollingWindowValue: goalRollingWindowValue,
            rollingWindowUnit: goalRollingWindowUnit,
          },
          entries: windowEntries,
          window,
          timezone: settings.timezone,
        });

    return createGoalRollingSummary(window, actualTotal, comparedPeriodCount);
  }, [
    countEmptyPeriods,
    goalCreatedAt,
    goalResetUnit,
    goalResetValue,
    goalRollingWindowUnit,
    goalRollingWindowValue,
    goalTarget,
    settings.timezone,
    window,
    windowEntries,
  ]);

  return {
    summary,
    isLoading,
    error,
    refetch: fetchSummary,
  };
}
