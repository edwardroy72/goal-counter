/**
 * Timezone-Aware Date Utilities
 *
 * All user-facing date calculations should use these utilities
 * to ensure correct behavior in the user's configured timezone.
 *
 * Storage: Always use UTC timestamps
 * Display/Calculation: Convert to user's timezone
 */

import { addDays, addMonths, addWeeks, differenceInSeconds } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import type { ResetUnit } from "../types/domain";

/**
 * Get the start of day in a specific timezone
 * Returns a Date object representing midnight in that timezone
 */
export function startOfDayInTimezone(date: Date, timezone: string): Date {
  // Convert to the target timezone
  const zonedDate = toZonedTime(date, timezone);
  // Create a new date at midnight in that timezone
  const midnight = new Date(
    zonedDate.getFullYear(),
    zonedDate.getMonth(),
    zonedDate.getDate(),
    0,
    0,
    0,
    0
  );
  // Convert back to UTC
  return fromZonedTime(midnight, timezone);
}

/**
 * Get the end of day in a specific timezone (23:59:59.999)
 */
export function endOfDayInTimezone(date: Date, timezone: string): Date {
  const zonedDate = toZonedTime(date, timezone);
  const endOfDay = new Date(
    zonedDate.getFullYear(),
    zonedDate.getMonth(),
    zonedDate.getDate(),
    23,
    59,
    59,
    999
  );
  return fromZonedTime(endOfDay, timezone);
}

/**
 * Check if two dates are the same day in a specific timezone
 */
export function isSameDayInTimezone(
  date1: Date,
  date2: Date,
  timezone: string
): boolean {
  const formatted1 = formatInTimeZone(date1, timezone, "yyyy-MM-dd");
  const formatted2 = formatInTimeZone(date2, timezone, "yyyy-MM-dd");
  return formatted1 === formatted2;
}

/**
 * Check if a date is today in a specific timezone
 */
export function isTodayInTimezone(date: Date, timezone: string): boolean {
  return isSameDayInTimezone(date, new Date(), timezone);
}

/**
 * Check if a date is yesterday in a specific timezone
 */
export function isYesterdayInTimezone(date: Date, timezone: string): boolean {
  const yesterday = addDays(new Date(), -1);
  return isSameDayInTimezone(date, yesterday, timezone);
}

/**
 * Format a date for display in user's timezone
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string,
  format: string
): string {
  return formatInTimeZone(date, timezone, format);
}

/**
 * Get the date key (YYYY-MM-DD) for grouping in a specific timezone
 */
export function getDateKeyInTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/**
 * Calculate period start in user's timezone
 *
 * @param createdAt - When the goal was created (UTC)
 * @param resetValue - Number of units between resets
 * @param resetUnit - Unit of time for reset interval
 * @param timezone - User's timezone
 * @param currentTime - Reference time (defaults to now)
 */
export function calculatePeriodStartInTimezone(
  createdAt: Date | number,
  resetValue: number,
  resetUnit: ResetUnit,
  timezone: string,
  currentTime: Date = new Date()
): Date {
  // Normalize createdAt to Date
  const createdAtDate =
    createdAt instanceof Date ? createdAt : new Date(createdAt);

  if (isNaN(createdAtDate.getTime())) {
    throw new Error(`Invalid createdAt: ${createdAt}`);
  }

  if (!Number.isFinite(resetValue) || resetValue < 0) {
    throw new Error(`Invalid resetValue: ${resetValue}`);
  }

  // For lifetime goals, return start of creation day in user's timezone
  if (resetUnit === "none" || resetValue === 0) {
    return startOfDayInTimezone(createdAtDate, timezone);
  }

  // Start from the creation date, normalized to midnight in user's timezone
  let currentPeriodStart = startOfDayInTimezone(createdAtDate, timezone);

  // Safety: if creation is in the future, return it
  if (currentPeriodStart > currentTime) {
    return currentPeriodStart;
  }

  // Iterate forward to find current period
  const maxIterations = Math.min(
    100000,
    Math.ceil((365 * 100) / Math.max(resetValue, 1))
  );
  let iterations = 0;

  while (iterations < maxIterations) {
    let nextPeriodStart: Date;

    switch (resetUnit) {
      case "day":
        nextPeriodStart = addDays(currentPeriodStart, resetValue);
        break;
      case "week":
        nextPeriodStart = addWeeks(currentPeriodStart, resetValue);
        break;
      case "month":
        nextPeriodStart = addMonths(currentPeriodStart, resetValue);
        // Normalize to midnight in timezone (addMonths might drift)
        nextPeriodStart = startOfDayInTimezone(nextPeriodStart, timezone);
        break;
      default:
        return currentPeriodStart;
    }

    if (nextPeriodStart > currentTime) {
      break;
    }

    currentPeriodStart = nextPeriodStart;
    iterations++;
  }

  return currentPeriodStart;
}

/**
 * Calculate period end (next reset time) in user's timezone
 */
export function calculatePeriodEndInTimezone(
  createdAt: Date | number,
  resetValue: number,
  resetUnit: ResetUnit,
  timezone: string,
  currentTime: Date = new Date()
): Date | null {
  if (resetUnit === "none" || resetValue === 0) {
    return null;
  }

  const periodStart = calculatePeriodStartInTimezone(
    createdAt,
    resetValue,
    resetUnit,
    timezone,
    currentTime
  );

  let periodEnd: Date;
  switch (resetUnit) {
    case "day":
      periodEnd = addDays(periodStart, resetValue);
      break;
    case "week":
      periodEnd = addWeeks(periodStart, resetValue);
      break;
    case "month":
      periodEnd = addMonths(periodStart, resetValue);
      periodEnd = startOfDayInTimezone(periodEnd, timezone);
      break;
    default:
      return null;
  }

  return periodEnd;
}

/**
 * Get countdown text for time remaining until reset
 */
export function getCountdownTextWithTimezone(nextReset: Date | null): string {
  if (!nextReset) return "";

  const now = new Date();
  const diffInSeconds = differenceInSeconds(nextReset, now);

  if (diffInSeconds <= 0) return "Resetting...";

  const days = Math.floor(diffInSeconds / 86400);
  const hours = Math.floor((diffInSeconds % 86400) / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return "< 1m left";
}

/**
 * Format display date with Today/Yesterday logic in user's timezone
 */
export function formatDisplayDateInTimezone(
  date: Date,
  timezone: string
): string {
  if (isTodayInTimezone(date, timezone)) {
    return "Today";
  }
  if (isYesterdayInTimezone(date, timezone)) {
    return "Yesterday";
  }
  return formatInTimeZone(date, timezone, "MMM d");
}

/**
 * Format time for display in user's timezone (HH:mm)
 */
export function formatTimeInTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "HH:mm");
}
