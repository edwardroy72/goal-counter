/**
 * CurrentPeriodView Component
 *
 * Shows the current period summary with Manual Add button.
 */

import { Plus } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import type { DayGroup, NormalizedEntry } from "../../hooks/useGoalEntries";
import type { Goal } from "../../types/domain";
import { EntryItem } from "./EntryItem";

interface CurrentPeriodViewProps {
  goal: Goal;
  groupedEntries: DayGroup[];
  isLoading: boolean;
  onManualAdd: () => void;
  onEditEntry: (entry: NormalizedEntry) => void;
  onDeleteEntry: (entry: NormalizedEntry) => void;
}

export function CurrentPeriodView({
  goal,
  groupedEntries,
  isLoading,
  onManualAdd,
  onEditEntry,
  onDeleteEntry,
}: CurrentPeriodViewProps) {
  // Get recent entries (last 5 across all days)
  const recentEntries = groupedEntries
    .flatMap((group) => group.entries)
    .slice(0, 5);

  return (
    <View className="flex-1">
      {/* Manual Add Button */}
      <TouchableOpacity
        onPress={onManualAdd}
        accessibilityLabel="Add entry manually"
        accessibilityRole="button"
        className="flex-row items-center justify-center bg-blue-600 py-4 rounded-2xl mb-6"
      >
        <Plus color="white" size={20} strokeWidth={3} />
        <Text className="text-white font-bold text-lg ml-2">Manual Add</Text>
      </TouchableOpacity>

      {/* Quick Add Buttons */}
      <View className="mb-6">
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3 px-1">
          Quick Add
        </Text>
        <View className="flex-row gap-3">
          {[goal.quickAdd1, goal.quickAdd2, goal.quickAdd3, goal.quickAdd4]
            .filter((v): v is number => v !== null && v !== undefined)
            .map((value, index) => (
              <QuickAddButton key={index} value={value} goalId={goal.id} />
            ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View>
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3 px-1">
          Recent Activity
        </Text>

        {isLoading ? (
          <View className="py-8 items-center">
            <Text className="text-zinc-400">Loading...</Text>
          </View>
        ) : recentEntries.length === 0 ? (
          <View className="py-8 items-center">
            <Text className="text-zinc-400 text-center">
              No entries this period
            </Text>
          </View>
        ) : (
          <View>
            {recentEntries.map((entry) => (
              <EntryItem
                key={entry.id}
                entry={entry}
                unit={goal.unit}
                onEdit={onEditEntry}
                onDelete={onDeleteEntry}
              />
            ))}
            {groupedEntries.flatMap((g) => g.entries).length > 5 && (
              <Text className="text-zinc-400 text-center text-sm mt-2">
                Switch to Ledger tab to see all entries
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Quick Add Button (reuses logic from GoalCard)
 */
import { useGoalActions } from "../../hooks/useGoalActions";

function QuickAddButton({ value, goalId }: { value: number; goalId: string }) {
  const { addEntry } = useGoalActions();

  return (
    <TouchableOpacity
      onPress={() => addEntry(goalId, value)}
      accessibilityLabel={`Quick add ${value}`}
      accessibilityRole="button"
      className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-4 rounded-xl items-center border border-zinc-200/50 dark:border-zinc-700/50"
    >
      <Text className="font-bold dark:text-white text-lg">+{value}</Text>
    </TouchableOpacity>
  );
}
