import {
  buildDuplicateGoalValues,
  createDuplicateGoalTitle,
} from "../../utils/goal-duplication";

describe("goal-duplication", () => {
  describe("createDuplicateGoalTitle", () => {
    it("appends Copy for first duplicates", () => {
      expect(createDuplicateGoalTitle("Daily Water")).toBe("Daily Water Copy");
    });

    it("increments an existing Copy suffix", () => {
      expect(createDuplicateGoalTitle("Daily Water Copy")).toBe(
        "Daily Water Copy 2"
      );
    });

    it("increments numbered copy suffixes", () => {
      expect(createDuplicateGoalTitle("Daily Water Copy 2")).toBe(
        "Daily Water Copy 3"
      );
    });
  });

  describe("buildDuplicateGoalValues", () => {
    it("copies the goal setup without history fields", () => {
      const result = buildDuplicateGoalValues(
        {
          title: "Daily Water",
          unit: "mL",
          target: 3000,
          resetValue: 1,
          resetUnit: "day",
          rollingWindowValue: 7,
          rollingWindowUnit: "day",
          quickAdd1: 250,
          quickAdd2: 500,
          quickAdd3: null,
          quickAdd4: null,
          timezone: "Australia/Sydney",
        },
        12345
      );

      expect(result).toEqual({
        title: "Daily Water Copy",
        type: "counter",
        unit: "mL",
        target: 3000,
        resetValue: 1,
        resetUnit: "day",
        rollingWindowValue: null,
        rollingWindowUnit: null,
        quickAdd1: 250,
        quickAdd2: 500,
        quickAdd3: null,
        quickAdd4: null,
        sortOrder: 12345,
        status: "active",
        timezone: "Australia/Sydney",
      });
    });

    it("normalizes missing reset and rolling metadata safely", () => {
      const result = buildDuplicateGoalValues(
        {
          title: "Lifetime Goal",
          unit: null,
          target: null,
          resetValue: null,
          resetUnit: null,
          rollingWindowValue: 3,
          rollingWindowUnit: null,
          quickAdd1: 1,
          quickAdd2: null,
          quickAdd3: null,
          quickAdd4: null,
          timezone: null,
        },
        55
      );

      expect(result).toEqual({
        title: "Lifetime Goal Copy",
        type: "counter",
        unit: null,
        target: null,
        resetValue: 1,
        resetUnit: "day",
        rollingWindowValue: null,
        rollingWindowUnit: null,
        quickAdd1: 1,
        quickAdd2: null,
        quickAdd3: null,
        quickAdd4: null,
        sortOrder: 55,
        status: "active",
        timezone: "UTC",
      });
    });
  });
});
