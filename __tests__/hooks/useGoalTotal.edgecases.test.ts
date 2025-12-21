/**
 * Comprehensive edge case tests for useGoalTotal hook
 * Tests scenarios that weren't covered in the original test suite
 *
 * NOTE: These tests intentionally pass invalid/malformed data to test
 * error handling. We use `any` typing because we're testing how
 * the hook handles runtime errors from invalid inputs.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { db } from "../../db/client";
import { useGoalTotal } from "../../hooks/useGoalTotal";

/**
 * Helper to create a minimal invalid goal for error testing
 * Intentionally creates objects that don't match the Goal interface
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createInvalidGoal(overrides: Record<string, any> = {}): any {
  return {
    id: "test-goal",
    name: "Test Goal", // Intentionally using 'name' instead of 'title'
    createdAt: new Date(),
    resetValue: 1,
    resetUnit: "day",
    ...overrides,
  };
}

// Mock database
jest.mock("../../db/client", () => ({
  db: {
    select: jest.fn(),
  },
}));

// Mock query cache
jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()),
    invalidate: jest.fn(),
  },
}));

describe("useGoalTotal Edge Cases", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console.error for expected error tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Default mock that returns 0
    const mockSelect = {
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ total: null }]),
      }),
    };
    (db.select as jest.Mock).mockReturnValue(mockSelect);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Invalid createdAt values", () => {
    it("should handle undefined createdAt", async () => {
      const goal = createInvalidGoal({ createdAt: undefined });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle null createdAt", async () => {
      const goal = createInvalidGoal({ createdAt: null });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle invalid date string", async () => {
      const goal = createInvalidGoal({ createdAt: "invalid-date" });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle NaN createdAt", async () => {
      const goal = createInvalidGoal({ createdAt: NaN });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle timestamp in seconds (not milliseconds)", async () => {
      // Unix timestamp in seconds (should be converted to ms)
      const goal = createInvalidGoal({ createdAt: 1609459200 }); // 2021-01-01 in seconds

      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 100 }]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(100);
      });
    });
  });

  describe("Invalid resetUnit values", () => {
    it("should handle undefined resetUnit", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetUnit: undefined,
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle null resetUnit", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetUnit: null,
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle empty string resetUnit", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetUnit: "",
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle invalid resetUnit string", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetUnit: "invalid-unit",
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle 'none' resetUnit", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 500 }]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetUnit: "none",
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(500);
      });
    });
  });

  describe("Invalid resetValue", () => {
    it("should handle undefined resetValue", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetValue: undefined,
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle null resetValue", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetValue: null,
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle zero resetValue", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetValue: 0,
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle negative resetValue", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetValue: -5,
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle NaN resetValue", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetValue: NaN,
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });
  });

  describe("Extreme date values", () => {
    it("should handle very old createdAt (year 1970)", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 999 }]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({
        createdAt: new Date("1970-01-01"),
        resetUnit: "month",
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(999);
      });
    });

    it("should handle future createdAt", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 0 }]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const goal = createInvalidGoal({ createdAt: futureDate });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle very large resetValue without infinite loop", async () => {
      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
        resetValue: 99999,
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      // Should not hang or crash
      await waitFor(
        () => {
          expect(result.current).toBe(0);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Database error handling", () => {
    it("should handle database query failure gracefully", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error("Database error")),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({ createdAt: new Date("2024-01-01") });

      const { result } = renderHook(() => useGoalTotal(goal));

      // Should handle error and set total to 0
      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle malformed database response", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({ createdAt: new Date("2024-01-01") });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle empty array response", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({ createdAt: new Date("2024-01-01") });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle null total in response", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: null }]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({ createdAt: new Date("2024-01-01") });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle string total in response", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: "100" }]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({ createdAt: new Date("2024-01-01") });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(100);
      });
    });
  });

  describe("Goal object edge cases", () => {
    it("should handle missing goal id", async () => {
      const goal = createInvalidGoal({
        id: undefined,
        createdAt: new Date("2024-01-01"),
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle empty string goal id", async () => {
      const goal = createInvalidGoal({
        id: "",
        createdAt: new Date("2024-01-01"),
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it("should handle null goal", async () => {
      const goal = null;

      // This should not crash
      expect(() => {
        renderHook(() => useGoalTotal(goal as any));
      }).toThrow(); // Expected to throw during render
    });
  });

  describe("Timestamp normalization", () => {
    it("should correctly normalize millisecond timestamps", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 50 }]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({
        createdAt: 1704067200000, // 2024-01-01 in milliseconds
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(50);
      });
    });

    it("should correctly normalize second timestamps", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 75 }]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({
        createdAt: 1704067200, // 2024-01-01 in seconds
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(75);
      });
    });

    it("should handle Date object as createdAt", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 125 }]),
        }),
      };
      (db.select as jest.Mock).mockReturnValue(mockSelect);

      const goal = createInvalidGoal({
        createdAt: new Date("2024-01-01"),
      });

      const { result } = renderHook(() => useGoalTotal(goal));

      await waitFor(() => {
        expect(result.current).toBe(125);
      });
    });
  });
});
