/**
 * EntryItem Component
 *
 * Displays a single entry with time, amount, and optional note.
 * Supports two-tap delete: first tap shows confirmation, second tap deletes.
 */

import { Check, Pencil, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { NormalizedEntry } from "../../hooks/useGoalEntries";

interface EntryItemProps {
  entry: NormalizedEntry;
  unit?: string | null;
  showSign?: boolean;
  onEdit: (entry: NormalizedEntry) => void;
  onDelete: (entry: NormalizedEntry) => void;
}

/**
 * Formats time for display (HH:MM in local time)
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function EntryItem({
  entry,
  unit,
  showSign = true,
  onEdit,
  onDelete,
}: EntryItemProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset confirmation state after 3 seconds
  useEffect(() => {
    if (confirmingDelete) {
      timeoutRef.current = setTimeout(() => {
        setConfirmingDelete(false);
      }, 3000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [confirmingDelete]);

  const handleDeletePress = useCallback(() => {
    if (confirmingDelete) {
      // Second tap - perform delete
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setConfirmingDelete(false);
      onDelete(entry);
    } else {
      // First tap - show confirmation
      setConfirmingDelete(true);
    }
  }, [confirmingDelete, entry, onDelete]);

  return (
    <View className="flex-row items-center py-3 px-4 bg-white dark:bg-zinc-900 rounded-xl mb-2 border border-zinc-100 dark:border-zinc-800">
      {/* Time */}
      <Text className="text-zinc-400 dark:text-zinc-500 font-mono text-sm w-14">
        {formatTime(entry.timestamp)}
      </Text>

      {/* Divider */}
      <View className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-3" />

      {/* Amount */}
      <Text className="font-bold text-lg dark:text-white min-w-[60px]">
        {showSign && entry.amount >= 0 ? "+" : ""}
        {entry.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        {unit && (
          <Text className="text-zinc-400 text-sm font-normal"> {unit}</Text>
        )}
      </Text>

      {/* Note */}
      <Text
        className="flex-1 text-zinc-500 dark:text-zinc-400 text-sm ml-3"
        numberOfLines={1}
      >
        {entry.note || ""}
      </Text>

      {/* Actions */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => onEdit(entry)}
          accessibilityLabel="Edit entry"
          accessibilityRole="button"
          className="p-2"
        >
          <Pencil size={18} color="#71717a" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeletePress}
          accessibilityLabel={
            confirmingDelete ? "Confirm delete" : "Delete entry"
          }
          accessibilityRole="button"
          className={`p-2 rounded-lg ${confirmingDelete ? "bg-red-500" : ""}`}
        >
          {confirmingDelete ? (
            <Check size={18} color="#ffffff" />
          ) : (
            <Trash2 size={18} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
