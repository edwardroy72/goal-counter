/**
 * Period Calculation Utilities
 *
 * Pure functions for calculating period boundaries based on reset intervals.
 * Extracted from hooks for better testability and reusability.
 *
 * All calculations use UTC to ensure consistency across timezones.
 */

import { addDays, addMonths, addWeeks } from "date-fns";
import type { ResetUnit } from "../types/domain";

/**
 * Get start of day in UTC timezone
 */
function startOfDayUTC(date: Date): Date {
  const utc = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
  return utc;
}

/**
 * Normalizes mixed timestamp formats to milliseconds
 * @param value - Date object, milliseconds, or seconds timestamp
 * @returns Milliseconds since epoch
 */
export function normalizeToMilliseconds(value: number | Date): number {
  if (value instanceof Date) {
    const ms = value.getTime();
    if (isNaN(ms)) {
      throw new Error(`Invalid Date object: ${value}`);
    }
    return ms;
  }

  if (typeof value !== "number" || isNaN(value)) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  // Timestamps before year 2001 are likely in seconds, not milliseconds
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

/**
 * Calculates the start of the current period for a goal
 * @param createdAt - When the goal was created (Date or timestamp)
 * @param resetValue - Number of units between resets (e.g., 3 for "every 3 days")
 * @param resetUnit - Unit of time for reset interval
 * @param currentTime - Reference time (defaults to now, injectable for testing)
 * @returns Start of the current period
 * @throws Error if inputs are invalid
 */
export function calculatePeriodStart(
  createdAt: Date | number,
  resetValue: number,
  resetUnit: ResetUnit,
  currentTime: Date = new Date()
): Date {
  // Validate and normalize inputs
  const createdAtMs = normalizeToMilliseconds(createdAt);
  const createdAtDate = new Date(createdAtMs);

  if (isNaN(createdAtDate.getTime())) {
    throw new Error(`Invalid createdAt: ${createdAt}`);
  }

  if (!Number.isFinite(resetValue) || resetValue < 0) {
    throw new Error(`Invalid resetValue: ${resetValue}`);
  }

  if (!["day", "week", "month", "none"].includes(resetUnit)) {
    throw new Error(`Invalid resetUnit: ${resetUnit}`);
  }

  // For lifetime goals or no reset, return start of creation day (UTC)
  let currentPeriodStart = startOfDayUTC(createdAtDate);

  if (resetUnit === "none" || resetValue === 0) {
    return currentPeriodStart;
  }

  // Safety check: if creation is in the future, return it
  if (currentPeriodStart > currentTime) {
    return currentPeriodStart;
  }

  // Calculate current period by advancing from creation date
  // Use a reasonable limit based on resetValue to prevent truly infinite loops
  // while allowing for old goals
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
        // addMonths can produce times other than midnight, normalize to UTC midnight
        const tempMonth = addMonths(currentPeriodStart, resetValue);
        nextPeriodStart = startOfDayUTC(tempMonth);
        break;
      default:
        // Should never reach here due to validation above
        return currentPeriodStart;
    }

    // Stop when next period start is in the future
    if (nextPeriodStart > currentTime) {
      break;
    }

    currentPeriodStart = nextPeriodStart;
    iterations++;
  }

  if (iterations >= maxIterations) {
    throw new Error(
      `Period calculation exceeded maximum iterations (${maxIterations}). ` +
        `Goal created ${createdAtDate.toISOString()}, resetValue=${resetValue}, resetUnit=${resetUnit}. ` +
        `This likely indicates an unreasonably old creation date or large interval.`
    );
  }

  return currentPeriodStart;
}

/**
 * Calculates the end of the current period (start of next period)
 * @returns null for lifetime goals, otherwise the next reset time
 */
export function calculatePeriodEnd(
  createdAt: Date | number,
  resetValue: number,
  resetUnit: ResetUnit,
  currentTime: Date = new Date()
): Date | null {
  if (resetUnit === "none" || resetValue === 0) {
    return null; // Lifetime goals never reset
  }

  const periodStart = calculatePeriodStart(
    createdAt,
    resetValue,
    resetUnit,
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
      break;
    default:
      return null;
  }

  // Ensure we return start of day (midnight UTC) for the end date
  return startOfDayUTC(periodEnd);
}
