import {
  addDays,
  addMonths,
  addWeeks,
  differenceInSeconds,
  startOfDay,
} from "date-fns";

export type ResetUnit = "day" | "week" | "month" | "none";

/**
 * Calculates the exact midnight when a goal should reset.
 * Logic: Creation day is "Day 1". Reset is at 11:59:59 PM of the final day.
 */
export const calculateNextReset = (
  createdAt: Date,
  intervalValue: number,
  unit: ResetUnit
): Date | null => {
  if (unit === "none" || !unit) return null;

  // We anchor to the very start of the day the goal was created
  const anchorDate = startOfDay(createdAt);
  let resetDate: Date;

  switch (unit) {
    case "day":
      resetDate = addDays(anchorDate, intervalValue);
      break;
    case "week":
      resetDate = addWeeks(anchorDate, intervalValue);
      break;
    case "month":
      resetDate = addMonths(anchorDate, intervalValue);
      break;
    default:
      return null;
  }

  // The result is the "Midnight" at the start of the day following the interval
  return resetDate;
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
