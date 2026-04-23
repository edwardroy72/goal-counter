import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import type {
  Entry,
  Goal,
  GoalType,
  ResetUnit,
  RollingWindowUnit,
} from "../types/domain";
import {
  calculatePeriodEndInTimezone,
  calculatePeriodStartInTimezone,
  startOfDayInTimezone,
} from "../utils/timezone-utils";

export type GoalGraphRange = "7d" | "30d" | "90d" | "6m" | "1y" | "max";

export interface GoalGraphPoint {
  bucketStart: Date;
  value: number;
  hasEntries?: boolean;
}

export interface GoalGraphData {
  points: GoalGraphPoint[];
  range: GoalGraphRange;
  target: number | null;
  goalType: GoalType;
  hasData: boolean;
  xDomainStart: Date;
  xDomainEnd: Date;
}

export interface GoalGraphWindow {
  bucketKeys: string[] | null;
  bucketStarts: Date[] | null;
  rangeStart: Date;
  rangeEnd: Date;
}

type GraphEntry = Pick<Entry, "amount" | "timestamp">;
type GraphGoal = Pick<Goal, "createdAt" | "type">;
type RollingEntry = Pick<Entry, "amount" | "timestamp">;
type RollingGoal = Pick<
  Goal,
  | "createdAt"
  | "target"
  | "resetValue"
  | "resetUnit"
  | "rollingWindowValue"
  | "rollingWindowUnit"
>;

export interface GoalRollingWindow {
  windowStart: Date;
  windowEnd: Date;
  targetPerPeriod: number;
  expectedTotal: number;
  windowValue: number;
  windowUnit: RollingWindowUnit;
  periodCount: number;
}

export interface GoalRollingSummary extends GoalRollingWindow {
  actualTotal: number;
  comparedPeriodCount: number;
  delta: number;
  status: "under" | "over" | "on-pace";
}

const RANGE_BUCKET_COUNTS: Record<GoalGraphRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "6m": 0,
  "1y": 0,
  max: 0,
};

const ROLLING_PERIOD_PRESET_COUNTS: Record<RollingWindowUnit, readonly number[]> = {
  day: [7, 30, 90, 365],
  week: [2, 4, 12, 26, 52],
  month: [3, 6, 12, 24],
};

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeEntryTimestamp(timestamp: Entry["timestamp"]): Date {
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
}

