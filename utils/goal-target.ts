import type { GoalTargetType } from "../types/domain";

export type GoalTargetStatus = "under" | "over" | "on-pace";

export function normalizeGoalTargetType(
  targetType: GoalTargetType | null | undefined
): GoalTargetType {
  return targetType === "max" ? "max" : "min";
}

export function formatGoalTargetTypeLabel(
  targetType: GoalTargetType | null | undefined
): string {
  return normalizeGoalTargetType(targetType) === "max" ? "Max" : "Min";
}

export function getGoalTargetStatus(
  actual: number,
  target: number
): GoalTargetStatus {
  if (actual === target) {
    return "on-pace";
  }

  return actual > target ? "over" : "under";
}

export function isGoalTargetMet(
  actual: number,
  target: number,
  targetType: GoalTargetType | null | undefined
): boolean {
  const normalizedTargetType = normalizeGoalTargetType(targetType);
  return normalizedTargetType === "min" ? actual >= target : actual <= target;
}
