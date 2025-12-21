/**
 * GoalCard Component
 *
 * Dashboard card displaying goal summary with:
 * - Name (units embedded in values)
 * - Current progress and target
 * - Remaining with color-coded status
 * - Time remaining until reset
 * - Quick Add buttons (up to 4)
 */

import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import { useToast } from "../contexts/ToastContext";
import { useGoalActions } from "../hooks/useGoalActions";
import { useGoalTotal } from "../hooks/useGoalTotal";
import type { Goal } from "../types/domain";
import {
  calculatePeriodEndInTimezone,
  getCountdownTextWithTimezone,
} from "../utils/timezone-utils";

interface GoalCardProps {
  goal: Goal;
}

/**
 * Format number with proper locale and optional units
 */
function formatValue(value: number, unit?: string | null): string {
  const formatted = value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Get the color classes for remaining value based on completion percentage
 */
function getRemainingColorClasses(remaining: number, target: number): string {
  const completionPercent = ((target - remaining) / target) * 100;

  if (completionPercent > 100) {
    // Over 100% - negative remaining (red)
    return "text-red-500 dark:text-red-400";
  }
  if (completionPercent >= 80) {
    // 80-100% completion (orange)
    return "text-orange-500 dark:text-orange-400";
  }
  // Under 80% (green - plenty of room)
  return "text-green-600 dark:text-green-400";
}

export function GoalCard({ goal }: GoalCardProps) {
  const router = useRouter();
  const { addEntry, undoEntry } = useGoalActions();
  const currentTotal = useGoalTotal(goal);
  const { settings } = useSettings();
  const { showToast } = useToast();

  // Calculate countdown using user's timezone
  const createdAt = goal.createdAt ?? new Date();
  const resetValue = goal.resetValue ?? 1;
  const resetUnit = goal.resetUnit ?? "day";

  const nextReset = calculatePeriodEndInTimezone(
    createdAt instanceof Date ? createdAt : new Date(createdAt),
    resetValue,
    resetUnit,
    settings.timezone
  );
  const countdown = getCountdownTextWithTimezone(nextReset);

  // Calculate remaining (can go negative for overflows)
  const remaining = goal.target !== null ? goal.target - currentTotal : null;

  // Get quick add values (filter nulls)
  const quickAddValues = [
    goal.quickAdd1,
    goal.quickAdd2,
    goal.quickAdd3,
    goal.quickAdd4,
  ].filter((v): v is number => v !== null && v !== undefined);

  const handleQuickAdd = useCallback(
    async (value: number) => {
      const entryId = await addEntry(goal.id, value);
      if (entryId) {
        showToast({
          message: `Added +${value}${goal.unit ? ` ${goal.unit}` : ""} to ${goal.title}`,
          onUndo: () => undoEntry(entryId),
          duration: 3000,
        });
      }
    },
    [addEntry, goal.id, goal.title, goal.unit, showToast, undoEntry]
  );

  return (
    <Pressable
      onPress={() => router.push(`/goal/${goal.id}`)}
      className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] mb-4 border border-zinc-100 dark:border-zinc-800 shadow-sm"
    >
      {/* Header: Title and Countdown */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center">
            <Text
              className="text-xl font-bold dark:text-white"
              numberOfLines={1}
            >
              {goal.title}
            </Text>
            <Text className="text-zinc-600 text-[10px] font-bold uppercase italic tracking-tighter ml-2">
              (Target: {goal.target})
            </Text>
          </View>
        </View>
        {countdown && (
          <View className="bg-orange-100 dark:bg-orange-950/30 px-3 py-1 rounded-full">
            <Text className="text-orange-600 dark:text-orange-400 text-[10px] font-bold">
              {countdown}
            </Text>
          </View>
        )}
      </View>

      {/* Stats Row: Current | Target | Remaining */}
      <View className="flex-row items-end mb-6">
        {/* Current */}
        <View className="flex-1">
          <Text className="text-4xl font-black dark:text-white">
            {formatValue(currentTotal, goal.unit)}
          </Text>
          <View className="flex-row items-end mt-1">
            <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-tighter">
              Current
            </Text>
          </View>
        </View>

        {/* Target and Remaining (only if target exists) */}
        {goal.target !== null && (
          <View className="items-end">
            {/* Target */}

            {/* Remaining */}
            <Text
              className={`text-2xl font-bold ${getRemainingColorClasses(
                remaining!,
                goal.target
              )}`}
            >
              {formatValue(remaining!, null)}
            </Text>
            <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-tighter mt-1">
              Remaining
            </Text>
          </View>
        )}
      </View>

      {/* Quick Add Buttons */}
      <View className="flex-row gap-2">
        {quickAddValues.map((value, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleQuickAdd(value)}
            activeOpacity={0.7}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-4 rounded-2xl items-center border border-zinc-200/50 dark:border-zinc-700/50"
          >
            <Text className="font-bold dark:text-white text-lg">+{value}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Pressable>
  );
}
