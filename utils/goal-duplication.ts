import type {
  GoalTargetType,
  GoalType,
  ResetUnit,
  RollingWindowUnit,
} from "../types/domain";

const COPY_SUFFIX_REGEX = /\s+Copy(?:\s+(\d+))?$/;

export interface DuplicateGoalSource {
  title: string;
  type?: GoalType | null;
  unit: string | null;
  target: number | null;
  targetType?: GoalTargetType | null;
  resetValue: number | null;
  resetUnit: ResetUnit | null;
  rollingWindowValue?: number | null;
  rollingWindowUnit?: RollingWindowUnit | null;
  quickAdd1: number;
  quickAdd2: number | null;
  quickAdd3: number | null;
  quickAdd4: number | null;
  timezone?: string | null;
}

export interface DuplicateGoalValues {
  title: string;
  type: GoalType;
  unit: string | null;
  target: number | null;
  targetType: GoalTargetType;
  resetValue: number;
  resetUnit: ResetUnit;
  rollingWindowValue: number | null;
  rollingWindowUnit: RollingWindowUnit | null;
  quickAdd1: number;
  quickAdd2: number | null;
  quickAdd3: number | null;
  quickAdd4: number | null;
  sortOrder: number;
  status: "active";
  timezone: string;
}

function normalizeResetUnit(resetUnit: ResetUnit | null): ResetUnit {
  return resetUnit ?? "day";
}

function normalizeResetValue(
  resetValue: number | null,
  resetUnit: ResetUnit
): number {
  if (resetUnit === "none") {
    return 0;
  }

  return resetValue && resetValue > 0 ? resetValue : 1;
}

export function createDuplicateGoalTitle(title: string): string {
  const trimmedTitle = title.trim();
  const match = trimmedTitle.match(COPY_SUFFIX_REGEX);

  if (!match) {
    return `${trimmedTitle} Copy`;
  }

  const copyNumber = match[1] ? Number.parseInt(match[1], 10) : 1;
  const baseTitle = trimmedTitle.replace(COPY_SUFFIX_REGEX, "");

  return `${baseTitle} Copy ${copyNumber + 1}`;
}

export function buildDuplicateGoalValues(
  source: DuplicateGoalSource,
  sortOrder: number
): DuplicateGoalValues {
  const resetUnit = normalizeResetUnit(source.resetUnit);

  return {
    title: createDuplicateGoalTitle(source.title),
    type: source.type ?? "counter",
    unit: source.unit ?? null,
    target: source.target ?? null,
    targetType: source.targetType ?? "min",
    resetValue: normalizeResetValue(source.resetValue ?? null, resetUnit),
    resetUnit,
    rollingWindowValue: null,
    rollingWindowUnit: null,
    quickAdd1: source.quickAdd1,
    quickAdd2: source.quickAdd2 ?? null,
    quickAdd3: source.quickAdd3 ?? null,
    quickAdd4: source.quickAdd4 ?? null,
    sortOrder,
    status: "active",
    timezone: source.timezone ?? "UTC",
  };
}
