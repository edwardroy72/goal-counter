import { useRouter } from "expo-router";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { useGoalActions } from "../hooks/useGoalActions";
import { useGoalTotal } from "../hooks/useGoalTotal";
import type { Goal } from "../types/domain";
import { calculateNextReset, getCountdownText } from "../utils/date-logic";

export function GoalCard({ goal }: { goal: Goal }) {
  const router = useRouter();
  const { addEntry } = useGoalActions();
  const currentTotal = useGoalTotal(goal);

  // 1. Logic for countdown and reset
  // Handle nullable fields with sensible defaults
  const createdAt = goal.createdAt ?? new Date();
  const resetValue = goal.resetValue ?? 1;
  const resetUnit = goal.resetUnit ?? "day";

  const nextReset = calculateNextReset(
    new Date(createdAt),
    resetValue,
    resetUnit
  );
  const countdown = getCountdownText(nextReset);

  // 2. Derive remaining based on live total
  const remaining = goal.target
    ? Math.max(0, goal.target - currentTotal)
    : null;

  return (
    <Pressable
      // Navigates to the detailed view of the goal
      onPress={() => router.push(`/goal/${goal.id}`)}
      className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] mb-4 border border-zinc-100 dark:border-zinc-800 shadow-sm"
    >
      {/* Header: Title and Countdown */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-xl font-bold dark:text-white" numberOfLines={1}>
            {goal.title}
          </Text>
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
            {goal.unit || "units"}
          </Text>
        </View>
        {countdown && (
          <View className="bg-orange-100 dark:bg-orange-950/30 px-3 py-1 rounded-full">
            <Text className="text-orange-600 dark:text-orange-400 text-[10px] font-bold">
              {countdown}
            </Text>
          </View>
        )}
      </View>

      {/* Stats: Current and Remaining */}
      <View className="flex-row justify-between items-end mb-6">
        <View>
          <Text className="text-4xl font-black dark:text-white">
            {currentTotal}
          </Text>
          <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-tighter">
            Current
          </Text>
        </View>
        {goal.target && (
          <View className="items-end">
            <Text className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">
              {remaining}
            </Text>
            <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-tighter">
              Remaining
            </Text>
          </View>
        )}
      </View>

      {/* Quick Add Button */}
      <TouchableOpacity
        onPress={() => addEntry(goal.id, goal.quickAdd1)}
        activeOpacity={0.7}
        className="bg-zinc-100 dark:bg-zinc-800 py-4 rounded-2xl items-center border border-zinc-200/50 dark:border-zinc-700/50"
      >
        <Text className="font-bold dark:text-white text-lg">
          +{goal.quickAdd1}
        </Text>
      </TouchableOpacity>
    </Pressable>
  );
}
