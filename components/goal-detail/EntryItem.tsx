/**
 * EntryItem Component
 *
 * Displays a single entry with time, amount, and optional note.
 * Supports swipe/press actions for edit and delete.
 */

import { Pencil, Trash2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import type { NormalizedEntry } from "../../hooks/useGoalEntries";

interface EntryItemProps {
  entry: NormalizedEntry;
  unit?: string | null;
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

export function EntryItem({ entry, unit, onEdit, onDelete }: EntryItemProps) {
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
        +{entry.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
          onPress={() => onDelete(entry)}
          accessibilityLabel="Delete entry"
          accessibilityRole="button"
          className="p-2"
        >
          <Trash2 size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
