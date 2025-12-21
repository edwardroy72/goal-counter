/**
 * Unit Tests: Period Calculation Utilities
 *
 * Behavior-driven tests for period boundary calculations.
 * These tests define the CORRECT behavior that the system must follow.
 */

import {
  calculatePeriodEnd,
  calculatePeriodStart,
  normalizeToMilliseconds,
} from "../../utils/period-calculation";

describe("Period Calculation Utilities", () => {
  describe("normalizeToMilliseconds()", () => {
    describe("Valid inputs", () => {
      it("should convert Date object to milliseconds", () => {
        const date = new Date("2025-01-15T10:30:00Z");
        const result = normalizeToMilliseconds(date);

        expect(result).toBe(date.getTime());
        expect(typeof result).toBe("number");
      });

      it("should pass through millisecond timestamps unchanged", () => {
        const ms = 1704067200000; // 2024-01-01 in milliseconds
        const result = normalizeToMilliseconds(ms);

        expect(result).toBe(ms);
      });

      it("should convert second timestamps to milliseconds", () => {
        const seconds = 1704067200; // 2024-01-01 in seconds
        const result = normalizeToMilliseconds(seconds);

        expect(result).toBe(seconds * 1000);
        expect(result).toBe(1704067200000);
      });

      it("should handle timestamp at boundary (1 trillion)", () => {
        // Exactly 1 trillion should be treated as milliseconds
        const boundary = 1_000_000_000_000;
        const result = normalizeToMilliseconds(boundary);

        expect(result).toBe(boundary);
      });
    });

    describe("Invalid inputs", () => {
      it("should throw on Invalid Date", () => {
        const invalidDate = new Date("invalid");

        expect(() => normalizeToMilliseconds(invalidDate)).toThrow(
          "Invalid Date object"
        );
      });

      it("should throw on NaN", () => {
        expect(() => normalizeToMilliseconds(NaN)).toThrow("Invalid timestamp");
      });

      it("should throw on undefined", () => {
        expect(() => normalizeToMilliseconds(undefined as any)).toThrow(
          "Invalid timestamp"
        );
      });

      it("should throw on null", () => {
        expect(() => normalizeToMilliseconds(null as any)).toThrow(
          "Invalid timestamp"
        );
      });
    });
  });

  describe("calculatePeriodStart()", () => {
    const now = new Date("2025-01-15T14:30:00Z");

    describe("Lifetime goals (no reset)", () => {
      it('should return creation day start for resetUnit="none"', () => {
        const created = new Date("2025-01-10T18:45:00Z");
        const result = calculatePeriodStart(created, 1, "none", now);

        expect(result).toEqual(new Date("2025-01-10T00:00:00Z"));
      });

      it("should return creation day start when resetValue=0", () => {
        const created = new Date("2025-01-10T18:45:00Z");
        const result = calculatePeriodStart(created, 0, "day", now);

        expect(result).toEqual(new Date("2025-01-10T00:00:00Z"));
      });

      it("should ignore resetValue for lifetime goals", () => {
        const created = new Date("2025-01-10T18:45:00Z");

        const result1 = calculatePeriodStart(created, 1, "none", now);
        const result2 = calculatePeriodStart(created, 100, "none", now);

        expect(result1).toEqual(result2);
      });
    });

    describe("Daily reset goals", () => {
      it("should return creation day when current time is same day", () => {
        const created = new Date("2025-01-15T08:00:00Z");
        const current = new Date("2025-01-15T20:00:00Z");

        const result = calculatePeriodStart(created, 1, "day", current);

        expect(result).toEqual(new Date("2025-01-15T00:00:00Z"));
      });

      it("should return current day for 1-day reset (daily goals)", () => {
        const created = new Date("2025-01-01T00:00:00Z");
        const current = new Date("2025-01-15T14:30:00Z"); // 14 days later

        const result = calculatePeriodStart(created, 1, "day", current);

        expect(result).toEqual(new Date("2025-01-15T00:00:00Z"));
      });

      it("should handle multi-day reset correctly (every 3 days)", () => {
        const created = new Date("2025-01-01T00:00:00Z");
        // Day 1-3: Jan 1-3, Day 4-6: Jan 4-6, Day 7-9: Jan 7-9, Day 10-12: Jan 10-12
        const current = new Date("2025-01-11T12:00:00Z"); // Day 11

        const result = calculatePeriodStart(created, 3, "day", current);

        expect(result).toEqual(new Date("2025-01-10T00:00:00Z")); // Start of period 10-12
      });

      it("should handle exact period boundary (midnight)", () => {
        const created = new Date("2025-01-01T00:00:00Z");
        const current = new Date("2025-01-04T00:00:00Z"); // Exactly 3 days

        const result = calculatePeriodStart(created, 3, "day", current);

        // At midnight, we're in the new period
        expect(result).toEqual(new Date("2025-01-04T00:00:00Z"));
      });

      it("should handle creation mid-day (normalize to start of day)", () => {
        const created = new Date("2025-01-01T18:30:45Z"); // 6:30 PM
        const current = new Date("2025-01-02T08:00:00Z"); // Next day morning

        const result = calculatePeriodStart(created, 1, "day", current);

        expect(result).toEqual(new Date("2025-01-02T00:00:00Z"));
      });
    });

    describe("Weekly reset goals", () => {
      it("should calculate period for 1-week reset", () => {
        const created = new Date("2025-01-01T00:00:00Z"); // Wednesday
        const current = new Date("2025-01-15T00:00:00Z"); // 2 weeks later

        const result = calculatePeriodStart(created, 1, "week", current);

        expect(result).toEqual(new Date("2025-01-15T00:00:00Z")); // Start of week 3
      });

      it("should calculate period for 2-week reset", () => {
        const created = new Date("2025-01-01T00:00:00Z");
        const current = new Date("2025-01-20T00:00:00Z"); // 19 days = 2 weeks + 5 days

        const result = calculatePeriodStart(created, 2, "week", current);

        // Period 1: Jan 1-14, Period 2: Jan 15-28
        expect(result).toEqual(new Date("2025-01-15T00:00:00Z"));
      });

      it("should handle creation mid-week", () => {
        const created = new Date("2025-01-08T14:00:00Z"); // Wednesday afternoon
        const current = new Date("2025-01-16T10:00:00Z"); // 8 days later (Thursday)

        const result = calculatePeriodStart(created, 1, "week", current);

        expect(result).toEqual(new Date("2025-01-15T00:00:00Z")); // Start of second week
      });
    });

    describe("Monthly reset goals", () => {
      it("should calculate period for 1-month reset", () => {
        const created = new Date("2025-01-15T00:00:00Z");
        const current = new Date("2025-03-20T00:00:00Z"); // Over 2 months later

        const result = calculatePeriodStart(created, 1, "month", current);

        // Month 1: Jan 15 - Feb 14, Month 2: Feb 15 - Mar 14, Month 3: Mar 15 - Apr 14
        expect(result).toEqual(new Date("2025-03-15T00:00:00Z"));
      });

      it("should calculate period for 3-month reset", () => {
        const created = new Date("2025-01-01T00:00:00Z");
        const current = new Date("2025-07-15T00:00:00Z"); // 6.5 months later

        const result = calculatePeriodStart(created, 3, "month", current);

        // Period 1: Jan-Mar, Period 2: Apr-Jun, Period 3: Jul-Sep
        expect(result).toEqual(new Date("2025-07-01T00:00:00Z"));
      });

      it("should handle month-end dates (Jan 31 → Feb 28/29)", () => {
        const created = new Date("2025-01-31T00:00:00Z");
        const current = new Date("2025-03-15T00:00:00Z");

        const result = calculatePeriodStart(created, 1, "month", current);

        // date-fns handles Jan 31 + 1 month → Feb 28 (2025 is not leap year)
        // Then Feb 28 + 1 month → Mar 28
        // Current time is Mar 15, so we should be in the Feb 28 - Mar 27 period
        expect(result.getMonth()).toBe(1); // February (0-indexed)
        expect(result.getDate()).toBeLessThanOrEqual(29); // Feb 28 or 29
      });

      it("should handle leap year correctly (2024)", () => {
        const created = new Date("2024-01-31T00:00:00Z");
        const current = new Date("2024-03-01T00:00:00Z");

        const result = calculatePeriodStart(created, 1, "month", current);

        // 2024 is leap year, so Jan 31 + 1 month = Feb 29
        // We're on March 1, so current period is Feb 29 - Mar 30
        const expectedPeriodStart = new Date("2024-02-29T00:00:00Z");
        expect(result.getTime()).toBe(expectedPeriodStart.getTime());
      });
    });

    describe("Timestamp format handling", () => {
      it("should accept millisecond timestamp for createdAt", () => {
        const createdMs = new Date("2025-01-01T00:00:00Z").getTime();
        const current = new Date("2025-01-02T00:00:00Z");

        const result = calculatePeriodStart(createdMs, 1, "day", current);

        expect(result).toEqual(new Date("2025-01-02T00:00:00Z"));
      });

      it("should accept second timestamp for createdAt", () => {
        const createdSec = Math.floor(
          new Date("2025-01-01T00:00:00Z").getTime() / 1000
        );
        const current = new Date("2025-01-02T00:00:00Z");

        const result = calculatePeriodStart(createdSec, 1, "day", current);

        expect(result).toEqual(new Date("2025-01-02T00:00:00Z"));
      });

      it("should accept Date object for createdAt", () => {
        const created = new Date("2025-01-01T00:00:00Z");
        const current = new Date("2025-01-02T00:00:00Z");

        const result = calculatePeriodStart(created, 1, "day", current);

        expect(result).toEqual(new Date("2025-01-02T00:00:00Z"));
      });
    });

    describe("Error handling", () => {
      it("should throw on invalid createdAt", () => {
        expect(() =>
          calculatePeriodStart("invalid" as any, 1, "day", now)
        ).toThrow();
      });

      it("should throw on negative resetValue", () => {
        const created = new Date("2025-01-01T00:00:00Z");

        expect(() => calculatePeriodStart(created, -5, "day", now)).toThrow(
          "Invalid resetValue"
        );
      });

      it("should throw on invalid resetUnit", () => {
        const created = new Date("2025-01-01T00:00:00Z");

        expect(() =>
          calculatePeriodStart(created, 1, "invalid" as any, now)
        ).toThrow("Invalid resetUnit");
      });

      it("should throw if goal is unreasonably old", () => {
        // A goal from 1900 with daily resets would need ~45,000 iterations
        const created = new Date("1900-01-01T00:00:00Z");
        const current = new Date("2025-01-01T00:00:00Z");

        // Should throw because it exceeds reasonable bounds
        expect(() => calculatePeriodStart(created, 1, "day", current)).toThrow(
          "exceeded maximum iterations"
        );
      });
    });

    describe("Edge cases and boundaries", () => {
      it("should handle current time before creation (future-dated goal)", () => {
        const created = new Date("2025-12-31T00:00:00Z");
        const current = new Date("2025-01-15T00:00:00Z"); // Before creation

        const result = calculatePeriodStart(created, 1, "day", current);

        // Should return creation day since no periods have passed yet
        expect(result).toEqual(new Date("2025-12-31T00:00:00Z"));
      });

      it("should handle very large resetValue for day", () => {
        const created = new Date("2025-01-01T00:00:00Z");
        const current = new Date("2025-01-10T00:00:00Z");

        const result = calculatePeriodStart(created, 365, "day", current);

        // Only 9 days passed, still in first period
        expect(result).toEqual(new Date("2025-01-01T00:00:00Z"));
      });

      it("should be deterministic (same inputs → same output)", () => {
        const created = new Date("2025-01-01T00:00:00Z");
        const current = new Date("2025-01-15T00:00:00Z");

        const result1 = calculatePeriodStart(created, 3, "day", current);
        const result2 = calculatePeriodStart(created, 3, "day", current);
        const result3 = calculatePeriodStart(created, 3, "day", current);

        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });
    });
  });

  describe("calculatePeriodEnd()", () => {
    const now = new Date("2025-01-15T14:30:00Z");

    it("should return null for lifetime goals", () => {
      const created = new Date("2025-01-01T00:00:00Z");
      const result = calculatePeriodEnd(created, 1, "none", now);

      expect(result).toBeNull();
    });

    it("should calculate end for daily goals", () => {
      const created = new Date("2025-01-01T00:00:00Z");
      const current = new Date("2025-01-15T14:30:00Z");

      const result = calculatePeriodEnd(created, 1, "day", current);

      // Current period: Jan 15, ends at Jan 16 midnight
      expect(result).toEqual(new Date("2025-01-16T00:00:00Z"));
    });

    it("should calculate end for weekly goals", () => {
      const created = new Date("2025-01-01T00:00:00Z");
      const current = new Date("2025-01-15T00:00:00Z");

      const result = calculatePeriodEnd(created, 1, "week", current);

      // Current period started Jan 15, ends Jan 22
      expect(result).toEqual(new Date("2025-01-22T00:00:00Z"));
    });

    it("should calculate end for monthly goals", () => {
      const created = new Date("2025-01-01T00:00:00Z");
      const current = new Date("2025-03-15T00:00:00Z");

      const result = calculatePeriodEnd(created, 1, "month", current);

      // Current period: Mar 1 - Mar 31, ends Apr 1
      expect(result).toEqual(new Date("2025-04-01T00:00:00Z"));
    });

    it("should return null when resetValue is 0", () => {
      const created = new Date("2025-01-01T00:00:00Z");
      const result = calculatePeriodEnd(created, 0, "day", now);

      expect(result).toBeNull();
    });
  });
});
