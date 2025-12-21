/**
 * Integration Tests: useGoalActions Hook
 *
 * Tests the hook responsible for adding and undoing entries.
 * Verifies database operations, cache invalidation, and state management.
 */

import { act, renderHook } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { db } from "../../db/client";
import { queryCache } from "../../db/query-cache";
import { entries } from "../../db/schema";
import { useGoalActions } from "../../hooks/useGoalActions";

// Mock haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success" },
}));

// Mock database
jest.mock("../../db/client", () => ({
  db: {
    insert: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock query cache
jest.mock("../../db/query-cache", () => ({
  queryCache: {
    invalidate: jest.fn(),
    getSubscriberCount: jest.fn(),
  },
}));

describe("useGoalActions Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clear all timers without running them to avoid infinite loops
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("addEntry()", () => {
    it("should insert entry into database with correct values", async () => {
      const mockEntry = {
        id: "test-entry-id",
        goalId: "goal-1",
        amount: 250,
        note: "Morning water",
        timestamp: expect.any(Date),
      };

      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };

      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 250, "Morning water");
      });

      expect(db.insert).toHaveBeenCalledWith(entries);
      expect(mockInsert.values).toHaveBeenCalledWith({
        goalId: "goal-1",
        amount: 250,
        note: "Morning water",
        timestamp: expect.any(Date),
      });
    });

    it("should insert entry with null note when note is not provided", async () => {
      const mockEntry = {
        id: "test-entry-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
        timestamp: expect.any(Date),
      };

      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };

      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      expect(mockInsert.values).toHaveBeenCalledWith({
        goalId: "goal-1",
        amount: 100,
        note: null,
        timestamp: expect.any(Date),
      });
    });

    it("should trigger haptic feedback", async () => {
      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it("should invalidate query cache after successful insert", async () => {
      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      expect(queryCache.invalidate).toHaveBeenCalledTimes(1);
    });

    it("should set lastEntryId for undo functionality", async () => {
      const mockEntry = {
        id: "test-entry-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      expect(result.current.showUndo).toBe(false);

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      expect(result.current.showUndo).toBe(true);
    });

    it("should start 3-second undo timer", async () => {
      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      expect(result.current.showUndo).toBe(true);

      // Fast-forward 3 seconds wrapped in act
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.showUndo).toBe(false);
    });

    it("should clear previous undo timer when adding new entry", async () => {
      const mockEntry1 = {
        id: "entry-1",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockEntry2 = {
        id: "entry-2",
        goalId: "goal-1",
        amount: 200,
        note: null,
      };

      const mockInsert = {
        values: jest
          .fn()
          .mockReturnValueOnce({
            returning: jest.fn().mockResolvedValue([mockEntry1]),
          })
          .mockReturnValueOnce({
            returning: jest.fn().mockResolvedValue([mockEntry2]),
          }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      // Add first entry
      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      expect(result.current.showUndo).toBe(true);

      // Add second entry before first timer expires
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        await result.current.addEntry("goal-1", 200);
      });

      // Should still show undo (new 3s timer started)
      expect(result.current.showUndo).toBe(true);

      // Advance 3 seconds total from second add
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Now undo should be hidden
      expect(result.current.showUndo).toBe(false);
    });

    it("should handle database errors gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error("Database error")),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to add entry:",
        expect.any(Error)
      );
      expect(result.current.showUndo).toBe(false);
      expect(queryCache.invalidate).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle decimal amounts correctly", async () => {
      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 2.5,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 2.5);
      });

      expect(mockInsert.values).toHaveBeenCalledWith({
        goalId: "goal-1",
        amount: 2.5,
        note: null,
        timestamp: expect.any(Date),
      });
    });
  });

  describe("undoLastEntry()", () => {
    it("should delete the most recent entry from database", async () => {
      const mockEntry = {
        id: "test-entry-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const mockDelete = {
        where: jest.fn().mockResolvedValue(undefined),
      };
      (db.delete as jest.Mock).mockReturnValue(mockDelete);

      const { result } = renderHook(() => useGoalActions());

      // First add an entry
      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      // Then undo it
      await act(async () => {
        await result.current.undoLastEntry();
      });

      expect(db.delete).toHaveBeenCalledWith(entries);
      expect(mockDelete.where).toHaveBeenCalled();
    });

    it("should not delete anything if no entry to undo", async () => {
      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.undoLastEntry();
      });

      expect(db.delete).not.toHaveBeenCalled();
    });

    it("should invalidate query cache after successful delete", async () => {
      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const mockDelete = {
        where: jest.fn().mockResolvedValue(undefined),
      };
      (db.delete as jest.Mock).mockReturnValue(mockDelete);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      // Clear the invalidate call from addEntry
      (queryCache.invalidate as jest.Mock).mockClear();

      await act(async () => {
        await result.current.undoLastEntry();
      });

      expect(queryCache.invalidate).toHaveBeenCalledTimes(1);
    });

    it("should trigger success haptic feedback", async () => {
      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const mockDelete = {
        where: jest.fn().mockResolvedValue(undefined),
      };
      (db.delete as jest.Mock).mockReturnValue(mockDelete);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      await act(async () => {
        await result.current.undoLastEntry();
      });

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it("should clear undo state after successful undo", async () => {
      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const mockDelete = {
        where: jest.fn().mockResolvedValue(undefined),
      };
      (db.delete as jest.Mock).mockReturnValue(mockDelete);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      expect(result.current.showUndo).toBe(true);

      await act(async () => {
        await result.current.undoLastEntry();
      });

      expect(result.current.showUndo).toBe(false);
    });

    it("should clear the undo timer after undo", async () => {
      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const mockDelete = {
        where: jest.fn().mockResolvedValue(undefined),
      };
      (db.delete as jest.Mock).mockReturnValue(mockDelete);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      expect(result.current.showUndo).toBe(true);

      await act(async () => {
        await result.current.undoLastEntry();
      });

      // Timer should be cleared, so advancing time shouldn't change anything
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.showUndo).toBe(false);
    });

    it("should handle database errors gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const mockDelete = {
        where: jest.fn().mockRejectedValue(new Error("Delete failed")),
      };
      (db.delete as jest.Mock).mockReturnValue(mockDelete);

      const { result } = renderHook(() => useGoalActions());

      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });

      await act(async () => {
        await result.current.undoLastEntry();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Undo failed:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("showUndo state", () => {
    it("should correctly reflect undo availability", async () => {
      const mockEntry = {
        id: "test-id",
        goalId: "goal-1",
        amount: 100,
        note: null,
      };
      const mockInsert = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEntry]),
        }),
      };
      (db.insert as jest.Mock).mockReturnValue(mockInsert);

      const { result } = renderHook(() => useGoalActions());

      // Initially false
      expect(result.current.showUndo).toBe(false);

      // True after adding entry
      await act(async () => {
        await result.current.addEntry("goal-1", 100);
      });
      expect(result.current.showUndo).toBe(true);

      // False after 3 seconds
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(result.current.showUndo).toBe(false);
    });
  });
});
