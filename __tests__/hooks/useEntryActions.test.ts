/**
 * Tests for useEntryActions hook
 *
 * Covers:
 * - Entry update (amount and note)
 * - Entry deletion
 * - Validation (positive amounts, required fields)
 * - Error handling
 * - Cache invalidation
 * - Haptic feedback
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useEntryActions } from "../../hooks/useEntryActions";

// Mock dependencies
const mockUpdate = jest.fn().mockReturnThis();
const mockSet = jest.fn().mockReturnThis();
const mockWhere = jest.fn().mockResolvedValue(undefined);
const mockDelete = jest.fn().mockReturnThis();
const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);

jest.mock("../../db/client", () => ({
  db: {
    update: (table: unknown) => ({
      set: mockSet,
    }),
    delete: (table: unknown) => ({
      where: mockDeleteWhere,
    }),
  },
}));

// Mock set to return where
mockSet.mockReturnValue({ where: mockWhere });

jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()),
    invalidate: jest.fn(),
  },
}));

jest.mock("../../db/schema", () => ({
  entries: { id: "id", amount: "amount", note: "note" },
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: "success",
    Error: "error",
  },
}));

import { queryCache } from "../../db/query-cache";
import * as Haptics from "expo-haptics";

describe("useEntryActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhere.mockResolvedValue(undefined);
    mockDeleteWhere.mockResolvedValue(undefined);
  });

  describe("updateEntry", () => {
    it("should update entry amount successfully", async () => {
      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateEntry("entry-123", {
          amount: 10,
        });
      });

      expect(success).toBe(true);
      expect(mockSet).toHaveBeenCalledWith({ amount: 10 });
      expect(queryCache.invalidate).toHaveBeenCalled();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
    });

    it("should update entry note successfully", async () => {
      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateEntry("entry-123", {
          note: "Updated note",
        });
      });

      expect(success).toBe(true);
      expect(mockSet).toHaveBeenCalledWith({ note: "Updated note" });
    });

    it("should update both amount and note", async () => {
      const { result } = renderHook(() => useEntryActions());

      await act(async () => {
        await result.current.updateEntry("entry-123", {
          amount: 15,
          note: "New note",
        });
      });

      expect(mockSet).toHaveBeenCalledWith({ amount: 15, note: "New note" });
    });

    it("should reject empty entry ID", async () => {
      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateEntry("", { amount: 10 });
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toContain("Entry ID is required");
    });

    it("should reject invalid amount (NaN)", async () => {
      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateEntry("entry-123", {
          amount: NaN,
        });
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toContain("valid number");
    });

    it("should reject zero or negative amount", async () => {
      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateEntry("entry-123", {
          amount: 0,
        });
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toContain("greater than zero");
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database update failed");
      mockWhere.mockRejectedValueOnce(dbError);

      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateEntry("entry-123", {
          amount: 10,
        });
      });

      expect(success).toBe(false);
      expect(result.current.error).toEqual(dbError);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith("error");
    });

    it("should do nothing when no updates provided", async () => {
      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateEntry("entry-123", {});
      });

      expect(success).toBe(true);
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  describe("deleteEntry", () => {
    it("should delete entry successfully", async () => {
      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.deleteEntry("entry-123");
      });

      expect(success).toBe(true);
      expect(mockDeleteWhere).toHaveBeenCalled();
      expect(queryCache.invalidate).toHaveBeenCalled();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
    });

    it("should reject empty entry ID", async () => {
      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.deleteEntry("");
      });

      expect(success).toBe(false);
      expect(result.current.error?.message).toContain("Entry ID is required");
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database delete failed");
      mockDeleteWhere.mockRejectedValueOnce(dbError);

      const { result } = renderHook(() => useEntryActions());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.deleteEntry("entry-123");
      });

      expect(success).toBe(false);
      expect(result.current.error).toEqual(dbError);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith("error");
    });
  });

  describe("state management", () => {
    it("should track processing state", async () => {
      // Make the operation take some time
      mockWhere.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useEntryActions());

      expect(result.current.isProcessing).toBe(false);

      let promise: Promise<boolean>;
      act(() => {
        promise = result.current.updateEntry("entry-123", { amount: 10 });
      });

      // Should be processing during the operation
      expect(result.current.isProcessing).toBe(true);

      await act(async () => {
        await promise;
      });

      expect(result.current.isProcessing).toBe(false);
    });

    it("should provide clearError function", async () => {
      const { result } = renderHook(() => useEntryActions());

      // Trigger an error
      await act(async () => {
        await result.current.updateEntry("", { amount: 10 });
      });

      expect(result.current.error).not.toBe(null);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });
});
