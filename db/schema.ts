import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// --- Enums / Constants ---
export const ResetUnit = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  NONE: "none",
} as const;

export const GoalStatus = {
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

export const GoalType = {
  COUNTER: "counter",
  MEASUREMENT: "measurement",
} as const;

// --- Tables ---

export const goals = sqliteTable("goals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  type: text("type")
    .$type<(typeof GoalType)[keyof typeof GoalType]>()
    .default("counter"),
  unit: text("unit"), // e.g., "kg", "mL"
  target: real("target"), // Float for 2-decimal precision

  // Reset Interval Logic
  resetValue: integer("reset_value").default(1),
  resetUnit: text("reset_unit")
    .$type<(typeof ResetUnit)[keyof typeof ResetUnit]>()
    .default("day"),
  rollingWindowValue: integer("rolling_window_value"),
  rollingWindowUnit: text("rolling_window_unit")
    .$type<Exclude<(typeof ResetUnit)[keyof typeof ResetUnit], "none">>(),

  // Quick Add Slots (Index 0 is required, others optional)
  quickAdd1: real("quick_add_1").notNull(),
  quickAdd2: real("quick_add_2"),
  quickAdd3: real("quick_add_3"),
  quickAdd4: real("quick_add_4"),

  // Meta & UI
  sortOrder: integer("sort_order").notNull(),
  status: text("status")
    .$type<(typeof GoalStatus)[keyof typeof GoalStatus]>()
    .default("active"),
  timezone: text("timezone").default("UTC"), // For "Source of Truth" logic
  // IMPORTANT: Existing data stores milliseconds (from `strftime('%s', 'now') * 1000`).
  // Use mode: "timestamp_ms" to correctly interpret milliseconds as Date objects.
  // New goals will also store milliseconds via the SQL default.
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(strftime('%s', 'now') * 1000)`
  ),
});

export const entries = sqliteTable("entries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  note: text("note"),
  // Timestamp is stored as seconds - Drizzle mode: "timestamp" expects seconds
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
});

export const historySnapshots = sqliteTable("history_snapshots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  totalAchieved: real("total_achieved").notNull(),
  targetAtTime: real("target_at_time"), // Snapshot of target to prevent historical drift
  periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp" }).notNull(),
});

// --- Relations ---

export const goalsRelations = relations(goals, ({ many }) => ({
  entries: many(entries),
  history: many(historySnapshots),
}));

export const entriesRelations = relations(entries, ({ one }) => ({
  goal: one(goals, {
    fields: [entries.goalId],
    references: [goals.id],
  }),
}));

export const historyRelations = relations(historySnapshots, ({ one }) => ({
  goal: one(goals, {
    fields: [historySnapshots.goalId],
    references: [goals.id],
  }),
}));
