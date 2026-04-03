import { createMockEntry } from "../factories/entry.factory";
import { createMockGoal } from "../factories/goal.factory";
import {
  deriveGoalRollingSummary,
  getGoalRollingWindow,
  getRollingWindowLabel,
} from "../../services/goal-analytics";

describe("goal rolling analytics", () => {
  const now = new Date("2025-01-15T14:00:00Z");

  it("returns no rolling window when config is incomplete", () => {
    expect(
      getGoalRollingWindow({
        goal: createMockGoal({
          target: 500,
          resetUnit: "day",
          resetValue: 1,
          rollingWindowValue: null,
          rollingWindowUnit: null,
        }),
        periodCount: null,
        timezone: "UTC",
        now,
      })
    ).toBeNull();
  });

  it("derives the product-brief daily deficit example correctly", () => {
    const summary = deriveGoalRollingSummary({
      goal: createMockGoal({
        target: 500,
        resetUnit: "day",
        resetValue: 1,
        createdAt: new Date("2025-01-01T00:00:00Z"),
      }),
      periodCount: 7,
      entries: [
        createMockEntry({
          amount: 400,
          timestamp: new Date("2025-01-09T10:00:00Z"),
        }),
        createMockEntry({
          amount: 450,
          timestamp: new Date("2025-01-10T10:00:00Z"),
        }),
        createMockEntry({
          amount: 750,
          timestamp: new Date("2025-01-11T10:00:00Z"),
        }),
        createMockEntry({
          amount: 500,
          timestamp: new Date("2025-01-12T10:00:00Z"),
        }),
        createMockEntry({
          amount: 550,
          timestamp: new Date("2025-01-13T10:00:00Z"),
        }),
        createMockEntry({
          amount: 300,
          timestamp: new Date("2025-01-14T10:00:00Z"),
        }),
        createMockEntry({
          amount: 400,
          timestamp: new Date("2025-01-15T10:00:00Z"),
        }),
        createMockEntry({
          amount: 999,
          timestamp: new Date("2025-01-08T10:00:00Z"),
        }),
      ],
      timezone: "UTC",
      now,
    });

    expect(summary).toEqual(
      expect.objectContaining({
        expectedTotal: 3500,
        actualTotal: 3350,
        comparedPeriodCount: 7,
        delta: -150,
        status: "under",
      })
    );
    expect(summary?.windowStart.toISOString()).toBe("2025-01-09T00:00:00.000Z");
    expect(summary?.windowEnd.toISOString()).toBe("2025-01-16T00:00:00.000Z");
  });

  it("supports monthly rolling windows", () => {
    const summary = deriveGoalRollingSummary({
      goal: createMockGoal({
        target: 100,
        resetUnit: "month",
        resetValue: 1,
        createdAt: new Date("2024-10-15T00:00:00Z"),
      }),
      periodCount: 3,
      entries: [
        createMockEntry({
          amount: 80,
          timestamp: new Date("2024-11-20T12:00:00Z"),
        }),
        createMockEntry({
          amount: 120,
          timestamp: new Date("2024-12-20T12:00:00Z"),
        }),
        createMockEntry({
          amount: 150,
          timestamp: new Date("2025-01-10T12:00:00Z"),
        }),
      ],
      countEmptyPeriods: true,
      timezone: "UTC",
      now: new Date("2025-01-15T12:00:00Z"),
    });

    expect(summary).toEqual(
      expect.objectContaining({
        expectedTotal: 300,
        actualTotal: 350,
        comparedPeriodCount: 3,
        delta: 50,
        status: "over",
      })
    );
  });

  it("reports on-pace when actual matches expected", () => {
    const summary = deriveGoalRollingSummary({
      goal: createMockGoal({
        target: 200,
        resetUnit: "week",
        resetValue: 1,
      }),
      periodCount: 2,
      entries: [
        createMockEntry({
          amount: 200,
          timestamp: new Date("2025-01-10T12:00:00Z"),
        }),
        createMockEntry({
          amount: 200,
          timestamp: new Date("2025-01-16T12:00:00Z"),
        }),
      ],
      timezone: "UTC",
      now,
    });

    expect(summary).toEqual(
      expect.objectContaining({
        expectedTotal: 400,
        actualTotal: 400,
        comparedPeriodCount: 2,
        delta: 0,
        status: "on-pace",
      })
    );
  });

  it("ignores empty periods when requested", () => {
    const summary = deriveGoalRollingSummary({
      goal: createMockGoal({
        target: 2000,
        resetUnit: "day",
        resetValue: 1,
        createdAt: new Date("2025-01-14T00:00:00Z"),
      }),
      periodCount: 7,
      entries: [
        createMockEntry({
          amount: 1200,
          timestamp: new Date("2025-01-14T10:00:00Z"),
        }),
        createMockEntry({
          amount: 1000,
          timestamp: new Date("2025-01-15T10:00:00Z"),
        }),
      ],
      countEmptyPeriods: false,
      timezone: "UTC",
      now,
    });

    expect(summary).toEqual(
      expect.objectContaining({
        expectedTotal: 4000,
        actualTotal: 2200,
        comparedPeriodCount: 2,
        delta: -1800,
        status: "under",
      })
    );
  });

  it("can count empty periods as zero across the full selected window", () => {
    const summary = deriveGoalRollingSummary({
      goal: createMockGoal({
        target: 2000,
        resetUnit: "day",
        resetValue: 1,
        createdAt: new Date("2025-01-14T00:00:00Z"),
      }),
      periodCount: 7,
      entries: [
        createMockEntry({
          amount: 1200,
          timestamp: new Date("2025-01-14T10:00:00Z"),
        }),
        createMockEntry({
          amount: 1000,
          timestamp: new Date("2025-01-15T10:00:00Z"),
        }),
      ],
      countEmptyPeriods: true,
      timezone: "UTC",
      now,
    });

    expect(summary).toEqual(
      expect.objectContaining({
        expectedTotal: 14000,
        actualTotal: 2200,
        comparedPeriodCount: 7,
        delta: -11800,
        status: "under",
      })
    );
  });

  it("still includes the current period when skipped periods are excluded", () => {
    const summary = deriveGoalRollingSummary({
      goal: createMockGoal({
        target: 2000,
        resetUnit: "day",
        resetValue: 1,
        createdAt: new Date("2025-01-01T00:00:00Z"),
      }),
      periodCount: 7,
      entries: [
        createMockEntry({
          amount: 1200,
          timestamp: new Date("2025-01-10T10:00:00Z"),
        }),
        createMockEntry({
          amount: 1000,
          timestamp: new Date("2025-01-12T10:00:00Z"),
        }),
      ],
      countEmptyPeriods: false,
      timezone: "UTC",
      now,
    });

    expect(summary).toEqual(
      expect.objectContaining({
        expectedTotal: 6000,
        actualTotal: 2200,
        comparedPeriodCount: 3,
        delta: -3800,
        status: "under",
      })
    );
  });

  it("formats rolling window labels for display", () => {
    expect(getRollingWindowLabel(1, "day")).toBe("1 day");
    expect(getRollingWindowLabel(7, "day")).toBe("7 days");
    expect(getRollingWindowLabel(3, "month")).toBe("3 months");
  });
});
