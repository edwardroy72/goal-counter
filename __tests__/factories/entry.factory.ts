/**
 * Entry Test Factory
 *
 * Provides typed factory functions for creating Entry objects in tests.
 * Reduces boilerplate and ensures type safety across test files.
 */

import type { Entry } from "../../types/domain";

let entryIdCounter = 1;

/**
 * Create a mock Entry with sensible defaults.
 * All properties can be overridden via the overrides parameter.
 */
export function createMockEntry(overrides: Partial<Entry> = {}): Entry {
  const id = String(entryIdCounter++);
  const now = Date.now();

  return {
    id,
    goalId: "1",
    amount: 1,
    note: null,
    timestamp: now,
    ...overrides,
  };
}

/**
 * Create an entry at a specific time (for period boundary testing)
 */
export function createEntryAt(
  timestamp: number,
  overrides: Partial<Omit<Entry, "timestamp">> = {}
): Entry {
  return createMockEntry({
    ...overrides,
    timestamp,
  });
}

/**
 * Create multiple entries for a goal
 */
export function createEntriesForGoal(
  goalId: string,
  count: number,
  baseTimestamp: number = Date.now()
): Entry[] {
  return Array.from({ length: count }, (_, i) =>
    createMockEntry({
      goalId,
      amount: 1,
      timestamp: baseTimestamp - i * 60000, // 1 minute apart
    })
  );
}

/**
 * Create entries at specific timestamps for a goal
 */
export function createEntriesAtTimestamps(
  goalId: string,
  timestamps: number[]
): Entry[] {
  return timestamps.map((timestamp) =>
    createMockEntry({
      goalId,
      timestamp,
    })
  );
}

/**
 * Reset the entry ID counter (useful in beforeEach)
 */
export function resetEntryCounter(): void {
  entryIdCounter = 1;
}
