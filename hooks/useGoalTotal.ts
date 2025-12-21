/**
 * useGoalTotal Hook
 *
 * Calculates and tracks the current period total for a goal.
 * Uses timezone-aware period calculations based on user settings.
 * Automatically refetches when data changes via cache invalidation.
 */

import { and, eq, gte, sum } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";
import type { Goal } from "../types/domain";
import { calculatePeriodStartInTimezone } from "../utils/timezone-utils";

/**
 * Hook to calculate the current period total for a goal
 * @param goal - Goal to calculate total for
 * @returns Current period total (number)
 */
export function useGoalTotal(goal: Goal): number {
  const [total, setTotal] = useState<number>(0);
  const { settings } = useSettings();

  // Provide defaults for nullable fields
  const resetValue = goal.resetValue ?? 1;
  const resetUnit = goal.resetUnit ?? "day";
  const createdAt = goal.createdAt ?? new Date();

  // Calculate the start of the current period using user's timezone
  // Memoized to prevent unnecessary recalculation
  const periodStart = useMemo(() => {
    try {
      const createdAtDate =
        createdAt instanceof Date ? createdAt : new Date(createdAt);
      return calculatePeriodStartInTimezone(
        createdAtDate,
        resetValue,
        resetUnit,
        settings.timezone
      );
    } catch (error) {
      // Log error but don't crash - fallback to returning 0
      console.error("[useGoalTotal] Error calculating period start:", error, {
        goalId: goal.id,
        createdAt,
        resetValue,
        resetUnit,
        timezone: settings.timezone,
      });
      // Return a safe fallback (current time)
      return new Date();
    }
  }, [goal.id, createdAt, resetValue, resetUnit, settings.timezone]);

  // Fetch the total from database
  const fetchTotal = useCallback(async () => {
    try {
      if (process.env.NODE_ENV !== "test") {
        console.log(
          "[useGoalTotal] Fetching for goal:",
          goal.id.substring(0, 8)
        );
        console.log("[useGoalTotal] Period start:", periodStart.toISOString());
      }

      const result = await db
        .select({ total: sum(entries.amount) })
        .from(entries)
        .where(
          and(
            eq(entries.goalId, goal.id),
            gte(entries.timestamp, periodStart) // Compare timestamps as Date
          )
        );

      const newTotal = Number(result?.[0]?.total ?? 0);

      if (process.env.NODE_ENV !== "test") {
        console.log("[useGoalTotal] Fetched total:", newTotal);
      }

      setTotal(newTotal);
    } catch (err) {
      console.error("[useGoalTotal] Error fetching total:", err);
      setTotal(0);
    }
  }, [goal.id, periodStart]);

  // Initial fetch on mount
  useEffect(() => {
    if (process.env.NODE_ENV !== "test") {
      console.log("[useGoalTotal] Initial fetch for goal:", goal.id);
    }
    fetchTotal();
  }, [fetchTotal]);

  // Subscribe to cache invalidation events and refetch
  useEffect(() => {
    if (process.env.NODE_ENV !== "test") {
      console.log(
        "[useGoalTotal] Subscribing to query cache for goal:",
        goal.id
      );
    }

    const unsubscribe = queryCache.subscribe(() => {
      if (process.env.NODE_ENV !== "test") {
        console.log(
          "[useGoalTotal] Cache invalidated, refetching for goal:",
          goal.id
        );
      }
      fetchTotal();
    });

    return () => {
      if (process.env.NODE_ENV !== "test") {
        console.log(
          "[useGoalTotal] Unsubscribing from query cache for goal:",
          goal.id
        );
      }
      unsubscribe();
    };
  }, [goal.id, fetchTotal]);

  return total;
}
