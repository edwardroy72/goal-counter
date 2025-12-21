/**
 * useEntryActions Hook
 *
 * Provides edit and delete operations for entries.
 * Handles haptic feedback, cache invalidation, and error states.
 */

import { eq } from "drizzle-orm";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";

interface UseEntryActionsResult {
  /** Update an entry's amount and/or note */
  updateEntry: (
    entryId: string,
    updates: { amount?: number; note?: string | null }
  ) => Promise<boolean>;

  /** Delete an entry permanently */
  deleteEntry: (entryId: string) => Promise<boolean>;

  /** Whether an operation is in progress */
  isProcessing: boolean;

  /** Last error that occurred */
  error: Error | null;

  /** Clear the current error */
  clearError: () => void;
}

/**
 * Hook for entry manipulation operations
 */
export function useEntryActions(): UseEntryActionsResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Updates an entry's amount and/or note.
   * Timestamp remains immutable per design spec.
   */
  const updateEntry = useCallback(
    async (
      entryId: string,
      updates: { amount?: number; note?: string | null }
    ): Promise<boolean> => {
      if (!entryId) {
        setError(new Error("Entry ID is required"));
        return false;
      }

      // Validate amount if provided
      if (updates.amount !== undefined) {
        if (typeof updates.amount !== "number" || isNaN(updates.amount)) {
          setError(new Error("Amount must be a valid number"));
          return false;
        }
        if (updates.amount <= 0) {
          setError(new Error("Amount must be greater than zero"));
          return false;
        }
      }

      try {
        setIsProcessing(true);
        setError(null);

        // Build update object with only provided fields
        const updateData: { amount?: number; note?: string | null } = {};
        if (updates.amount !== undefined) {
          updateData.amount = updates.amount;
        }
        if (updates.note !== undefined) {
          updateData.note = updates.note;
        }

        if (Object.keys(updateData).length === 0) {
          // Nothing to update
          return true;
        }

        await db.update(entries).set(updateData).where(eq(entries.id, entryId));

        // Invalidate cache to trigger refetch
        queryCache.invalidate();

        // Success haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        return true;
      } catch (err) {
        console.error("[useEntryActions] Update failed:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to update entry")
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * Deletes an entry permanently.
   */
  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    if (!entryId) {
      setError(new Error("Entry ID is required"));
      return false;
    }

    try {
      setIsProcessing(true);
      setError(null);

      await db.delete(entries).where(eq(entries.id, entryId));

      // Invalidate cache to trigger refetch
      queryCache.invalidate();

      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      return true;
    } catch (err) {
      console.error("[useEntryActions] Delete failed:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to delete entry")
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    updateEntry,
    deleteEntry,
    isProcessing,
    error,
    clearError,
  };
}
