/**
 * Core domain types for the goal tracking system
 * These types define the contract between UI, business logic, and data layer
 */

export type ResetUnit = "day" | "week" | "month" | "none";

export type GoalStatus = "active" | "archived";

/**
 * Goal entity as stored in database
 *
 * Note: Some fields are nullable because Drizzle schema has .default()
 * but not .notNull(), which results in nullable types at the TS level.
 * In practice these will always have values due to defaults.
 */
export interface Goal {
  id: string;
  title: string;
  unit: string | null;
  target: number | null;

  // Reset configuration (nullable in schema due to defaults without notNull)
  resetValue: number | null;
  resetUnit: ResetUnit | null;

  // Quick add button values
  quickAdd1: number;
  quickAdd2: number | null;
  quickAdd3: number | null;
  quickAdd4: number | null;

  // Metadata
  sortOrder: number;
  status: GoalStatus | null;
  createdAt: Date | number | null; // Support both Date objects and timestamps
}

/**
 * Entry entity as stored in database
 */
export interface Entry {
  id: string;
  goalId: string;
  amount: number;
  note: string | null;
  timestamp: Date | number; // Support both Date objects and timestamps
}

/**
 * Period calculation result
 */
export interface Period {
  start: Date;
  end: Date | null; // null for "none" (lifetime) goals
}

/**
 * Goal summary for display
 */
export interface GoalSummary {
  goal: Goal;
  currentTotal: number;
  periodStart: Date;
  nextReset: Date | null;
}
