import { eq } from "drizzle-orm";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries } from "../db/schema";

export function useGoalActions() {
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Adds a numeric entry to a goal with an optional note.
   * Triggers haptic feedback and starts the 3s undo timer.
   */
  const addEntry = async (
    goalId: string,
    amount: number,
    note: string | null = null
  ) => {
    try {
      // Physical "click" feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const now = new Date();
      const nowMs = now.getTime();
      
      if (process.env.NODE_ENV !== 'test') {
        console.log("[addEntry] Inserting entry:", { goalId, amount, note });
        console.log("[addEntry] Timestamp (Date):", now.toISOString());
        console.log("[addEntry] Timestamp (ms):", nowMs);
      }
      
      const [newEntry] = await db
        .insert(entries)
        .values({
          goalId,
          amount,
          note,
          // Use Date object; Drizzle will persist milliseconds for the timestamp column
          timestamp: now,
        })
        .returning();

      if (process.env.NODE_ENV !== 'test') {
        console.log("[addEntry] Entry inserted:", {
          id: newEntry.id,
          goalId: newEntry.goalId,
          amount: newEntry.amount,
          timestamp: newEntry.timestamp,
          timestampType: typeof newEntry.timestamp,
        });
      }

      // Explicitly invalidate all queries after successful insert
      if (process.env.NODE_ENV !== 'test') {
        console.log("[addEntry] Invalidating query cache...");
      }
      queryCache.invalidate();
      if (process.env.NODE_ENV !== 'test') {
        console.log("[addEntry] Query cache invalidated. Subscriber count:", queryCache.getSubscriberCount());
      }

      setLastEntryId(newEntry.id);

      // Start the 3-second 'Undo' window
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

      undoTimeoutRef.current = setTimeout(() => {
        setLastEntryId(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to add entry:", err);
    }
  };

  /**
   * Deletes the most recent entry if triggered within the 3s window.
   */
  const undoLastEntry = async () => {
    if (!lastEntryId) return;

    try {
      await db.delete(entries).where(eq(entries.id, lastEntryId));
      
      // Explicitly invalidate all queries after successful delete
      queryCache.invalidate();
      
      setLastEntryId(null);

      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

      // Success haptic notification
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Undo failed:", err);
    }
  };

  return { addEntry, undoLastEntry, showUndo: !!lastEntryId };
}
