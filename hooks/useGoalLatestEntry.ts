import { desc, eq } from "drizzle-orm";
import { useCallback, useEffect, useState } from "react";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";
import type { Entry } from "../types/domain";

interface UseGoalLatestEntryOptions {
  enabled?: boolean;
}

interface UseGoalLatestEntryResult {
  latestEntry: Entry | null;
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

export function useGoalLatestEntry(
  goalId: string,
  options: UseGoalLatestEntryOptions = {}
): UseGoalLatestEntryResult {
  const enabled = options.enabled ?? true;
  const [latestEntry, setLatestEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(enabled && goalId.length > 0);
  const [error, setError] = useState<Error | null>(null);

  const fetchLatestEntry = useCallback(async () => {
    if (!enabled || !goalId) {
      setLatestEntry(null);
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
        .where(eq(entries.goalId, goalId))
        .orderBy(desc(entries.timestamp), desc(entries.id))
        .limit(1);

      setLatestEntry(result[0] ? normalizeEntry(result[0]) : null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch latest entry")
      );
      setLatestEntry(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, goalId]);

  useEffect(() => {
    void fetchLatestEntry();
  }, [fetchLatestEntry]);

  useEffect(() => {
    if (!enabled || !goalId) {
      return;
    }

    const unsubscribe = queryCache.subscribe(() => {
      void fetchLatestEntry();
    });

    return unsubscribe;
  }, [enabled, fetchLatestEntry, goalId]);

  return {
    latestEntry,
    isLoading,
    error,
    refetch: fetchLatestEntry,
  };
}
