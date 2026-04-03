import { buildGoalMutationValues } from "../../utils/goal-config";

describe("goal config helpers", () => {
  describe("buildGoalMutationValues", () => {
    it("builds counter goal values and clears any rolling config", () => {
      const result = buildGoalMutationValues({
        title: " Daily Water ",
        unit: " mL ",
        target: "2000",
        resetValue: "1",
        resetUnit: "day",
        quickAdd1: "250",
        quickAdd2: "500",
        quickAdd3: "",
        quickAdd4: "",
      });

      expect(result).toEqual({
        ok: true,
        values: {
          title: "Daily Water",
          unit: "mL",
          target: 2000,
          resetValue: 1,
          resetUnit: "day",
          quickAdd1: 250,
          quickAdd2: 500,
          quickAdd3: null,
          quickAdd4: null,
          rollingWindowValue: null,
          rollingWindowUnit: null,
        },
      });
    });

    it("requires at least one quick add amount", () => {
      const result = buildGoalMutationValues({
        title: "Read",
        unit: "",
        target: "500",
        resetValue: "1",
        resetUnit: "day",
        quickAdd1: "",
        quickAdd2: "",
        quickAdd3: "",
        quickAdd4: "",
      });

      expect(result).toEqual({
        ok: false,
        error: {
          title: "Missing Info",
          message: "At least one Quick Add value is required.",
          field: "general",
        },
      });
    });

    it("normalizes never-reset goals to reset value zero", () => {
      const result = buildGoalMutationValues({
        title: "Lifetime Progress",
        unit: "",
        target: "",
        resetValue: "99",
        resetUnit: "none",
        quickAdd1: "1",
        quickAdd2: "",
        quickAdd3: "",
        quickAdd4: "",
      });

      expect(result).toEqual({
        ok: true,
        values: expect.objectContaining({
          resetValue: 0,
          resetUnit: "none",
          rollingWindowValue: null,
          rollingWindowUnit: null,
        }),
      });
    });
  });
});
