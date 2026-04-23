import type {
  GoalTargetType,
  ResetUnit,
  RollingWindowUnit,
} from "../types/domain";

export interface GoalFormInput {
  title: string;
  unit: string;
  target: string;
  targetType: GoalTargetType;
  resetValue: string;
  resetUnit: ResetUnit;
  quickAdd1: string;
  quickAdd2: string;
  quickAdd3: string;
  quickAdd4: string;
}

export interface GoalMutationValues {
  title: string;
  unit: string | null;
  target: number | null;
  targetType: GoalTargetType;
  resetValue: number;
  resetUnit: ResetUnit;
  quickAdd1: number;
  quickAdd2: number | null;
  quickAdd3: number | null;
  quickAdd4: number | null;
  rollingWindowValue: number | null;
  rollingWindowUnit: RollingWindowUnit | null;
}

export type GoalFormErrorField = "general";

export interface GoalFormError {
  title: string;
  message: string;
  field: GoalFormErrorField;
}

function parseNumericInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseQuickAdd(value: string): number | null {
  const parsed = parseNumericInput(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

export function buildGoalMutationValues(input: GoalFormInput):
  | { ok: true; values: GoalMutationValues }
  | { ok: false; error: GoalFormError } {
  const title = input.title.trim();

  if (!title) {
    return {
      ok: false,
      error: {
        title: "Missing Info",
        message: "Goal Name is required.",
        field: "general",
      },
    };
  }

  const quickAdd1 = parseQuickAdd(input.quickAdd1);
  if (quickAdd1 === null) {
    return {
      ok: false,
      error: {
        title: "Missing Info",
        message: "At least one Quick Add value is required.",
        field: "general",
      },
    };
  }

  const target = parseNumericInput(input.target);
  if (input.target.trim() && target === null) {
    return {
      ok: false,
      error: {
        title: "Invalid Info",
        message: "Target must be a valid number.",
        field: "general",
      },
    };
  }

  const parsedResetValue =
    input.resetUnit === "none"
      ? 0
      : Math.max(1, Number.parseInt(input.resetValue, 10) || 1);

  return {
    ok: true,
    values: {
      title,
      unit: input.unit.trim() || null,
      target,
      targetType: input.targetType,
      resetValue: parsedResetValue,
      resetUnit: input.resetUnit,
      quickAdd1,
      quickAdd2: parseQuickAdd(input.quickAdd2),
      quickAdd3: parseQuickAdd(input.quickAdd3),
      quickAdd4: parseQuickAdd(input.quickAdd4),
      rollingWindowValue: null,
      rollingWindowUnit: null,
    },
  };
}
