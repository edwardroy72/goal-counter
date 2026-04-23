import type { GoalTargetType } from "../types/domain";

export interface MeasurementGoalFormInput {
  title: string;
  unit: string;
  target: string;
  targetType: GoalTargetType;
  startingMeasurement?: string;
}

export interface MeasurementGoalMutationValues {
  title: string;
  type: "measurement";
  unit: string | null;
  target: number | null;
  targetType: GoalTargetType;
  resetValue: number;
  resetUnit: "none";
  rollingWindowValue: null;
  rollingWindowUnit: null;
  quickAdd1: number;
  quickAdd2: null;
  quickAdd3: null;
  quickAdd4: null;
}

export interface MeasurementGoalFormError {
  title: string;
  message: string;
  field?: "startingMeasurement";
}

function parseNumericInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildMeasurementGoalMutationValues(
  input: MeasurementGoalFormInput
):
  | {
      ok: true;
      values: MeasurementGoalMutationValues;
      startingMeasurement: number | null;
    }
  | { ok: false; error: MeasurementGoalFormError } {
  const title = input.title.trim();

  if (!title) {
    return {
      ok: false,
      error: {
        title: "Missing Info",
        message: "Goal Name is required.",
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
      },
    };
  }

  const startingMeasurement = parseNumericInput(input.startingMeasurement ?? "");
  if ((input.startingMeasurement ?? "").trim() && startingMeasurement === null) {
    return {
      ok: false,
      error: {
        title: "Invalid Info",
        message: "Starting measurement must be a valid number.",
        field: "startingMeasurement",
      },
    };
  }

  return {
    ok: true,
    values: {
      title,
      type: "measurement",
      unit: input.unit.trim() || null,
      target,
      targetType: input.targetType,
      resetValue: 0,
      resetUnit: "none",
      rollingWindowValue: null,
      rollingWindowUnit: null,
      quickAdd1: 1,
      quickAdd2: null,
      quickAdd3: null,
      quickAdd4: null,
    },
    startingMeasurement,
  };
}
