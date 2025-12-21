import { addDays, addMonths, addWeeks, startOfDay } from "date-fns";
import { and, eq, gte, sum } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";

/**
 * Pure function to calculate the period start given a goal creation time and current time.
 * Deterministic: same inputs always yield same output.
 */
function calculatePeriodStart(
  createdAt: Date,
  resetValue: number,
  resetUnit: string
): Date {
  let currentPeriodStart = startOfDay(createdAt);

  if (resetUnit === "none" || resetValue <= 0) {
    return currentPeriodStart;
  }

  const now = new Date();

  while (true) {
    let nextPeriodStart: Date;
    if (resetUnit === "day")
      nextPeriodStart = addDays(currentPeriodStart, resetValue);
    else if (resetUnit === "week")
      nextPeriodStart = addWeeks(currentPeriodStart, resetValue);
    else if (resetUnit === "month")
      nextPeriodStart = addMonths(currentPeriodStart, resetValue);
    else break;

    if (nextPeriodStart > now) break;
    currentPeriodStart = nextPeriodStart;
  }

  return currentPeriodStart;
}

export function useGoalTotal(goal: any) {
  const [total, setTotal] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Normalize mixed timestamp units (seconds vs ms) to milliseconds
  const normalizeMs = (value: number | Date) => {
    if (value instanceof Date) return value.getTime();
    return value < 1_000_000_000_000 ? value * 1000 : value;
  };

  // Memoize period start to prevent unnecessary query changes
  const periodStart = useMemo(() => {
    const startAt = new Date(normalizeMs(goal.createdAt));
    return calculatePeriodStart(startAt, goal.resetValue || 1, goal.resetUnit);
  }, [goal.id, goal.createdAt, goal.resetValue, goal.resetUnit]);

  // Manual fetch function
  const fetchTotal = useCallback(async () => {
    try {
      const periodStartMs = periodStart.getTime();
      console.log("[useGoalTotal] Fetching total for goal:", goal.id);
      console.log("[useGoalTotal] Period start (Date):", periodStart.toISOString());
      console.log("[useGoalTotal] Period start (ms):", periodStartMs);
      console.log("[useGoalTotal] Current time (ms):", Date.now());
      
      const result = await db
        .select({ total: sum(entries.amount) })
        .from(entries)
        .where(
          and(
            eq(entries.goalId, goal.id),
            gte(entries.timestamp, periodStartMs) // Use milliseconds for comparison
          )
        );

      const newTotal = Number(result?.[0]?.total ?? 0);
      console.log("[useGoalTotal] Fetched total for goal", goal.id, ":", newTotal);
      console.log("[useGoalTotal] Raw SQL result:", result);
      
      // Debug logging: if total is 0, check if there are any entries at all
      if (newTotal === 0 && process.env.NODE_ENV !== 'test') {
        try {
          const allEntries = await db
            .select()
            .from(entries)
            .where(eq(entries.goalId, goal.id));
          
          if (allEntries.length > 0) {
            const tsValue = allEntries[0].timestamp;
            console.warn("[useGoalTotal] WARNING: Found", allEntries.length, "entries but total is 0");
            console.warn("[useGoalTotal] Sample entry:", {
              timestampRaw: tsValue,
              timestampType: typeof tsValue,
              periodStartMs,
              isAfterPeriodStart: typeof tsValue === 'number' ? tsValue >= periodStartMs : 'N/A'
            });
          }
        } catch (debugError) {
          // Ignore debug query errors in tests
        }
      }
      
      setTotal(newTotal);
    } catch (err) {
      console.error("[useGoalTotal] Error fetching total:", err);
      setTotal(0);
    }
  }, [goal.id, periodStart]);

  // Initial fetch
  useEffect(() => {
    console.log("[useGoalTotal] Initial fetch for goal:", goal.id);
    fetchTotal();
  }, [fetchTotal]);

  // Subscribe to cache invalidation events and refetch
  useEffect(() => {
    console.log("[useGoalTotal] Subscribing to query cache for goal:", goal.id);
    const unsubscribe = queryCache.subscribe(() => {
      console.log("[useGoalTotal] Cache invalidated, refetching for goal:", goal.id);
      fetchTotal();
    });
    return () => {
      console.log("[useGoalTotal] Unsubscribing from query cache for goal:", goal.id);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal.id]); // Only re-subscribe when goal changes, not when fetchTotal changes

  return total;
}
