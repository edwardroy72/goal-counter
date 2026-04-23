import { buildMeasurementGoalMutationValues } from "../../utils/measurement-goal-config";

describe("measurement goal config helpers", () => {
  it("builds measurement goal values with tracking defaults", () => {
    const result = buildMeasurementGoalMutationValues({
      title: " Body Weight ",
      unit: " kg ",
      target: "70.5",
      targetType: "max",
      startingMeasurement: "72.4",
    });

    expect(result).toEqual({
      ok: true,
      values: {
        title: "Body Weight",
        type: "measurement",
        unit: "kg",
        target: 70.5,
        targetType: "max",
        resetValue: 0,
        resetUnit: "none",
        rollingWindowValue: null,
        rollingWindowUnit: null,
        quickAdd1: 1,
        quickAdd2: null,
        quickAdd3: null,
        quickAdd4: null,
      },
      startingMeasurement: 72.4,
    });
  });

  it("rejects missing names", () => {
    const result = buildMeasurementGoalMutationValues({
      title: "   ",
      unit: "kg",
      target: "",
      targetType: "min",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        title: "Missing Info",
        message: "Goal Name is required.",
      },
    });
  });

  it("rejects invalid numeric targets", () => {
    const result = buildMeasurementGoalMutationValues({
      title: "Body Weight",
      unit: "kg",
      target: "abc",
      targetType: "min",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        title: "Invalid Info",
        message: "Target must be a valid number.",
      },
    });
  });

  it("rejects invalid starting measurements", () => {
    const result = buildMeasurementGoalMutationValues({
      title: "Body Weight",
      unit: "kg",
      target: "70",
      targetType: "min",
      startingMeasurement: "abc",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        title: "Invalid Info",
        message: "Starting measurement must be a valid number.",
        field: "startingMeasurement",
      },
    });
  });
});
