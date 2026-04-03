import { eq } from "drizzle-orm";
import { useCallback, useState } from "react";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { goals } from "../db/schema";
import type { Goal } from "../types/domain";

export type GoalMoveDirection = "up" | "down";

interface UseGoalOrderingResult {
  isProcessing: boolean;
  movingGoalId: string | null;
  movingDirection: GoalMoveDirection | null;
  error: Error | null;
  moveGoal: (
    goalList: Goal[],
    goalId: string,
    direction: GoalMoveDirection
  ) => Promise<boolean>;
  clearError: () => void;
}

export function useGoalOrdering(): UseGoalOrderingResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [movingGoalId, setMovingGoalId] = useState<string | null>(null);
  const [movingDirection, setMovingDirection] =
    useState<GoalMoveDirection | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const moveGoal = useCallback(
    async (
      goalList: Goal[],
      goalId: string,
      direction: GoalMoveDirection
    ): Promise<boolean> => {
      const currentIndex = goalList.findIndex((goal) => goal.id === goalId);
      if (currentIndex === -1) {
        return false;
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= goalList.length) {
        return false;
      }

      const currentGoal = goalList[currentIndex];
      const targetGoal = goalList[targetIndex];

      setIsProcessing(true);
      setMovingGoalId(goalId);
      setMovingDirection(direction);
      setError(null);

      try {
        await db
          .update(goals)
          .set({ sortOrder: targetGoal.sortOrder })
          .where(eq(goals.id, currentGoal.id));
        await db
          .update(goals)
          .set({ sortOrder: currentGoal.sortOrder })
          .where(eq(goals.id, targetGoal.id));

        queryCache.invalidate();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to reorder goals")
        );
        return false;
      } finally {
        setIsProcessing(false);
        setMovingGoalId(null);
        setMovingDirection(null);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    movingGoalId,
    movingDirection,
    error,
    moveGoal,
    clearError,
  };
}
