/**
 * Unit Tests: Date Logic Utilities
 *
 * Tests countdown and reset calculation functions.
 * Critical for accurate reset timing and countdown displays.
 */

import { addDays, addMonths, addWeeks, startOfDay } from "date-fns";
import {
  calculateNextReset,
  getCountdownText,
  ResetUnit,
} from "../../utils/date-logic";

describe("Date Logic Utilities", () => {
  describe("calculateNextReset()", () => {
    describe("Day intervals", () => {
      it("should calculate next reset for 1-day interval", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, "day");

        // Should return midnight of Jan 16 (next day) in local timezone
        const expected = addDays(startOfDay(createdAt), 1);
        expect(result).toEqual(expected);
      });

      it("should calculate next reset for multi-day interval", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 7, "day");

        // Should return midnight of Jan 22 (7 days later)
        const expected = addDays(startOfDay(createdAt), 7);
        expect(result).toEqual(expected);
      });

      it("should handle creation at midnight", () => {
        const createdAt = new Date("2025-01-15T00:00:00");
        const result = calculateNextReset(createdAt, 1, "day");

        const expected = addDays(startOfDay(createdAt), 1);
        expect(result).toEqual(expected);
      });

      it("should handle creation at 11:59 PM", () => {
        const createdAt = new Date("2025-01-15T23:59:59");
        const result = calculateNextReset(createdAt, 1, "day");

        // Should still reset at midnight of next day
        const expected = addDays(startOfDay(createdAt), 1);
        expect(result).toEqual(expected);
      });
    });

    describe("Week intervals", () => {
      it("should calculate next reset for 1-week interval", () => {
        const createdAt = new Date("2025-01-15T14:30:00"); // Wednesday
        const result = calculateNextReset(createdAt, 1, "week");

        // Should return midnight 7 days later (next Wednesday)
        const expected = addWeeks(startOfDay(createdAt), 1);
        expect(result).toEqual(expected);
      });

      it("should calculate next reset for 2-week interval", () => {
        const createdAt = new Date("2025-01-15T14:30:00");
        const result = calculateNextReset(createdAt, 2, "week");

        // Should return midnight 14 days later
        const expected = addWeeks(startOfDay(createdAt), 2);
        expect(result).toEqual(expected);
      });

      it("should handle week interval from weekend", () => {
        const createdAt = new Date("2025-01-18T12:00:00"); // Saturday
        const result = calculateNextReset(createdAt, 1, "week");

        const expected = addWeeks(startOfDay(createdAt), 1);
        expect(result).toEqual(expected);
      });
    });

    describe("Month intervals", () => {
      it("should calculate next reset for 1-month interval", () => {
        const createdAt = new Date("2025-01-15T14:30:00");
        const result = calculateNextReset(createdAt, 1, "month");

        // Should return midnight of Feb 15
        const expected = addMonths(startOfDay(createdAt), 1);
        expect(result).toEqual(expected);
      });

      it("should calculate next reset for 3-month interval", () => {
        const createdAt = new Date("2025-01-15T14:30:00");
        const result = calculateNextReset(createdAt, 3, "month");

        // Should return midnight of Apr 15
        const expected = addMonths(startOfDay(createdAt), 3);
        expect(result).toEqual(expected);
      });

      it("should handle month-end dates (Jan 31 -> Feb 28)", () => {
        const createdAt = new Date("2025-01-31T14:30:00");
        const result = calculateNextReset(createdAt, 1, "month");

        // date-fns handles this as Feb 28 (or 29 in leap year)
        // 2025 is not a leap year
        const expected = addMonths(startOfDay(createdAt), 1);
        expect(result).toEqual(expected);
      });

      it("should handle leap year month-end (Jan 31 -> Feb 29)", () => {
        const createdAt = new Date("2024-01-31T14:30:00");
        const result = calculateNextReset(createdAt, 1, "month");

        // 2024 is a leap year
        const expected = addMonths(startOfDay(createdAt), 1);
        expect(result).toEqual(expected);
      });

      it("should handle year boundary", () => {
        const createdAt = new Date("2024-12-15T14:30:00");
        const result = calculateNextReset(createdAt, 1, "month");

        const expected = addMonths(startOfDay(createdAt), 1);
        expect(result).toEqual(expected);
      });
    });

    describe("None (lifetime) interval", () => {
      it('should return null for "none" reset unit', () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, "none");

        expect(result).toBeNull();
      });

      it("should return null for undefined reset unit", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, undefined as any);

        expect(result).toBeNull();
      });

      it("should return null for null reset unit", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, null as any);

        expect(result).toBeNull();
      });
    });

    describe("Edge cases", () => {
      it("should handle interval value of 0", () => {
        const createdAt = new Date("2025-01-15T14:30:00");
        const result = calculateNextReset(createdAt, 0, "day");

        // 0 interval should return creation day (0 days from start)
        const expected = addDays(startOfDay(createdAt), 0);
        expect(result).toEqual(expected);
      });

      it("should handle very large interval values", () => {
        const createdAt = new Date("2025-01-15T14:30:00");
        const result = calculateNextReset(createdAt, 365, "day");

        // Should return midnight 365 days later
        const expected = addDays(startOfDay(createdAt), 365);
        expect(result).toEqual(expected);
      });

      it("should handle invalid reset unit gracefully", () => {
        const createdAt = new Date("2025-01-15T14:30:00");
        const result = calculateNextReset(createdAt, 1, "invalid" as ResetUnit);

        expect(result).toBeNull();
      });

      it("should handle negative interval values", () => {
        const createdAt = new Date("2025-01-15T14:30:00");
        const result = calculateNextReset(createdAt, -1, "day");

        // Should handle gracefully (implementation dependent)
        // date-fns addDays with negative value goes backwards
        const expected = addDays(startOfDay(createdAt), -1);
        expect(result).toEqual(expected);
      });
    });
  });

  describe("getCountdownText()", () => {
    // Mock current time for consistent testing
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-01-20T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe("Days remaining", () => {
      it("should format days and hours when more than 1 day remains", () => {
        const nextReset = new Date("2025-01-22T15:30:00Z"); // 2 days, 3.5 hours
        const result = getCountdownText(nextReset);

        expect(result).toBe("2d 3h");
      });

      it("should format exactly 1 day remaining", () => {
        const nextReset = new Date("2025-01-21T12:00:00Z"); // Exactly 1 day
        const result = getCountdownText(nextReset);

        expect(result).toBe("1d 0h");
      });

      it("should format multiple days with fractional hours", () => {
        const nextReset = new Date("2025-01-25T18:45:00Z"); // 5 days, 6 hours, 45 min
        const result = getCountdownText(nextReset);

        expect(result).toBe("5d 6h");
      });
    });

    describe("Hours remaining", () => {
      it("should format hours and minutes when less than 1 day remains", () => {
        const nextReset = new Date("2025-01-20T18:30:00Z"); // 6 hours, 30 minutes
        const result = getCountdownText(nextReset);

        expect(result).toBe("6h 30m");
      });

      it("should format exactly 1 hour remaining", () => {
        const nextReset = new Date("2025-01-20T13:00:00Z"); // Exactly 1 hour
        const result = getCountdownText(nextReset);

        expect(result).toBe("1h 0m");
      });

      it("should format fractional hours", () => {
        const nextReset = new Date("2025-01-20T14:45:00Z"); // 2 hours, 45 minutes
        const result = getCountdownText(nextReset);

        expect(result).toBe("2h 45m");
      });
    });

    describe("Minutes remaining", () => {
      it("should format only minutes when less than 1 hour remains", () => {
        const nextReset = new Date("2025-01-20T12:30:00Z"); // 30 minutes
        const result = getCountdownText(nextReset);

        expect(result).toBe("30m remaining");
      });

      it("should format 1 minute remaining", () => {
        const nextReset = new Date("2025-01-20T12:01:00Z"); // 1 minute
        const result = getCountdownText(nextReset);

        expect(result).toBe("1m remaining");
      });

      it("should format 59 minutes remaining", () => {
        const nextReset = new Date("2025-01-20T12:59:00Z"); // 59 minutes
        const result = getCountdownText(nextReset);

        expect(result).toBe("59m remaining");
      });

      it("should show 0m remaining for less than 1 minute", () => {
        const nextReset = new Date("2025-01-20T12:00:30Z"); // 30 seconds
        const result = getCountdownText(nextReset);

        expect(result).toBe("0m remaining");
      });
    });

    describe("Past or null reset", () => {
      it('should return "Resetting..." for past reset time', () => {
        const nextReset = new Date("2025-01-19T12:00:00Z"); // Yesterday
        const result = getCountdownText(nextReset);

        expect(result).toBe("Resetting...");
      });

      it('should return "Resetting..." for exactly now', () => {
        const nextReset = new Date("2025-01-20T12:00:00Z"); // Right now
        const result = getCountdownText(nextReset);

        expect(result).toBe("Resetting...");
      });

      it("should return empty string for null reset", () => {
        const result = getCountdownText(null);

        expect(result).toBe("");
      });

      it("should return empty string for undefined reset", () => {
        const result = getCountdownText(undefined as any);

        expect(result).toBe("");
      });
    });

    describe("Boundary conditions", () => {
      it("should handle reset exactly 24 hours away", () => {
        const nextReset = new Date("2025-01-21T12:00:00Z"); // Exactly 24 hours
        const result = getCountdownText(nextReset);

        expect(result).toBe("1d 0h");
      });

      it("should handle reset exactly 60 minutes away", () => {
        const nextReset = new Date("2025-01-20T13:00:00Z"); // Exactly 60 minutes
        const result = getCountdownText(nextReset);

        expect(result).toBe("1h 0m");
      });

      it("should handle very long countdown (years)", () => {
        const nextReset = new Date("2026-01-20T12:00:00Z"); // 1 year away
        const result = getCountdownText(nextReset);

        // Should show days and hours (365 days)
        expect(result).toBe("365d 0h");
      });

      it("should round down partial minutes", () => {
        const nextReset = new Date("2025-01-20T12:05:59Z"); // 5 min 59 sec
        const result = getCountdownText(nextReset);

        expect(result).toBe("5m remaining");
      });

      it("should round down partial hours", () => {
        const nextReset = new Date("2025-01-20T15:59:59Z"); // 3h 59min 59sec
        const result = getCountdownText(nextReset);

        expect(result).toBe("3h 59m");
      });

      it("should round down partial days", () => {
        const nextReset = new Date("2025-01-21T11:59:59Z"); // 23h 59min 59sec
        const result = getCountdownText(nextReset);

        expect(result).toBe("23h 59m");
      });
    });
  });
});
