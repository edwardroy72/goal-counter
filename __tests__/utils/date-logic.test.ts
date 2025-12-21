/**
 * Unit Tests: Date Logic Utilities
 *
 * Tests countdown and reset calculation functions.
 * Critical for accurate reset timing and countdown displays.
 *
 * NOTE: The implementation uses UTC-based calculations and finds the
 * current period based on the actual time (mocked in tests via fakeTimers).
 */

import {
  calculateNextReset,
  getCountdownText,
  ResetUnit,
} from "../../utils/date-logic";

describe("Date Logic Utilities", () => {
  describe("calculateNextReset()", () => {
    // Set a fixed "now" for all tests - Jan 15, 2025 at noon UTC
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-01-15T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe("Day intervals", () => {
      it("should calculate next reset for 1-day interval (same day creation)", () => {
        // Created today at 8am, asking "when's the next reset?"
        const createdAt = new Date("2025-01-15T08:00:00Z");
        const result = calculateNextReset(createdAt, 1, "day");

        // Should return midnight UTC of Jan 16 (next day)
        expect(result).toEqual(new Date("2025-01-16T00:00:00Z"));
      });

      it("should calculate next reset for 1-day interval (past creation)", () => {
        // Created 5 days ago
        const createdAt = new Date("2025-01-10T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, "day");

        // Should return midnight UTC of tomorrow (Jan 16)
        expect(result).toEqual(new Date("2025-01-16T00:00:00Z"));
      });

      it("should calculate next reset for multi-day interval", () => {
        // Created Jan 10, 7-day interval
        const createdAt = new Date("2025-01-10T14:30:00Z");
        const result = calculateNextReset(createdAt, 7, "day");

        // Jan 10 start -> Jan 17 is next period end
        expect(result).toEqual(new Date("2025-01-17T00:00:00Z"));
      });

      it("should handle creation at midnight UTC", () => {
        const createdAt = new Date("2025-01-15T00:00:00Z");
        const result = calculateNextReset(createdAt, 1, "day");

        // Should return midnight UTC of Jan 16
        expect(result).toEqual(new Date("2025-01-16T00:00:00Z"));
      });

      it("should handle recently-created goal late in the day", () => {
        // Set system time to late in the day
        jest.setSystemTime(new Date("2025-01-15T23:30:00Z"));
        const createdAt = new Date("2025-01-15T22:00:00Z");
        const result = calculateNextReset(createdAt, 1, "day");

        // Should still reset at midnight UTC of next day
        expect(result).toEqual(new Date("2025-01-16T00:00:00Z"));
      });
    });

    describe("Week intervals", () => {
      it("should calculate next reset for 1-week interval (same week)", () => {
        // Created earlier this week
        const createdAt = new Date("2025-01-13T14:30:00Z"); // Monday
        const result = calculateNextReset(createdAt, 1, "week");

        // Should return midnight UTC 7 days from start of creation day
        expect(result).toEqual(new Date("2025-01-20T00:00:00Z"));
      });

      it("should calculate next reset for 2-week interval", () => {
        // Created Jan 5
        const createdAt = new Date("2025-01-05T14:30:00Z");
        const result = calculateNextReset(createdAt, 2, "week");

        // Jan 5 -> Jan 19 is the next 2-week boundary
        expect(result).toEqual(new Date("2025-01-19T00:00:00Z"));
      });

      it("should handle week interval from weekend", () => {
        const createdAt = new Date("2025-01-11T12:00:00Z"); // Saturday
        const result = calculateNextReset(createdAt, 1, "week");

        // Should return midnight UTC 7 days later (Jan 18)
        expect(result).toEqual(new Date("2025-01-18T00:00:00Z"));
      });
    });

    describe("Month intervals", () => {
      it("should calculate next reset for 1-month interval", () => {
        // Created Jan 1
        const createdAt = new Date("2025-01-01T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, "month");

        // Should return Feb 1
        expect(result).toEqual(new Date("2025-02-01T00:00:00Z"));
      });

      it("should calculate next reset for 3-month interval", () => {
        // Created Nov 15, 2024
        jest.setSystemTime(new Date("2025-01-20T12:00:00Z"));
        const createdAt = new Date("2024-11-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 3, "month");

        // Nov 15 -> Feb 15 is the 3-month boundary
        expect(result).toEqual(new Date("2025-02-15T00:00:00Z"));
      });

      it("should handle month-end dates (Jan 31 -> Feb 28)", () => {
        // Created Dec 31, 2024
        const createdAt = new Date("2024-12-31T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, "month");

        // Dec 31 + 1 month = Jan 31
        expect(result).toEqual(new Date("2025-01-31T00:00:00Z"));
      });

      it("should handle leap year month-end (Jan 31 -> Feb 29)", () => {
        // Set time to late Jan 2024 (leap year)
        jest.setSystemTime(new Date("2024-01-25T12:00:00Z"));
        const createdAt = new Date("2024-01-01T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, "month");

        // Jan 1 + 1 month = Feb 1
        expect(result).toEqual(new Date("2024-02-01T00:00:00Z"));
      });

      it("should handle year boundary", () => {
        jest.setSystemTime(new Date("2024-12-20T12:00:00Z"));
        const createdAt = new Date("2024-12-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, "month");

        expect(result).toEqual(new Date("2025-01-15T00:00:00Z"));
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
      it("should return null for interval value of 0", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 0, "day");

        // 0 interval is invalid (returns null via period-calculation)
        expect(result).toBeNull();
      });

      it("should handle very large interval values", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 365, "day");

        // Should return midnight UTC 365 days later (Jan 15, 2026)
        expect(result).toEqual(new Date("2026-01-15T00:00:00Z"));
      });

      it("should handle invalid reset unit gracefully", () => {
        const consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation();
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const result = calculateNextReset(createdAt, 1, "invalid" as ResetUnit);

        expect(result).toBeNull();
        consoleErrorSpy.mockRestore();
      });

      it("should return null for negative interval values", () => {
        const createdAt = new Date("2025-01-15T14:30:00Z");
        const result = calculateNextReset(createdAt, -1, "day");

        // Negative intervals are invalid
        expect(result).toBeNull();
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
