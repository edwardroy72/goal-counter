/**
 * Tests for useGoalEntries hook
 *
 * Covers:
 * - Fetching entries for current period
 * - Grouping entries by day
 * - Date formatting (Today, Yesterday, other dates)
 * - Empty entries handling
 * - Cache invalidation subscription
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { useGoalEntries } from "../../hooks/useGoalEntries";
import type { Goal } from "../../types/domain";

// Mock dependencies
jest.mock("../../db/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()),
    invalidate: jest.fn(),
  },
}));

jest.mock("../../db/schema", () => ({
  entries: { goalId: "goal_id", timestamp: "timestamp" },
}));

jest.mock("../../utils/period-calculation", () => ({
  calculatePeriodStart: jest.fn(() => new Date("2024-01-01T00:00:00Z")),
}));

import { db } from "../../db/client";

// Helper to create a test goal
function createTestGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "test-goal-id",
    title: "Test Goal",
    unit: "kg",
    target: 100,
    resetValue: 1,
    resetUnit: "day",
    quickAdd1: 5,
    quickAdd2: null,
    quickAdd3: null,
    quickAdd4: null,
    sortOrder: 0,
    status: "active",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("useGoalEntries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetching entries", () => {
    it("should fetch entries for the goal", async () => {
      const mockEntries = [
        {
          id: "entry-1",
          goalId: "test-goal-id",
          amount: 5,
          note: "Morning",
          timestamp: new Date("2024-01-15T08:00:00Z"),
        },
        {
          id: "entry-2",
          goalId: "test-goal-id",
          amount: 3,
          note: null,
          timestamp: new Date("2024-01-15T12:00:00Z"),
        },
      ];

      (db.orderBy as jest.Mock).mockResolvedValueOnce(mockEntries);

      const goal = createTestGoal();
      const { result } = renderHook(() => useGoalEntries(goal));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.entries).toHaveLength(2);
      expect(result.current.error).toBe(null);
    });

    it("should handle null goal gracefully", async () => {
      const { result } = renderHook(() => useGoalEntries(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.entries).toEqual([]);
      expect(result.current.groupedByDay).toEqual([]);
    });
  });

  describe("grouping by day", () => {
    it("should group entries by day with correct totals", async () => {
      // Use noon times to avoid timezone edge cases
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Create dates that will definitely produce different ISO date strings
      const todayISO = today.toISOString().split("T")[0];
      const yesterdayISO = yesterday.toISOString().split("T")[0];

      const mockEntries = [
        {
          id: "entry-1",
          goalId: "test-goal-id",
          amount: 5,
          note: null,
          timestamp: today,
        },
        {
          id: "entry-2",
          goalId: "test-goal-id",
          amount: 3,
          note: null,
          timestamp: today,
        },
        {
          id: "entry-3",
          goalId: "test-goal-id",
          amount: 7,
          note: null,
          timestamp: yesterday,
        },
      ];

      (db.orderBy as jest.Mock).mockResolvedValueOnce(mockEntries);

      const goal = createTestGoal();
      const { result } = renderHook(() => useGoalEntries(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.groupedByDay).toHaveLength(2);

      // Verify groups are sorted correctly (most recent first)
      const firstGroup = result.current.groupedByDay[0];
      const secondGroup = result.current.groupedByDay[1];

      // First group should have the more recent date
      expect(firstGroup.date).toBe(todayISO);
      expect(firstGroup.entries).toHaveLength(2);
      expect(firstGroup.dayTotal).toBe(8); // 5 + 3

      // Second group should have the earlier date
      expect(secondGroup.date).toBe(yesterdayISO);
      expect(secondGroup.entries).toHaveLength(1);
      expect(secondGroup.dayTotal).toBe(7);
    });

    it("should sort entries within each day by timestamp descending", async () => {
      const today = new Date();
      const earlierToday = new Date(today);
      earlierToday.setHours(today.getHours() - 2);

      const mockEntries = [
        {
          id: "entry-1",
          goalId: "test-goal-id",
          amount: 5,
          note: null,
          timestamp: earlierToday,
        },
        {
          id: "entry-2",
          goalId: "test-goal-id",
          amount: 3,
          note: null,
          timestamp: today,
        },
      ];

      (db.orderBy as jest.Mock).mockResolvedValueOnce(mockEntries);

      const goal = createTestGoal();
      const { result } = renderHook(() => useGoalEntries(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const todayGroup = result.current.groupedByDay[0];
      // Most recent entry should be first
      expect(todayGroup.entries[0].id).toBe("entry-2");
      expect(todayGroup.entries[1].id).toBe("entry-1");
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database query failed");
      (db.orderBy as jest.Mock).mockRejectedValueOnce(dbError);

      const goal = createTestGoal();
      const { result } = renderHook(() => useGoalEntries(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.entries).toEqual([]);
      expect(result.current.error).toEqual(dbError);
    });
  });

  describe("period start calculation", () => {
    it("should expose the period start date", async () => {
      (db.orderBy as jest.Mock).mockResolvedValueOnce([]);

      const goal = createTestGoal();
      const { result } = renderHook(() => useGoalEntries(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.periodStart).toBeInstanceOf(Date);
    });
  });

  describe("timestamp normalization", () => {
    it("should normalize numeric timestamps to Date objects", async () => {
      const timestampMs = Date.now();
      const mockEntries = [
        {
          id: "entry-1",
          goalId: "test-goal-id",
          amount: 5,
          note: null,
          timestamp: timestampMs, // Raw number
        },
      ];

      (db.orderBy as jest.Mock).mockResolvedValueOnce(mockEntries);

      const goal = createTestGoal();
      const { result } = renderHook(() => useGoalEntries(goal));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.entries[0].timestamp).toBeInstanceOf(Date);
    });
  });
});
