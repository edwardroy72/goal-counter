/**
 * Test Factory: Goal
 *
 * Creates properly typed Goal objects for testing.
 * Reduces boilerplate and ensures consistent test data.
 */

import type { Goal, GoalStatus, ResetUnit } from "../../types/domain";

let goalCounter = 0;

/**
 * Creates a mock Goal object with all required fields
 * @param overrides - Partial Goal to override defaults
 * @returns Complete Goal object
 */
export function createMockGoal(overrides: Partial<Goal> = {}): Goal {
  goalCounter++;
  const now = new Date("2025-01-01T00:00:00Z");

  return {
    id: `goal-${goalCounter}`,
    title: `Test Goal ${goalCounter}`,
    unit: "units",
    target: 100,
    resetValue: 1,
    resetUnit: "day" as ResetUnit,
    quickAdd1: 10,
    quickAdd2: null,
    quickAdd3: null,
    quickAdd4: null,
    sortOrder: goalCounter,
    status: "active" as GoalStatus,
    createdAt: now,
    ...overrides,
  };
}

/**
 * Creates a daily goal (resets every day)
 */
export function createDailyGoal(overrides: Partial<Goal> = {}): Goal {
  return createMockGoal({
    resetValue: 1,
    resetUnit: "day",
    ...overrides,
  });
}

/**
 * Creates a weekly goal (resets every week)
 */
export function createWeeklyGoal(overrides: Partial<Goal> = {}): Goal {
  return createMockGoal({
    resetValue: 1,
    resetUnit: "week",
    ...overrides,
  });
}

/**
 * Creates a monthly goal (resets every month)
 */
export function createMonthlyGoal(overrides: Partial<Goal> = {}): Goal {
  return createMockGoal({
    resetValue: 1,
    resetUnit: "month",
    ...overrides,
  });
}

/**
 * Creates a lifetime goal (never resets)
 */
export function createLifetimeGoal(overrides: Partial<Goal> = {}): Goal {
  return createMockGoal({
    resetValue: 0,
    resetUnit: "none",
    ...overrides,
  });
}

/**
 * Reset the goal counter (call in beforeEach for predictable IDs)
 */
export function resetGoalCounter(): void {
  goalCounter = 0;
}
