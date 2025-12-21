/**
 * Date Logic Utilities for UI Display
 *
 * Re-exports and extends period-calculation utilities for countdown display.
 * All date calculations use UTC for consistency.
 */

import { differenceInSeconds } from "date-fns";
import { calculatePeriodEnd } from "./period-calculation";

// Re-export ResetUnit from domain types for backwards compatibility
export type { ResetUnit } from "../types/domain";

/**
 * Calculates when the current goal period will end (next reset time).
 * Uses UTC-based calculation for consistency with total calculations.
 *
 * @param createdAt - When the goal was created
 * @param intervalValue - Number of units between resets
 * @param unit - Unit of time for reset interval
 * @returns Date of next reset, or null for lifetime goals
 */
export const calculateNextReset = (
  createdAt: Date,
  intervalValue: number,
  unit: "day" | "week" | "month" | "none"
): Date | null => {
  if (unit === "none" || !unit || intervalValue <= 0) return null;

  try {
    return calculatePeriodEnd(createdAt, intervalValue, unit);
  } catch (error) {
    console.error("[calculateNextReset] Error:", error);
    return null;
  }
};

/**
 * Formats the remaining time for the Home Card countdown
 */
export const getCountdownText = (nextReset: Date | null): string => {
  if (!nextReset) return "";

  const now = new Date();
  const diffInSeconds = differenceInSeconds(nextReset, now);

  if (diffInSeconds <= 0) return "Resetting...";

  const days = Math.floor(diffInSeconds / 86400);
  const hours = Math.floor((diffInSeconds % 86400) / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m remaining`;
};
