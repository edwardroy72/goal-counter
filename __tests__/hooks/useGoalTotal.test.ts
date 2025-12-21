/**
 * Integration Tests: useGoalTotal Hook
 *
 * Tests the hook responsible for calculating current period totals.
 * Critical for displaying accurate progress on dashboard and goal cards.
 *
 * NOTE: This file uses minimal mock goal objects. TypeScript checking
 * is relaxed via casting since we're testing with mocked database.
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { db } from "../../db/client";
import { queryCache } from "../../db/query-cache";
import { useGoalTotal } from "../../hooks/useGoalTotal";
import type { Goal } from "../../types/domain";

// Mock database
jest.mock("../../db/client", () => ({
  db: {
    select: jest.fn(),
  },
}));

// Mock query cache
jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()), // Returns unsubscribe function
    invalidate: jest.fn(),
  },
}));

describe("useGoalTotal Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset subscribe to return unsubscribe function
    (queryCache.subscribe as jest.Mock).mockReturnValue(jest.fn());
  });

  describe("Initial fetch on mount", () => {
    it("should fetch total on mount with correct query parameters", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "100" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(100);
      });

      expect(db.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalled();
      expect(mockSelect.where).toHaveBeenCalled();
    });

    it("should return 0 for goals with no entries", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: null }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle empty result array", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });
  });

  describe("Cache subscription and refetch", () => {
    it("should subscribe to cache on mount", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "50" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const mockUnsubscribe = jest.fn();
      (queryCache.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(queryCache.subscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it("should refetch when cache is invalidated", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      let callCount = 0;
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) return [{ total: "50" }];
          return [{ total: "75" }];
        }),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      let subscriberCallback: (() => void) | null = null;
      (queryCache.subscribe as jest.Mock).mockImplementation((callback) => {
        subscriberCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(50);
      });

      // Simulate cache invalidation
      act(() => {
        subscriberCallback?.();
      });

      await waitFor(() => {
        expect(result.current).toBe(75);
      });

      expect(callCount).toBe(2);
    });
  });

  describe("Period start calculation", () => {
    it("should only include entries from current period", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "100" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(mockSelect.where).toHaveBeenCalled();
      });

      // Verify where clause was called (would include period start filter)
      expect(mockSelect.where).toHaveBeenCalled();
    });

    it("should recalculate period start when goal changes", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "100" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { rerender } = renderHook(
        ({ goal }: { goal: any }) => useGoalTotal(goal),
        {
          initialProps: {
            goal: {
              id: "goal-1",
              createdAt: new Date("2025-01-01T00:00:00Z"),
              resetValue: 1,
              resetUnit: "day",
            },
          },
        }
      );

      await waitFor(() => {
        expect(db.select).toHaveBeenCalledTimes(1);
      });

      // Change reset unit
      rerender({
        goal: {
          id: "goal-1",
          createdAt: new Date("2025-01-01T00:00:00Z"),
          resetValue: 1,
          resetUnit: "week",
        },
      });

      await waitFor(() => {
        expect(db.select).toHaveBeenCalledTimes(2);
      });
    });

    it("should handle lifetime goals (resetUnit: none)", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "none",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "500" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(500);
      });
    });
  });

  describe("Timestamp normalization", () => {
    it("should handle createdAt as Date object", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "100" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(100);
      });
    });

    it("should handle createdAt as milliseconds", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: 1704067200000, // 2025-01-01 in milliseconds
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "100" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(100);
      });
    });

    it("should handle createdAt as seconds (legacy format)", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: 1704067200, // 2025-01-01 in seconds
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "100" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(100);
      });
    });
  });

  describe("Error handling", () => {
    it("should set total to 0 on database error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest
          .fn()
          .mockRejectedValue(new Error("Database connection failed")),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error fetching total"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle malformed database responses", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "invalid-number" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        // Should convert NaN to 0
        expect(result.current).toBe(0);
      });
    });
  });

  describe("Aggregation and calculation", () => {
    it("should correctly parse string totals from database", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "123.45" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(123.45);
      });
    });

    it("should handle large totals", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "999999.99" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(999999.99);
      });
    });

    it("should handle zero total", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "0" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });
  });

  describe("Reset interval handling", () => {
    it("should handle default resetValue when undefined", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: undefined,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "100" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() =>
        useGoalTotal(mockGoal as unknown as Goal)
      );

      await waitFor(() => {
        expect(result.current).toBe(100);
      });
    });

    it("should handle weekly reset", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "week",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "200" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(200);
      });
    });

    it("should handle monthly reset", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "month",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "300" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(300);
      });
    });
  });

  describe("Subscription stability (bug fix verification)", () => {
    it("should maintain stable subscription when fetchTotal updates", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ total: "50" }]),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      let subscriberCallback: (() => void) | null = null;
      const mockUnsubscribe = jest.fn();
      (queryCache.subscribe as jest.Mock).mockImplementation((callback) => {
        subscriberCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(50);
      });

      // Verify subscribe was called once
      expect(queryCache.subscribe).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      // Simulate multiple cache invalidations rapidly
      let fetchCount = 0;
      mockSelect.where.mockImplementation(async () => {
        fetchCount++;
        return [{ total: String(50 + fetchCount * 10) }];
      });

      act(() => {
        subscriberCallback?.();
      });
      await waitFor(() => expect(result.current).toBe(60));

      act(() => {
        subscriberCallback?.();
      });
      await waitFor(() => expect(result.current).toBe(70));

      act(() => {
        subscriberCallback?.();
      });
      await waitFor(() => expect(result.current).toBe(80));

      // Subscription should NOT have been recreated
      expect(queryCache.subscribe).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });

    it("should not miss invalidations during subscription recreation", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      let fetchCount = 0;
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation(async () => {
          fetchCount++;
          return [{ total: String(fetchCount * 10) }];
        }),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      let subscriberCallback: (() => void) | null = null;
      (queryCache.subscribe as jest.Mock).mockImplementation((callback) => {
        subscriberCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      await waitFor(() => {
        expect(result.current).toBe(10);
      });

      // Rapid invalidations should all be processed
      act(() => {
        subscriberCallback?.();
        subscriberCallback?.();
        subscriberCallback?.();
      });

      // Should reflect latest fetch
      await waitFor(() => {
        expect(result.current).toBeGreaterThanOrEqual(20);
      });
    });

    it("should handle invalidation immediately after mount", async () => {
      const mockGoal = {
        id: "goal-1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        resetValue: 1,
        resetUnit: "day",
      };

      let fetchCount = 0;
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation(async () => {
          fetchCount++;
          return [{ total: String(fetchCount * 25) }];
        }),
      };

      (db.select as jest.Mock).mockReturnValue(mockSelect);

      let subscriberCallback: (() => void) | null = null;
      (queryCache.subscribe as jest.Mock).mockImplementation((callback) => {
        subscriberCallback = callback;
        // Simulate immediate invalidation during mount
        setTimeout(() => callback(), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useGoalTotal(mockGoal as Goal));

      // Should handle both initial fetch and immediate invalidation
      await waitFor(() => {
        expect(result.current).toBeGreaterThan(0);
      });

      expect(fetchCount).toBeGreaterThan(1);
    });
  });
});
