/**
 * Unit Tests: Timezone Utilities
 *
 * Tests timezone-aware date calculations for:
 * - Period start/end calculations in different timezones
 * - Countdown text generation with timezone support
 * - Date formatting in user's timezone
 * - Edge cases around DST transitions
 */

import {
  calculatePeriodEndInTimezone,
  calculatePeriodStartInTimezone,
  formatDisplayDateInTimezone,
  formatTimeInTimezone,
  getCountdownTextWithTimezone,
  getDateKeyInTimezone,
  startOfDayInTimezone,
} from "../../utils/timezone-utils";

describe("Timezone Utilities", () => {
  describe("startOfDayInTimezone()", () => {
    it("should return start of day in UTC timezone", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = startOfDayInTimezone(date, "UTC");

      expect(result.toISOString()).toBe("2025-01-15T00:00:00.000Z");
    });

    it("should return start of day in America/New_York (behind UTC)", () => {
      // 2pm UTC on Jan 15 = 9am EST on Jan 15
      const date = new Date("2025-01-15T14:00:00Z");
      const result = startOfDayInTimezone(date, "America/New_York");

      // Start of day in EST is Jan 15 00:00 EST = Jan 15 05:00 UTC
      expect(result.toISOString()).toBe("2025-01-15T05:00:00.000Z");
    });

    it("should return start of day in Asia/Tokyo (ahead of UTC)", () => {
      // 2pm UTC on Jan 15 = 11pm JST on Jan 15
      const date = new Date("2025-01-15T14:00:00Z");
      const result = startOfDayInTimezone(date, "Asia/Tokyo");

      // Start of day in JST is Jan 15 00:00 JST = Jan 14 15:00 UTC
      expect(result.toISOString()).toBe("2025-01-14T15:00:00.000Z");
    });

    it("should handle date crossing timezone boundary", () => {
      // 2am UTC on Jan 15 is still Jan 14 in New York (9pm EST)
      const date = new Date("2025-01-15T02:00:00Z");
      const result = startOfDayInTimezone(date, "America/New_York");

      // Start of Jan 14 in EST = Jan 14 05:00 UTC
      expect(result.toISOString()).toBe("2025-01-14T05:00:00.000Z");
    });
  });

  describe("calculatePeriodStartInTimezone()", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Set to Jan 15, 2025 at 2pm UTC
      jest.setSystemTime(new Date("2025-01-15T14:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe("Daily intervals", () => {
      it("should calculate period start for 1-day interval in UTC", () => {
        const createdAt = new Date("2025-01-10T08:00:00Z");
        const result = calculatePeriodStartInTimezone(
          createdAt,
          1,
          "day",
          "UTC"
        );

        // Current day start in UTC
        expect(result.toISOString()).toBe("2025-01-15T00:00:00.000Z");
      });

      it("should calculate period start for 1-day interval in America/New_York", () => {
        // Current time: 2pm UTC = 9am EST on Jan 15
        const createdAt = new Date("2025-01-10T08:00:00Z");
        const result = calculatePeriodStartInTimezone(
          createdAt,
          1,
          "day",
          "America/New_York"
        );

        // Start of current day in EST = Jan 15 00:00 EST = Jan 15 05:00 UTC
        expect(result.toISOString()).toBe("2025-01-15T05:00:00.000Z");
      });

      it("should handle multi-day interval", () => {
        // Goal created Jan 10, 3-day interval
        const createdAt = new Date("2025-01-10T08:00:00Z");
        const result = calculatePeriodStartInTimezone(
          createdAt,
          3,
          "day",
          "UTC"
        );

        // Jan 10 + 3 = Jan 13, Jan 13 + 3 = Jan 16
        // Current is Jan 15, so period start is Jan 13
        expect(result.toISOString()).toBe("2025-01-13T00:00:00.000Z");
      });

      it("should handle goal created in the future of user timezone", () => {
        // Goal created today at 10pm UTC, user in New York (5pm EST)
        const createdAt = new Date("2025-01-15T22:00:00Z");
        const result = calculatePeriodStartInTimezone(
          createdAt,
          1,
          "day",
          "America/New_York"
        );

        // Start of current day in EST
        expect(result.toISOString()).toBe("2025-01-15T05:00:00.000Z");
      });
    });

    describe("Weekly intervals", () => {
      it("should calculate period start for 1-week interval", () => {
        // Created Jan 6 (Monday)
        const createdAt = new Date("2025-01-06T08:00:00Z");
        const result = calculatePeriodStartInTimezone(
          createdAt,
          1,
          "week",
          "UTC"
        );

        // Jan 6 + 7 = Jan 13, Jan 13 + 7 = Jan 20
        // Current is Jan 15, so period start is Jan 13
        expect(result.toISOString()).toBe("2025-01-13T00:00:00.000Z");
      });

      it("should calculate period start for 2-week interval", () => {
        // Created Jan 1
        const createdAt = new Date("2025-01-01T08:00:00Z");
        const result = calculatePeriodStartInTimezone(
          createdAt,
          2,
          "week",
          "UTC"
        );

        // Jan 1 + 14 = Jan 15
        // Current is Jan 15, so period start is Jan 15
        expect(result.toISOString()).toBe("2025-01-15T00:00:00.000Z");
      });
    });

    describe("Monthly intervals", () => {
      it("should calculate period start for 1-month interval", () => {
        // Created Dec 15
        const createdAt = new Date("2024-12-15T08:00:00Z");
        const result = calculatePeriodStartInTimezone(
          createdAt,
          1,
          "month",
          "UTC"
        );

        // Dec 15 + 1 month = Jan 15
        // Current is Jan 15, so period start is Jan 15
        expect(result.toISOString()).toBe("2025-01-15T00:00:00.000Z");
      });

      it("should handle month with different days", () => {
        jest.setSystemTime(new Date("2025-03-15T14:00:00Z"));
        // Created Jan 31
        const createdAt = new Date("2025-01-31T08:00:00Z");
        const result = calculatePeriodStartInTimezone(
          createdAt,
          1,
          "month",
          "UTC"
        );

        // Jan 31 + 1 month = Feb 28 (date-fns adjusts for shorter months)
        // Feb 28 + 1 month = Mar 28
        // Current is Mar 15, so we should be in the Feb 28 period
        expect(result.getMonth()).toBe(1); // February
      });
    });

    describe("None interval (no reset)", () => {
      it("should return goal creation date start for none interval", () => {
        const createdAt = new Date("2025-01-10T14:30:00Z");
        const result = calculatePeriodStartInTimezone(
          createdAt,
          1,
          "none",
          "UTC"
        );

        // Should return start of creation day
        expect(result.toISOString()).toBe("2025-01-10T00:00:00.000Z");
      });
    });
  });

  describe("calculatePeriodEndInTimezone()", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-01-15T14:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return next day start for 1-day interval", () => {
      const createdAt = new Date("2025-01-10T08:00:00Z");
      const result = calculatePeriodEndInTimezone(createdAt, 1, "day", "UTC");

      expect(result.toISOString()).toBe("2025-01-16T00:00:00.000Z");
    });

    it("should return end of week for 1-week interval", () => {
      const createdAt = new Date("2025-01-06T08:00:00Z");
      const result = calculatePeriodEndInTimezone(createdAt, 1, "week", "UTC");

      // Period start is Jan 13, end is Jan 20
      expect(result.toISOString()).toBe("2025-01-20T00:00:00.000Z");
    });

    it("should return null for none interval", () => {
      const createdAt = new Date("2025-01-10T08:00:00Z");
      const result = calculatePeriodEndInTimezone(createdAt, 1, "none", "UTC");

      expect(result).toBeNull();
    });
  });

  describe("getCountdownTextWithTimezone()", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-01-15T14:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return hours left for same day reset", () => {
      // Next reset at midnight UTC (10 hours from 2pm)
      const nextReset = new Date("2025-01-16T00:00:00Z");
      const result = getCountdownTextWithTimezone(nextReset);

      // 2pm UTC, resets at midnight = 10 hours
      expect(result).toBe("10h 0m left");
    });

    it("should return days left for multi-day reset", () => {
      // Next reset in about 1.5 days
      const nextReset = new Date("2025-01-17T00:00:00Z");
      const result = getCountdownTextWithTimezone(nextReset);

      // Current Jan 15, 2pm = ~1d 10h
      expect(result).toBe("1d 10h left");
    });

    it("should return empty string for null reset", () => {
      const result = getCountdownTextWithTimezone(null);

      expect(result).toBe("");
    });

    it("should include minutes when less than 1 hour", () => {
      // Set to 11:30pm UTC
      jest.setSystemTime(new Date("2025-01-15T23:30:00Z"));
      const nextReset = new Date("2025-01-16T00:00:00Z");
      const result = getCountdownTextWithTimezone(nextReset);

      expect(result).toBe("30m left");
    });

    it("should show less than 1 minute when very close", () => {
      // 30 seconds before reset
      jest.setSystemTime(new Date("2025-01-15T23:59:30Z"));
      const nextReset = new Date("2025-01-16T00:00:00Z");
      const result = getCountdownTextWithTimezone(nextReset);

      expect(result).toBe("< 1m left");
    });

    it("should show Resetting when past the reset time", () => {
      const nextReset = new Date("2025-01-15T10:00:00Z"); // Already passed
      const result = getCountdownTextWithTimezone(nextReset);

      expect(result).toBe("Resetting...");
    });
  });

  describe("formatDisplayDateInTimezone()", () => {
    it("should format date with short month format", () => {
      const date = new Date("2025-01-15T14:00:00Z");
      const result = formatDisplayDateInTimezone(date, "UTC");

      expect(result).toBe("Jan 15");
    });

    it("should adjust date display for timezone", () => {
      // 2am UTC is still Jan 14 in New York (9pm EST on Jan 14)
      const date = new Date("2025-01-15T02:00:00Z");
      const result = formatDisplayDateInTimezone(date, "America/New_York");

      expect(result).toBe("Jan 14");
    });

    it("should show 'Today' for current day", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-01-15T14:00:00Z"));

      const date = new Date("2025-01-15T10:00:00Z");
      const result = formatDisplayDateInTimezone(date, "UTC");

      expect(result).toBe("Today");

      jest.useRealTimers();
    });

    it("should show 'Yesterday' for previous day", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2025-01-15T14:00:00Z"));

      const date = new Date("2025-01-14T10:00:00Z");
      const result = formatDisplayDateInTimezone(date, "UTC");

      expect(result).toBe("Yesterday");

      jest.useRealTimers();
    });
  });

  describe("formatTimeInTimezone()", () => {
    it("should format time in 24-hour format for UTC", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = formatTimeInTimezone(date, "UTC");

      expect(result).toBe("14:30");
    });

    it("should format time in user timezone", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = formatTimeInTimezone(date, "America/New_York");

      // 2:30pm UTC = 9:30am EST (UTC-5 in January)
      expect(result).toBe("09:30");
    });
  });

  describe("getDateKeyInTimezone()", () => {
    it("should return date key in YYYY-MM-DD format for UTC", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = getDateKeyInTimezone(date, "UTC");

      expect(result).toBe("2025-01-15");
    });

    it("should adjust date key for timezone", () => {
      // 2am UTC is Jan 14 in New York
      const date = new Date("2025-01-15T02:00:00Z");
      const result = getDateKeyInTimezone(date, "America/New_York");

      expect(result).toBe("2025-01-14");
    });

    it("should handle Tokyo timezone (ahead of UTC)", () => {
      // 3pm UTC Jan 15 = midnight Jan 16 in Tokyo
      const date = new Date("2025-01-15T15:00:00Z");
      const result = getDateKeyInTimezone(date, "Asia/Tokyo");

      expect(result).toBe("2025-01-16");
    });
  });
});
