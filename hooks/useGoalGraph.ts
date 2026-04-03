import { and, desc, eq, gte, lt } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";
import {
  getGoalGraphWindow,
  shapeGoalGraphData,
  type GoalGraphData,
  type GoalGraphRange,
} from "../services/goal-analytics";
import type { Entry, Goal } from "../types/domain";

interface UseGoalGraphOptions {
  enabled?: boolean;
  now?: Date;
}

interface UseGoalGraphResult {
  graph: GoalGraphData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function normalizeEntry(entry: Entry): Entry {
  return {
    ...entry,
    timestamp:
      entry.timestamp instanceof Date
        ? entry.timestamp
        : new Date(entry.timestamp),
  };
}

export function useGoalGraph(
  goal: Goal | null,
  range: GoalGraphRange,
  options: UseGoalGraphOptions = {}
): UseGoalGraphResult {
  const enabled = options.enabled ?? true;
  const [nowReference] = useState(() => options.now ?? new Date());
  const [graphEntries, setGraphEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(enabled && goal !== null);
  const [error, setError] = useState<Error | null>(null);
  const { settings } = useSettings();
  const goalId = goal?.id ?? null;
  const goalTarget = goal?.target ?? null;
  const goalCreatedAt = goal?.createdAt ?? null;
  const goalType = goal?.type ?? "counter";

  const window = useMemo(() => {
    if (!goalId || !enabled) {
      return null;
    }

    return getGoalGraphWindow({
      range,
      timezone: settings.timezone,
      now: nowReference,
      createdAt:
        goalCreatedAt instanceof Date
          ? goalCreatedAt
          : goalCreatedAt
            ? new Date(goalCreatedAt)
            : null,
    });
  }, [enabled, goalCreatedAt, goalId, nowReference, range, settings.timezone]);

  const fetchEntries = useCallback(async () => {
    if (!goalId || !enabled || !window) {
      setGraphEntries([]);
      setError(null);
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
          and(
            eq(entries.goalId, goalId),
            gte(entries.timestamp, window.rangeStart),
            lt(entries.timestamp, window.rangeEnd)
          )
        )
        .orderBy(desc(entries.timestamp));

      setGraphEntries(result.map(normalizeEntry));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch graph"));
      setGraphEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, goalId, window]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (!goalId || !enabled) {
      return;
    }

    const unsubscribe = queryCache.subscribe(() => {
      void fetchEntries();
    });

    return unsubscribe;
  }, [enabled, fetchEntries, goalId]);

  const graph = useMemo(() => {
    if (!goalId || !enabled) {
      return null;
    }

    return shapeGoalGraphData({
      entries: graphEntries,
      range,
      timezone: settings.timezone,
      now: nowReference,
      target: goalTarget,
      goal: {
        createdAt: goalCreatedAt,
        type: goalType,
      },
    });
  }, [
    enabled,
    goalCreatedAt,
    goalId,
    goalTarget,
    goalType,
    graphEntries,
    nowReference,
    range,
    settings.timezone,
  ]);

  return {
    graph,
    isLoading,
    error,
    refetch: fetchEntries,
  };
}