function getLocalDateKey(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function createBucketStart(dateKey: string, timezone: string): Date {
  return fromZonedTime(`${dateKey}T00:00:00`, timezone);
}

function shiftBoundaryInTimezone(
  date: Date,
  amount: number,
  unit: RollingWindowUnit,
  timezone: string
): Date {
  const zonedDate = toZonedTime(date, timezone);

  let shifted: Date;
  switch (unit) {
    case "day":
      shifted = addDays(zonedDate, amount);
      break;
    case "week":
      shifted = addWeeks(zonedDate, amount);
      break;
    case "month":
      shifted = addMonths(zonedDate, amount);
      break;
  }

  const localMidnight = new Date(
    shifted.getFullYear(),
    shifted.getMonth(),
    shifted.getDate(),
    0,
    0,
    0,
    0
  );

  return fromZonedTime(localMidnight, timezone);
}

function getAnchoredRollingPeriodStart(input: {
  createdAt: Date | number | null | undefined;
  resetValue: number;
  resetUnit: Exclude<ResetUnit, "none">;
  timezone: string;
  referenceTime: Date;
}): Date {
  const createdAt =
    input.createdAt instanceof Date
      ? input.createdAt
      : input.createdAt
        ? new Date(input.createdAt)
        : new Date();
  const anchorStart = startOfDayInTimezone(createdAt, input.timezone);

  if (input.referenceTime >= anchorStart) {
    return calculatePeriodStartInTimezone(
      createdAt,
      input.resetValue,
      input.resetUnit,
      input.timezone,
      input.referenceTime
    );
  }

  const maxIterations = Math.min(
    100000,
    Math.ceil((365 * 100) / Math.max(input.resetValue, 1))
  );
  let iterations = 0;
  let currentStart = anchorStart;

  while (currentStart > input.referenceTime && iterations < maxIterations) {
    const previousStart = shiftBoundaryInTimezone(
      currentStart,
      -input.resetValue,
      input.resetUnit,
      input.timezone
    );

    if (previousStart >= currentStart) {
      break;
    }

    currentStart = previousStart;
    iterations++;
  }

  return currentStart;
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const cursor = new Date(Date.UTC(year, month - 1, day));
  cursor.setUTCDate(cursor.getUTCDate() + days);

  return [
    cursor.getUTCFullYear(),
    padDatePart(cursor.getUTCMonth() + 1),
    padDatePart(cursor.getUTCDate()),
  ].join("-");
}

function getDateKeyFromZonedDate(date: Date): string {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

function buildDateKeysBetween(startDateKey: string, endDateKey: string): string[] {
  const bucketKeys: string[] = [];
  let cursor = startDateKey;

  while (cursor <= endDateKey) {
    bucketKeys.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }

  return bucketKeys;
}

function getExtendedRangeStartKey(input: {
  range: Extract<GoalGraphRange, "6m" | "1y" | "max">;
  timezone: string;
  now: Date;
  createdAt?: Date | null;
}) {
  const zonedNow = toZonedTime(input.now, input.timezone);

  switch (input.range) {
    case "6m":
      return getDateKeyFromZonedDate(addMonths(zonedNow, -6));
    case "1y":
      return getDateKeyFromZonedDate(addYears(zonedNow, -1));
    case "max": {
      const createdAt = input.createdAt ?? input.now;
      const createdAtDate =
        createdAt instanceof Date ? createdAt : new Date(createdAt);
      return getLocalDateKey(createdAtDate, input.timezone);
    }
  }
}

export function getGoalGraphWindow(input: {
  range: GoalGraphRange;
  timezone: string;
  now?: Date;
  createdAt?: Date | null;
}): GoalGraphWindow {
  const now = input.now ?? new Date();
  const lastBucketKey = getLocalDateKey(now, input.timezone);
  const bucketCount = RANGE_BUCKET_COUNTS[input.range];

  const firstBucketKey =
    bucketCount > 0
      ? shiftDateKey(lastBucketKey, -(bucketCount - 1))
      : getExtendedRangeStartKey({
          range: input.range as Extract<GoalGraphRange, "6m" | "1y" | "max">,
          timezone: input.timezone,
          now,
          createdAt: input.createdAt,
        });

  const bucketKeys = buildDateKeysBetween(firstBucketKey, lastBucketKey);
  const bucketStarts = bucketKeys.map((dateKey) =>
    createBucketStart(dateKey, input.timezone)
  );

  return {
    bucketKeys,
    bucketStarts,
    rangeStart: bucketStarts[0],
    rangeEnd: createBucketStart(shiftDateKey(lastBucketKey, 1), input.timezone),
  };
}

export function shapeGoalGraphData(input: {
  entries: readonly GraphEntry[];
  range: GoalGraphRange;
  timezone: string;
  now?: Date;
  target: number | null;
  goal?: GraphGoal | null;
}): GoalGraphData {
  const window = getGoalGraphWindow({
    range: input.range,
    timezone: input.timezone,
    now: input.now,
    createdAt:
      input.goal?.createdAt instanceof Date
        ? input.goal.createdAt
        : input.goal?.createdAt
          ? new Date(input.goal.createdAt)
          : new Date(),
  });
  const goalType = input.goal?.type ?? "counter";

  if (goalType === "measurement") {
    const points = input.entries
      .map((entry) => ({
        bucketStart: normalizeEntryTimestamp(entry.timestamp),
        value: entry.amount,
        hasEntries: true,
      }))
      .filter((point) => {
        const time = point.bucketStart.getTime();
        return (
          time >= window.rangeStart.getTime() && time < window.rangeEnd.getTime()
        );
      })
      .sort((left, right) => left.bucketStart.getTime() - right.bucketStart.getTime());

    return {
      range: input.range,
      target: input.target,
      goalType,
      hasData: points.length > 0,
      xDomainStart: window.rangeStart,
      xDomainEnd: window.rangeEnd,
      points,
    };
  }

  const bucketKeySet = new Set(window.bucketKeys ?? []);
  const totalsByBucket = new Map<string, number>();
  const entryCountsByBucket = new Map<string, number>();

  for (const entry of input.entries) {
    const timestamp = normalizeEntryTimestamp(entry.timestamp);
    const dateKey = getLocalDateKey(timestamp, input.timezone);

    if (!bucketKeySet.has(dateKey)) {
      continue;
    }

    totalsByBucket.set(dateKey, (totalsByBucket.get(dateKey) ?? 0) + entry.amount);
    entryCountsByBucket.set(dateKey, (entryCountsByBucket.get(dateKey) ?? 0) + 1);
  }

  const points = (window.bucketKeys ?? []).map((dateKey, index) => ({
    bucketStart: window.bucketStarts?.[index] ?? createBucketStart(dateKey, input.timezone),
    value: totalsByBucket.get(dateKey) ?? 0,
    hasEntries: (entryCountsByBucket.get(dateKey) ?? 0) > 0,
  }));

  return {
    range: input.range,
    target: input.target,
    goalType,
    hasData: input.entries.length > 0,
    xDomainStart: points[0]?.bucketStart ?? window.rangeStart,
    xDomainEnd: points[points.length - 1]?.bucketStart ?? window.rangeEnd,
    points,
  };
}

export function getGoalRollingWindow(input: {
  goal: RollingGoal;
  timezone: string;
  periodCount?: number | null;
  now?: Date;
}): GoalRollingWindow | null {
  const target = input.goal.target ?? null;
  const resetValue = input.goal.resetValue ?? 1;
  const resetUnit = input.goal.resetUnit ?? "day";
  const rollingWindowValue = input.goal.rollingWindowValue ?? null;
  const rollingWindowUnit = input.goal.rollingWindowUnit ?? null;
  const createdAt = input.goal.createdAt ?? new Date();

  if (
    target === null ||
    resetUnit === "none"
  ) {
    return null;
  }

  const explicitPeriodCount = input.periodCount ?? null;
  const storedPeriodCount =
    rollingWindowValue !== null &&
    rollingWindowUnit === resetUnit &&
    rollingWindowValue > 0 &&
    resetValue > 0 &&
    rollingWindowValue % resetValue === 0
      ? rollingWindowValue / resetValue
      : null;
  const periodCount = explicitPeriodCount ?? storedPeriodCount;

  if (
    periodCount === null ||
    !Number.isInteger(periodCount) ||
    periodCount <= 0 ||
    resetValue <= 0
  ) {
    return null;
  }

  const windowValue = periodCount * resetValue;

  const periodEnd = calculatePeriodEndInTimezone(
    createdAt instanceof Date ? createdAt : new Date(createdAt),
    resetValue,
    resetUnit,
    input.timezone,
    input.now ?? new Date()
  );

  if (!periodEnd) {
    return null;
  }

  return {
    windowStart: shiftBoundaryInTimezone(
      periodEnd,
      -windowValue,
      resetUnit,
      input.timezone
    ),
    windowEnd: periodEnd,
    targetPerPeriod: target,
    expectedTotal: periodCount * target,
    windowValue,
    windowUnit: resetUnit,
    periodCount,
  };
}

export function createGoalRollingSummary(
  window: GoalRollingWindow,
  actualTotal: number,
  comparedPeriodCount: number = window.periodCount
): GoalRollingSummary {
  const normalizedComparedPeriodCount = Math.max(0, comparedPeriodCount);
  const expectedTotal = normalizedComparedPeriodCount * window.targetPerPeriod;
  const delta = actualTotal - expectedTotal;

  return {
    ...window,
    actualTotal,
    comparedPeriodCount: normalizedComparedPeriodCount,
    expectedTotal,
    delta,
    status: delta === 0 ? "on-pace" : delta > 0 ? "over" : "under",
  };
}

export function countGoalRollingPeriodsWithEntries(input: {
  goal: RollingGoal;
  entries: readonly RollingEntry[];
  window: GoalRollingWindow;
  timezone: string;
}): number {
  const createdAt = input.goal.createdAt ?? new Date();
  const resetValue = input.goal.resetValue ?? 1;
  const resetUnit = input.goal.resetUnit ?? "day";

  if (resetUnit === "none" || resetValue <= 0) {
    return 0;
  }

  const periodKeys = new Set<string>();

  for (const entry of input.entries) {
    const timestamp =
      entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
    const time = timestamp.getTime();

    if (
      time < input.window.windowStart.getTime() ||
      time >= input.window.windowEnd.getTime()
    ) {
      continue;
    }

    const periodStart = getAnchoredRollingPeriodStart({
      createdAt,
      resetValue,
      resetUnit,
      timezone: input.timezone,
      referenceTime: timestamp,
    });

    periodKeys.add(periodStart.toISOString());
  }

  // Always compare against the current active period, even if nothing has been logged yet.
  const currentPeriodReference = new Date(input.window.windowEnd.getTime() - 1);
  const currentPeriodStart = getAnchoredRollingPeriodStart({
    createdAt,
    resetValue,
    resetUnit,
    timezone: input.timezone,
    referenceTime: currentPeriodReference,
  });

  periodKeys.add(currentPeriodStart.toISOString());

  return periodKeys.size;
}

export function deriveGoalRollingSummary(input: {
  goal: RollingGoal;
  entries: readonly RollingEntry[];
  periodCount?: number | null;
  countEmptyPeriods?: boolean;
  timezone: string;
  now?: Date;
}): GoalRollingSummary | null {
  const window = getGoalRollingWindow({
    goal: input.goal,
    periodCount: input.periodCount,
    timezone: input.timezone,
    now: input.now,
  });

  if (!window) {
    return null;
  }

  const actualTotal = input.entries.reduce((sum, entry) => {
    const timestamp =
      entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
    const time = timestamp.getTime();

    if (
      time < window.windowStart.getTime() ||
      time >= window.windowEnd.getTime()
    ) {
      return sum;
    }

    return sum + entry.amount;
  }, 0);

  const comparedPeriodCount = input.countEmptyPeriods
    ? window.periodCount
    : countGoalRollingPeriodsWithEntries({
        goal: input.goal,
        entries: input.entries,
        window,
        timezone: input.timezone,
      });

  return createGoalRollingSummary(window, actualTotal, comparedPeriodCount);
}

export function getRollingWindowLabel(
  value: number,
  unit: RollingWindowUnit
): string {
  const noun =
    unit === "day" ? "day" : unit === "week" ? "week" : "month";

  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

export function getGoalRollingPresetCounts(
  resetUnit: ResetUnit | null | undefined
): number[] {
  if (!resetUnit || resetUnit === "none") {
    return [];
  }

  return [...ROLLING_PERIOD_PRESET_COUNTS[resetUnit]];
}
