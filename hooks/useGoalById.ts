/**
 * useGoalById Hook
 *
 * Fetches a single goal by ID with automatic cache invalidation subscription.
 * Returns loading/error states for proper UI handling.
 */

import { eq } from "drizzle-orm";
import { useCallback, useEffect, useState } from "react";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { goals } from "../db/schema";
import type { Goal } from "../types/domain";

interface UseGoalByIdResult {
  goal: Goal | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch a single goal by ID
 * @param goalId - The ID of the goal to fetch
 * @returns Goal data, loading state, error state, and refetch function
 */
export function useGoalById(goalId: string): UseGoalByIdResult {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGoal = useCallback(async () => {
    if (!goalId) {
      setGoal(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await db
        .select()
        .from(goals)
        .where(eq(goals.id, goalId))
        .limit(1);

      if (result.length === 0) {
        setGoal(null);
        setError(new Error(`Goal not found: ${goalId}`));
      } else {
        setGoal(result[0]);
      }
    } catch (err) {
      console.error("[useGoalById] Error fetching goal:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch goal"));
      setGoal(null);
    } finally {
      setIsLoading(false);
    }
  }, [goalId]);

  // Initial fetch on mount or when goalId changes
  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  // Subscribe to cache invalidation for updates
  useEffect(() => {
    const unsubscribe = queryCache.subscribe(() => {
      fetchGoal();
    });

    return unsubscribe;
  }, [fetchGoal]);

  return { goal, isLoading, error, refetch: fetchGoal };
}
