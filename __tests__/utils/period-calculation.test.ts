/**
 * Unit Tests: Period Calculation Logic
 *
 * Tests the core business logic for calculating period boundaries
 * based on goal creation time and reset intervals.
 *
 * Critical for ensuring accurate totals are calculated for each period.
 */

import { addDays, addMonths, addWeeks } from "date-fns";

/**
 * Extracted from useGoalTotal for testing.
 * Pure function to calculate the period start given a goal creation time and current time.
 */
function calculatePeriodStart(
  createdAt: Date,
  resetValue: number,
  resetUnit: string,
  currentTime: Date = new Date()
): Date {
  // Use UTC for consistent behavior across timezones
  let currentPeriodStart = new Date(
    Date.UTC(
      createdAt.getUTCFullYear(),
      createdAt.getUTCMonth(),
      createdAt.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  if (resetUnit === "none" || resetValue <= 0) {
    return currentPeriodStart;
  }

  while (true) {
    let nextPeriodStart: Date;
    if (resetUnit === "day") {
      nextPeriodStart = addDays(currentPeriodStart, resetValue);
    } else if (resetUnit === "week") {
      nextPeriodStart = addWeeks(currentPeriodStart, resetValue);
    } else if (resetUnit === "month") {
      // Use addMonths and then normalize back to UTC midnight
      const temp = addMonths(currentPeriodStart, resetValue);
      nextPeriodStart = new Date(
        Date.UTC(
          temp.getUTCFullYear(),
          temp.getUTCMonth(),
          temp.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
    } else {
      break;
    }

    if (nextPeriodStart > currentTime) break;
    currentPeriodStart = nextPeriodStart;
  }

  return currentPeriodStart;
}

/**
 * Helper to normalize timestamps (seconds vs milliseconds)
 */
function normalizeMs(value: number | Date): number {
  if (value instanceof Date) return value.getTime();
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

describe("Period Calculation Logic", () => {
  describe("calculatePeriodStart()", () => {
    describe("none (lifetime goals)", () => {
      it("should return the start of creation day for lifetime goals", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const currentTime = new Date("2025-03-20T10:00:00Z");

        const result = calculatePeriodStart(createdAt, 1, "none", currentTime);

        expect(result).toEqual(new Date("2025-01-15T00:00:00Z"));
      });

      it("should ignore resetValue for lifetime goals", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const currentTime = new Date("2025-03-20T10:00:00Z");

        const result1 = calculatePeriodStart(createdAt, 1, "none", currentTime);
        const result2 = calculatePeriodStart(createdAt, 7, "none", currentTime);
        const result3 = calculatePeriodStart(
          createdAt,
          100,
          "none",
          currentTime
        );

        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });
    });

    describe("day reset interval", () => {
      it("should return creation day start when current time is same day", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const currentTime = new Date("2025-01-15T20:00:00Z");

        const result = calculatePeriodStart(createdAt, 1, "day", currentTime);

        expect(result).toEqual(new Date("2025-01-15T00:00:00Z"));
      });

      it("should advance by resetValue days for 1-day interval", () => {
        const createdAt = new Date("2025-01-15T00:00:00Z");
        const currentTime = new Date("2025-01-17T12:00:00Z"); // 2 days later

        const result = calculatePeriodStart(createdAt, 1, "day", currentTime);

        // Should be start of Jan 17 (2 full days have passed)
        expect(result).toEqual(new Date("2025-01-17T00:00:00Z"));
      });

      it("should handle multi-day reset intervals correctly", () => {
        const createdAt = new Date("2025-01-01T00:00:00Z");
        const currentTime = new Date("2025-01-08T12:00:00Z"); // 7 days later

        const result = calculatePeriodStart(createdAt, 3, "day", currentTime);

        // Periods: Jan 1-3, Jan 4-6, Jan 7-9
        // Jan 8 falls in the Jan 7-9 period
        expect(result).toEqual(new Date("2025-01-07T00:00:00Z"));
      });

      it("should handle when current time is exactly at period boundary", () => {
        const createdAt = new Date("2025-01-01T00:00:00Z");
        const currentTime = new Date("2025-01-04T00:00:00Z"); // Exactly 3 days

        const result = calculatePeriodStart(createdAt, 3, "day", currentTime);

        // At midnight of day 4, we're in the new period starting Jan 4
        expect(result).toEqual(new Date("2025-01-04T00:00:00Z"));
      });
    });

    describe("week reset interval", () => {
      it("should return creation day start when current time is same week", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z"); // Wednesday
        const currentTime = new Date("2025-01-17T10:00:00Z"); // Friday same week

        const result = calculatePeriodStart(createdAt, 1, "week", currentTime);

        expect(result).toEqual(new Date("2025-01-15T00:00:00Z"));
      });

      it("should advance by full weeks for 1-week interval", () => {
        const createdAt = new Date("2025-01-15T00:00:00Z"); // Wednesday
        const currentTime = new Date("2025-01-29T12:00:00Z"); // 2 weeks later

        const result = calculatePeriodStart(createdAt, 1, "week", currentTime);

        // Should be start of Wed Jan 29 (2 full weeks passed)
        expect(result).toEqual(new Date("2025-01-29T00:00:00Z"));
      });

      it("should handle multi-week reset intervals", () => {
        const createdAt = new Date("2025-01-01T00:00:00Z");
        const currentTime = new Date("2025-02-01T00:00:00Z"); // ~4 weeks later

        const result = calculatePeriodStart(createdAt, 2, "week", currentTime);

        // Periods: Jan 1-14, Jan 15-28, Jan 29-Feb 11
        // Feb 1 falls in Jan 29-Feb 11 period
        expect(result).toEqual(new Date("2025-01-29T00:00:00Z"));
      });
    });

    describe("month reset interval", () => {
      it("should return creation day start when current time is same month", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const currentTime = new Date("2025-01-25T10:00:00Z");

        const result = calculatePeriodStart(createdAt, 1, "month", currentTime);

        expect(result).toEqual(new Date("2025-01-15T00:00:00Z"));
      });

      it("should advance by full months for 1-month interval", () => {
        const createdAt = new Date("2025-01-15T00:00:00Z");
        const currentTime = new Date("2025-03-20T12:00:00Z"); // 2+ months later

        const result = calculatePeriodStart(createdAt, 1, "month", currentTime);

        // Should be start of Mar 15 (current period)
        expect(result).toEqual(new Date("2025-03-15T00:00:00Z"));
      });

      it("should handle multi-month reset intervals", () => {
        const createdAt = new Date("2025-01-01T00:00:00Z");
        const currentTime = new Date("2025-08-15T00:00:00Z"); // 7+ months later

        const result = calculatePeriodStart(createdAt, 3, "month", currentTime);

        // Periods: Jan-Mar, Apr-Jun, Jul-Sep
        // Aug 15 falls in Jul-Sep period
        expect(result).toEqual(new Date("2025-07-01T00:00:00Z"));
      });

      it("should handle edge case of month-end creation dates", () => {
        const createdAt = new Date("2025-01-31T00:00:00Z");
        const currentTime = new Date("2025-03-15T00:00:00Z");

        const result = calculatePeriodStart(createdAt, 1, "month", currentTime);

        // Feb only has 28 days in 2025, so Feb period would be Feb 28
        // March period starts Mar 31, but current time is Mar 15
        // So we should still be in the Feb period
        expect(result.getMonth()).toBe(1); // February (0-indexed)
      });
    });

    describe("edge cases and boundary conditions", () => {
      it("should handle creation time in the future (should return creation day)", () => {
        const createdAt = new Date("2025-12-31T00:00:00Z");
        const currentTime = new Date("2025-01-01T00:00:00Z");

        const result = calculatePeriodStart(createdAt, 1, "day", currentTime);

        expect(result).toEqual(new Date("2025-12-31T00:00:00Z"));
      });

      it("should handle very large reset values", () => {
        const createdAt = new Date("2025-01-01T00:00:00Z");
        const currentTime = new Date("2025-01-10T00:00:00Z");

        const result = calculatePeriodStart(createdAt, 100, "day", currentTime);

        // 100 days haven't passed yet
        expect(result).toEqual(new Date("2025-01-01T00:00:00Z"));
      });

      it("should handle resetValue of 0 (should return creation day)", () => {
        const createdAt = new Date("2025-01-01T00:00:00Z");
        const currentTime = new Date("2025-12-31T00:00:00Z");

        const result = calculatePeriodStart(createdAt, 0, "day", currentTime);

        // With 0 interval, loop should break immediately
        expect(result).toEqual(new Date("2025-01-01T00:00:00Z"));
      });

      it("should handle unknown reset unit gracefully", () => {
        const createdAt = new Date("2025-01-01T00:00:00Z");
        const currentTime = new Date("2025-12-31T00:00:00Z");

        const result = calculatePeriodStart(
          createdAt,
          1,
          "invalid",
          currentTime
        );

        // Should break out of loop and return creation day
        expect(result).toEqual(new Date("2025-01-01T00:00:00Z"));
      });
    });
  });

  describe("normalizeMs()", () => {
    it("should convert Date objects to milliseconds", () => {
      const date = new Date("2025-01-15T12:00:00Z");
      expect(normalizeMs(date)).toBe(date.getTime());
    });

    it("should convert seconds to milliseconds", () => {
      const seconds = 1705320000; // Unix timestamp in seconds
      const result = normalizeMs(seconds);
      expect(result).toBe(seconds * 1000);
    });

    it("should keep milliseconds as-is", () => {
      const milliseconds = 1705320000000; // Unix timestamp in milliseconds
      const result = normalizeMs(milliseconds);
      expect(result).toBe(milliseconds);
    });

    it("should handle boundary between seconds and milliseconds correctly", () => {
      const justUnderBoundary = 999999999999;
      const justOverBoundary = 1000000000000;

      expect(normalizeMs(justUnderBoundary)).toBe(justUnderBoundary * 1000);
      expect(normalizeMs(justOverBoundary)).toBe(justOverBoundary);
    });

    it("should handle zero correctly", () => {
      expect(normalizeMs(0)).toBe(0);
    });

    it("should handle negative timestamps (pre-epoch)", () => {
      const negativeTimestamp = -1000;
      expect(normalizeMs(negativeTimestamp)).toBe(negativeTimestamp * 1000);
    });
  });
});
