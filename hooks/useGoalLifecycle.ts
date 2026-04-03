import { eq } from "drizzle-orm";
import { useCallback, useState } from "react";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { goals } from "../db/schema";
import { buildDuplicateGoalValues } from "../utils/goal-duplication";

type GoalLifecycleAction =
  | "archive"
  | "unarchive"
  | "delete"
  | "duplicate"
  | null;

interface UseGoalLifecycleResult {
  isProcessing: boolean;
  activeAction: GoalLifecycleAction;
  error: Error | null;
  archiveGoal: (goalId: string) => Promise<boolean>;
  unarchiveGoal: (goalId: string) => Promise<boolean>;
  deleteGoal: (goalId: string) => Promise<boolean>;
  duplicateGoal: (goalId: string) => Promise<string | null>;
  clearError: () => void;
}

function getGoalIdError(goalId: string): Error | null {
  if (!goalId.trim()) {
    return new Error("Goal ID is required");
  }

  return null;
}

export function useGoalLifecycle(): UseGoalLifecycleResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAction, setActiveAction] = useState<GoalLifecycleAction>(null);
  const [error, setError] = useState<Error | null>(null);

  const updateGoalStatus = useCallback(
    async (
      goalId: string,
      status: "active" | "archived",
      action: Exclude<GoalLifecycleAction, "delete" | "duplicate" | null>
    ) => {
      const goalIdError = getGoalIdError(goalId);
      if (goalIdError) {
        setError(goalIdError);
        return false;
      }

      setIsProcessing(true);
      setActiveAction(action);
      setError(null);

      try {
        const values =
          status === "active"
            ? { status, sortOrder: Date.now() }
            : { status };

        await db.update(goals).set(values).where(eq(goals.id, goalId));
        queryCache.invalidate();
        return true;
      } catch (err) {
        const lifecycleError =
          err instanceof Error ? err : new Error("Failed to update goal");
        setError(lifecycleError);
        return false;
      } finally {
        setIsProcessing(false);
        setActiveAction(null);
      }
    },
    []
  );

  const archiveGoal = useCallback(
    async (goalId: string) => updateGoalStatus(goalId, "archived", "archive"),
    [updateGoalStatus]
  );

  const unarchiveGoal = useCallback(
    async (goalId: string) =>
      updateGoalStatus(goalId, "active", "unarchive"),
    [updateGoalStatus]
  );

  const deleteGoal = useCallback(async (goalId: string) => {
    const goalIdError = getGoalIdError(goalId);
    if (goalIdError) {
      setError(goalIdError);
      return false;
    }

    setIsProcessing(true);
    setActiveAction("delete");
    setError(null);

    try {
      await db.delete(goals).where(eq(goals.id, goalId));
      queryCache.invalidate();
      return true;
    } catch (err) {
      const lifecycleError =
        err instanceof Error ? err : new Error("Failed to delete goal");
        setError(lifecycleError);
        return false;
    } finally {
      setIsProcessing(false);
      setActiveAction(null);
    }
  }, []);

  const duplicateGoal = useCallback(async (goalId: string) => {
    const goalIdError = getGoalIdError(goalId);
    if (goalIdError) {
      setError(goalIdError);
      return null;
    }

    setIsProcessing(true);
    setActiveAction("duplicate");
    setError(null);

    try {
      const sourceGoals = await db
        .select()
        .from(goals)
        .where(eq(goals.id, goalId))
        .limit(1);

      const sourceGoal = sourceGoals[0];

      if (!sourceGoal) {
        const notFoundError = new Error(`Goal not found: ${goalId}`);
        setError(notFoundError);
        return null;
      }

      const [duplicatedGoal] = await db
        .insert(goals)
        .values(buildDuplicateGoalValues(sourceGoal, Date.now()))
        .returning();

      queryCache.invalidate();

      return duplicatedGoal?.id ?? null;
    } catch (err) {
      const lifecycleError =
        err instanceof Error ? err : new Error("Failed to duplicate goal");
      setError(lifecycleError);
      return null;
    } finally {
      setIsProcessing(false);
      setActiveAction(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    activeAction,
    error,
    archiveGoal,
    unarchiveGoal,
    deleteGoal,
    duplicateGoal,
    clearError,
  };
}
