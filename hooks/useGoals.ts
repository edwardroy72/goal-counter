import { asc, eq, isNull, or } from "drizzle-orm";
import { useCallback, useEffect, useState } from "react";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { goals } from "../db/schema";
import type { Goal, GoalStatus } from "../types/domain";

type GoalFilterStatus = GoalStatus | "all";

interface UseGoalsOptions {
  status?: GoalFilterStatus;
  enabled?: boolean;
}

interface UseGoalsResult {
  goals: Goal[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function getStatusWhereClause(status: GoalFilterStatus) {
  switch (status) {
    case "active":
      return or(eq(goals.status, "active"), isNull(goals.status));
    case "archived":
      return eq(goals.status, "archived");
    case "all":
      return null;
  }
}

export function useGoals(options: UseGoalsOptions = {}): UseGoalsResult {
  const status = options.status ?? "all";
  const enabled = options.enabled ?? true;
  const [goalList, setGoalList] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!enabled) {
      setGoalList([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const statusWhereClause = getStatusWhereClause(status);
      const query = db.select().from(goals);
      const filteredQuery = statusWhereClause
        ? query.where(statusWhereClause)
        : query;
      const result = await filteredQuery.orderBy(
        asc(goals.sortOrder),
        asc(goals.createdAt)
      );

      setGoalList(result);
    } catch (err) {
      console.error("[useGoals] Error fetching goals:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch goals"));
      setGoalList([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, status]);

  useEffect(() => {
    void fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribe = queryCache.subscribe(() => {
      void fetchGoals();
    });

    return unsubscribe;
  }, [enabled, fetchGoals]);

  return {
    goals: goalList,
    isLoading,
    error,
    refetch: fetchGoals,
  };
}
