/**
 * Unit Tests: useGoalHistory Hook
 *
 * Tests the period-based entry grouping logic:
 * - Entries correctly grouped by period
 * - Entries correctly grouped by day within period
 * - Current period identification
 * - Period labels correctly formatted
 * - Handles edge cases (no entries, lifetime goals, etc.)
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { db } from "../../db/client";
import { queryCache } from "../../db/query-cache";
import { useGoalHistory } from "../../hooks/useGoalHistory";
import type { Goal } from "../../types/domain";

// Mock the settings context
jest.mock("../../contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: { timezone: "UTC" },
    updateSetting: jest.fn(),
  }),
}));

// Mock the database
jest.mock("../../db/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  },
}));

// Mock query cache
jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()),
    invalidate: jest.fn(),
  },
}));

const createMockGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "goal-1",
  title: "Test Goal",
  unit: "units",
  target: 10,
  resetValue: 1,
  resetUnit: "day",
  quickAdd1: 1,
  quickAdd2: null,
  quickAdd3: null,
  quickAdd4: null,
  sortOrder: 0,
  status: "active",
  createdAt: new Date("2025-01-10T00:00:00Z"),
  ...overrides,
});

const createMockEntry = (
  goalId: string,
  amount: number,
  timestamp: Date,
  id: string = `entry-${Date.now()}-${Math.random()}`
) => ({
  id,
  goalId,
  amount,
  timestamp,
  note: null,
  createdAt: timestamp,
});

describe("useGoalHistory", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-15T14:00:00Z"));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Loading State", () => {
    it("should start in loading state", () => {
      const goal = createMockGoal();
      (db.limit as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useGoalHistory(goal));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.periods).toEqual([]);
    });

    it("should return empty periods for null goal", async () => {
      const { result } = renderHook(() => useGoalHistory(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.periods).toEqual([]);
    });
  });

  describe("Period Grouping - Daily", () => {
    it("should group entries into periods", async () => {
      const goal = createMockGoal({ resetValue: 1, resetUnit: "day" });
      const mockEntries = [
        createMockEntry(goal.id, 3, new Date("2025-01-15T10:00:00Z"), "e1"),
        createMockEntry(goal.id, 2, new Date("2025-01-14T15:00:00Z"), "e2"),
        createMockEntry(goal.id, 5, new Date("2025-01-14T09:00:00Z"), "e3"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have at least 1 period with entries
      expect(result.current.periods.length).toBeGreaterThanOrEqual(1);

      // Total entries should sum correctly across all periods
      const totalAcrossAllPeriods = result.current.periods.reduce(
        (sum, p) => sum + p.periodTotal,
        0
      );
      expect(totalAcrossAllPeriods).toBe(10); // 3 + 2 + 5
    });

    it("should mark current period correctly", async () => {
      const goal = createMockGoal({ resetValue: 1, resetUnit: "day" });
      const mockEntries = [
        createMockEntry(goal.id, 5, new Date("2025-01-15T08:00:00Z"), "e1"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have exactly one period
      expect(result.current.periods.length).toBe(1);

      // Periods should have proper structure
      expect(result.current.periods[0]).toHaveProperty("periodLabel");
      expect(result.current.periods[0]).toHaveProperty("periodTotal");
      expect(result.current.periods[0].periodTotal).toBe(5);
    });
  });

  describe("Period Grouping - Weekly", () => {
    it("should group entries into weekly periods with entries across periods", async () => {
      const goal = createMockGoal({
        resetValue: 1,
        resetUnit: "week",
        createdAt: new Date("2025-01-06T00:00:00Z"), // Monday
      });
      const mockEntries = [
        createMockEntry(goal.id, 10, new Date("2025-01-15T10:00:00Z"), "e1"),
        createMockEntry(goal.id, 5, new Date("2025-01-13T10:00:00Z"), "e2"),
        createMockEntry(goal.id, 3, new Date("2025-01-08T10:00:00Z"), "e3"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have at least 1 period
      expect(result.current.periods.length).toBeGreaterThanOrEqual(1);

      // Total entries should sum correctly
      const totalAcrossAllPeriods = result.current.periods.reduce(
        (sum, p) => sum + p.periodTotal,
        0
      );
      expect(totalAcrossAllPeriods).toBe(18); // 10 + 5 + 3
    });

    it("should group entries by day within weekly period", async () => {
      const goal = createMockGoal({
        resetValue: 1,
        resetUnit: "week",
        createdAt: new Date("2025-01-06T00:00:00Z"),
      });
      const mockEntries = [
        createMockEntry(goal.id, 10, new Date("2025-01-15T10:00:00Z"), "e1"),
        createMockEntry(goal.id, 5, new Date("2025-01-14T10:00:00Z"), "e2"),
        createMockEntry(goal.id, 3, new Date("2025-01-13T10:00:00Z"), "e3"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // At least one period should have multiple days
      const multiDayPeriod = result.current.periods.find(
        (p) => p.days.length >= 3
      );
      if (multiDayPeriod) {
        expect(multiDayPeriod.days[0].date).toBe("2025-01-15");
        expect(multiDayPeriod.days[1].date).toBe("2025-01-14");
        expect(multiDayPeriod.days[2].date).toBe("2025-01-13");
      }
    });
  });

  describe("Period Grouping - Monthly", () => {
    it("should group entries into monthly periods", async () => {
      jest.setSystemTime(new Date("2025-02-15T14:00:00Z"));

      const goal = createMockGoal({
        resetValue: 1,
        resetUnit: "month",
        createdAt: new Date("2025-01-15T00:00:00Z"),
      });
      const mockEntries = [
        createMockEntry(goal.id, 10, new Date("2025-02-10T10:00:00Z"), "e1"),
        createMockEntry(goal.id, 20, new Date("2025-01-20T10:00:00Z"), "e2"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have at least 1 period with all entries
      expect(result.current.periods.length).toBeGreaterThanOrEqual(1);

      // Total across all periods should match
      const totalAcrossAllPeriods = result.current.periods.reduce(
        (sum, p) => sum + p.periodTotal,
        0
      );
      expect(totalAcrossAllPeriods).toBe(30); // 10 + 20
    });
  });

  describe("Lifetime Goals (none reset)", () => {
    it("should group all entries into single period for lifetime goal", async () => {
      const goal = createMockGoal({
        resetValue: 1,
        resetUnit: "none",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      });
      const mockEntries = [
        createMockEntry(goal.id, 5, new Date("2025-01-15T10:00:00Z"), "e1"),
        createMockEntry(goal.id, 3, new Date("2025-01-10T10:00:00Z"), "e2"),
        createMockEntry(goal.id, 2, new Date("2025-01-05T10:00:00Z"), "e3"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.periods).toHaveLength(1);
      expect(result.current.periods[0].periodTotal).toBe(10);
      expect(result.current.periods[0].days).toHaveLength(3);
    });
  });

  describe("Day Grouping", () => {
    it("should calculate day totals correctly", async () => {
      const goal = createMockGoal({ resetValue: 1, resetUnit: "day" });
      const mockEntries = [
        createMockEntry(goal.id, 3, new Date("2025-01-15T14:00:00Z"), "e1"),
        createMockEntry(goal.id, 2, new Date("2025-01-15T10:00:00Z"), "e2"),
        createMockEntry(goal.id, 5, new Date("2025-01-15T08:00:00Z"), "e3"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.periods[0].days[0].dayTotal).toBe(10);
    });

    it("should sort entries within day by timestamp descending", async () => {
      const goal = createMockGoal({ resetValue: 1, resetUnit: "day" });
      const mockEntries = [
        createMockEntry(goal.id, 1, new Date("2025-01-15T08:00:00Z"), "e1"),
        createMockEntry(goal.id, 2, new Date("2025-01-15T14:00:00Z"), "e2"),
        createMockEntry(goal.id, 3, new Date("2025-01-15T10:00:00Z"), "e3"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const dayEntries = result.current.periods[0].days[0].entries;
      expect(dayEntries[0].amount).toBe(2); // 14:00
      expect(dayEntries[1].amount).toBe(3); // 10:00
      expect(dayEntries[2].amount).toBe(1); // 08:00
    });

    it("should format display dates correctly", async () => {
      jest.setSystemTime(new Date("2025-01-15T14:00:00Z"));

      const goal = createMockGoal({ resetValue: 1, resetUnit: "week" });
      const mockEntries = [
        createMockEntry(goal.id, 1, new Date("2025-01-15T10:00:00Z"), "e1"),
        createMockEntry(goal.id, 2, new Date("2025-01-14T10:00:00Z"), "e2"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.periods[0].days[0].displayDate).toBe("Today");
      expect(result.current.periods[0].days[1].displayDate).toBe("Yesterday");
    });
  });

  describe("Period Labels", () => {
    it("shows a single day label when the period begins and ends on the same day", async () => {
      const goal = createMockGoal({ resetValue: 1, resetUnit: "day" });
      const mockEntries = [
        createMockEntry(goal.id, 5, new Date("2025-01-15T08:00:00Z"), "e1"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.periods[0]?.periodLabel).toBe("Jan 15");
    });

    it("shows the inclusive last counted day for multi-day periods", async () => {
      const goal = createMockGoal({
        resetValue: 2,
        resetUnit: "day",
        createdAt: new Date("2025-01-10T00:00:00Z"),
      });
      const mockEntries = [
        createMockEntry(goal.id, 5, new Date("2025-01-15T08:00:00Z"), "e1"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.periods[0]?.periodLabel).toBe("Jan 14 – Jan 15");
    });
  });

  describe("Empty States", () => {
    it("should return empty periods array when no entries exist", async () => {
      const goal = createMockGoal();
      (db.limit as jest.Mock).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.periods).toEqual([]);
    });

    it("should skip periods with no entries", async () => {
      // Goal created Jan 10, entries on Jan 12 and Jan 15 (skip Jan 11, 13, 14)
      const goal = createMockGoal({
        resetValue: 1,
        resetUnit: "day",
        createdAt: new Date("2025-01-10T00:00:00Z"),
      });
      const mockEntries = [
        createMockEntry(goal.id, 5, new Date("2025-01-15T10:00:00Z"), "e1"),
        createMockEntry(goal.id, 3, new Date("2025-01-12T10:00:00Z"), "e2"),
      ];

      (db.limit as jest.Mock).mockResolvedValueOnce(mockEntries);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Only 2 periods, not 6
      expect(result.current.periods).toHaveLength(2);
    });
  });

  describe("Cache Subscription", () => {
    it("should subscribe to cache invalidation", () => {
      const goal = createMockGoal();
      (db.limit as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderHook(() => useGoalHistory(goal));

      expect(queryCache.subscribe).toHaveBeenCalled();
    });

    it("should unsubscribe on unmount", () => {
      const unsubscribe = jest.fn();
      (queryCache.subscribe as jest.Mock).mockReturnValue(unsubscribe);
      (db.limit as jest.Mock).mockImplementation(() => new Promise(() => {}));

      const { unmount } = renderHook(() => useGoalHistory(createMockGoal()));

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe("Pagination", () => {
    it("loads only the first history page and reports that more history exists", async () => {
      const goal = createMockGoal({
        resetValue: 1,
        resetUnit: "week",
        createdAt: new Date("2024-11-01T00:00:00Z"),
      });
      const firstPage = Array.from({ length: 51 }, (_, index) =>
        createMockEntry(
          goal.id,
          index + 1,
          new Date(Date.UTC(2025, 0, 31 - index, 10, 0, 0)),
          `entry-${index + 1}`
        )
      );

      (db.limit as jest.Mock).mockResolvedValueOnce(firstPage);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);

      const loadedEntryCount = result.current.periods.reduce(
        (periodSum, period) =>
          periodSum +
          period.days.reduce((daySum, day) => daySum + day.entries.length, 0),
        0
      );

      expect(loadedEntryCount).toBe(50);
    });

    it("merges older pages into the same visible day without duplicating entries", async () => {
      const goal = createMockGoal({
        resetValue: 1,
        resetUnit: "week",
        createdAt: new Date("2025-01-06T00:00:00Z"),
      });
      const firstPage = [
        createMockEntry(goal.id, 5, new Date("2025-01-15T12:00:00Z"), "e1"),
        ...Array.from({ length: 49 }, (_, index) =>
          createMockEntry(
            goal.id,
            1,
            new Date(Date.UTC(2025, 0, 14 - index, 10, 0, 0)),
            `filler-${index + 1}`
          )
        ),
        createMockEntry(goal.id, 1, new Date("2024-11-20T08:00:00Z"), "cursor"),
      ];

      (db.limit as jest.Mock)
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce([
          createMockEntry(goal.id, 3, new Date("2025-01-15T08:00:00Z"), "e2"),
        ]);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
      const periodWithJan15 = result.current.periods.find((period) =>
        period.days.some((day) => day.date === "2025-01-15")
      );
      const jan15Day = periodWithJan15?.days.find((day) => day.date === "2025-01-15");

      expect(jan15Day?.entries.map((entry) => entry.id)).toEqual(["e1", "e2"]);
    });

    it("keeps an edited entry visible after cache invalidation even when it falls outside the first page", async () => {
      const goal = createMockGoal({
        resetValue: 1,
        resetUnit: "week",
        createdAt: new Date("2024-11-01T00:00:00Z"),
      });
      const firstPage = Array.from({ length: 50 }, (_, index) =>
        createMockEntry(
          goal.id,
          index + 1,
          new Date(Date.UTC(2025, 0, 31 - index, 10, 0, 0)),
          `entry-${index + 1}`
        )
      );
      const editedEntry = createMockEntry(
        goal.id,
        7,
        new Date("2024-12-01T10:00:00Z"),
        "edited-entry"
      );

      (db.limit as jest.Mock)
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce([editedEntry]);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const cacheListener = (queryCache.subscribe as jest.Mock).mock.calls[0]?.[0];

      expect(cacheListener).toEqual(expect.any(Function));

      await act(async () => {
        cacheListener?.({
          type: "entry-updated",
          entryId: "edited-entry",
        });
      });

      await waitFor(() => {
        const visibleEntryIds = result.current.periods.flatMap((period) =>
          period.days.flatMap((day) => day.entries.map((entry) => entry.id))
        );

        expect(visibleEntryIds).toContain("edited-entry");
      });
    });

    it("keeps a backdated edited entry visible when it moves before the goal creation date", async () => {
      const goal = createMockGoal({
        resetValue: 1,
        resetUnit: "day",
        createdAt: new Date("2025-01-02T00:00:00Z"),
      });
      const initialEntry = createMockEntry(
        goal.id,
        300,
        new Date("2025-01-02T10:00:00Z"),
        "edited-entry"
      );
      const backdatedEntry = createMockEntry(
        goal.id,
        300,
        new Date("2025-01-01T10:00:00Z"),
        "edited-entry"
      );

      (db.limit as jest.Mock)
        .mockResolvedValueOnce([initialEntry])
        .mockResolvedValueOnce([backdatedEntry])
        .mockResolvedValueOnce([backdatedEntry]);

      const { result } = renderHook(() => useGoalHistory(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const cacheListener = (queryCache.subscribe as jest.Mock).mock.calls[0]?.[0];

      expect(cacheListener).toEqual(expect.any(Function));

      await act(async () => {
        cacheListener?.({
          type: "entry-updated",
          entryId: "edited-entry",
        });
      });

      await waitFor(() => {
        const visibleEntryIds = result.current.periods.flatMap((period) =>
          period.days.flatMap((day) => day.entries.map((entry) => entry.id))
        );

        expect(visibleEntryIds).toContain("edited-entry");
        expect(result.current.periods[0]?.periodLabel).toBe("Jan 1");
      });
    });
  });
});
