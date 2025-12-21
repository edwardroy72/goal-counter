/**
 * Tests for useGoalById hook
 *
 * Covers:
 * - Successful goal fetch
 * - Goal not found error
 * - Empty/invalid goal ID handling
 * - Cache invalidation subscription
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { useGoalById } from "../../hooks/useGoalById";

// Mock dependencies
jest.mock("../../db/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn((callback) => {
      // Return unsubscribe function
      return jest.fn();
    }),
    invalidate: jest.fn(),
  },
}));

jest.mock("../../db/schema", () => ({
  goals: { id: "id" },
}));

import { db } from "../../db/client";
import { queryCache } from "../../db/query-cache";

describe("useGoalById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("successful fetch", () => {
    it("should fetch goal by ID and return it", async () => {
      const mockGoal = {
        id: "test-goal-123",
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
      };

      (db.limit as jest.Mock).mockResolvedValueOnce([mockGoal]);

      const { result } = renderHook(() => useGoalById("test-goal-123"));

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.goal).toBe(null);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.goal).toEqual(mockGoal);
      expect(result.current.error).toBe(null);
    });

    it("should subscribe to cache invalidation", async () => {
      (db.limit as jest.Mock).mockResolvedValueOnce([]);

      renderHook(() => useGoalById("test-id"));

      expect(queryCache.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("error handling", () => {
    it("should set error when goal is not found", async () => {
      (db.limit as jest.Mock).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useGoalById("nonexistent-id"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.goal).toBe(null);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("nonexistent-id");
    });

    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database connection failed");
      (db.limit as jest.Mock).mockRejectedValueOnce(dbError);

      const { result } = renderHook(() => useGoalById("test-id"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.goal).toBe(null);
      expect(result.current.error).toEqual(dbError);
    });

    it("should handle empty goal ID", async () => {
      const { result } = renderHook(() => useGoalById(""));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.goal).toBe(null);
      // Should not throw error for empty ID, just return null
    });
  });

  describe("refetch functionality", () => {
    it("should provide a refetch function", async () => {
      const mockGoal = {
        id: "test-goal",
        title: "Test",
        unit: null,
        target: null,
        resetValue: 1,
        resetUnit: "day",
        quickAdd1: 1,
        quickAdd2: null,
        quickAdd3: null,
        quickAdd4: null,
        sortOrder: 0,
        status: "active",
        createdAt: new Date(),
      };

      (db.limit as jest.Mock).mockResolvedValue([mockGoal]);

      const { result } = renderHook(() => useGoalById("test-goal"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");

      // Call refetch
      await result.current.refetch();

      // Should have called db.limit twice (initial + refetch)
      expect(db.limit).toHaveBeenCalledTimes(2);
    });
  });
});
