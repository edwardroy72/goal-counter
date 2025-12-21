/**
 * GoalSummaryCard Component
 *
 * Displays the current period summary including:
 * - Current total
 * - Target and remaining (if applicable)
 * - Countdown to next reset
 */

import { Text, View } from "react-native";
import { useSettings } from "../../contexts/SettingsContext";
import type { Goal } from "../../types/domain";
import {
  calculatePeriodEndInTimezone,
  formatDateInTimezone,
  getCountdownTextWithTimezone,
} from "../../utils/timezone-utils";

interface GoalSummaryCardProps {
  goal: Goal;
  currentTotal: number;
  periodStart: Date;
}

/**
 * Get the color classes for remaining value based on completion percentage
 */
function getRemainingColorClasses(remaining: number, target: number): string {
  const completionPercent = ((target - remaining) / target) * 100;

  if (completionPercent >= 100) {
    return "text-red-500 dark:text-red-400";
  }
  if (completionPercent >= 80) {
    return "text-orange-500 dark:text-orange-400";
  }
  return "text-green-600 dark:text-green-400";
}

export function GoalSummaryCard({
  goal,
  currentTotal,
  periodStart,
}: GoalSummaryCardProps) {
  const { settings } = useSettings();

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

  // Calculate remaining (can go negative)
  const remaining = goal.target !== null ? goal.target - currentTotal : null;

  // Calculate progress percentage
  const progressPercent = goal.target
    ? Math.min(100, (currentTotal / goal.target) * 100)
    : null;

  // Format period start for display in user's timezone
  const periodStartDisplay = formatDateInTimezone(
    periodStart,
    settings.timezone,
    periodStart.getFullYear() !== new Date().getFullYear()
      ? "MMM d, yyyy"
      : "MMM d"
  );

  return (
    <View className="bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-zinc-100 dark:border-zinc-800 mb-4">
      {/* Period indicator */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
          Since {periodStartDisplay}
        </Text>
        {countdown && (
          <View className="bg-orange-100 dark:bg-orange-950/30 px-3 py-1 rounded-full">
            <Text className="text-orange-600 dark:text-orange-400 text-[10px] font-bold">
              {countdown}
            </Text>
          </View>
        )}
      </View>

      {/* Main stats */}
      <View className="flex-row justify-between items-end mb-4">
        <View>
          <Text className="text-5xl font-black dark:text-white">
            {currentTotal.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
            {goal.unit && (
              <Text className="text-zinc-400 text-2xl font-bold">
                {" "}
                {goal.unit}
              </Text>
            )}
          </Text>
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-tighter">
            Current
          </Text>
        </View>

        {goal.target !== null && remaining !== null && (
          <View className="items-end">
            <Text
              className={`text-3xl font-bold ${getRemainingColorClasses(
                remaining,
                goal.target
              )}`}
            >
              {remaining.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-tighter">
              Remaining
            </Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      {progressPercent !== null && (
        <View className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${
              progressPercent >= 100 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      )}

      {/* Target display */}
      {goal.target !== null && (
        <View className="flex-row justify-end mt-2">
          <Text className="text-zinc-400 text-xs">
            Target: {goal.target.toLocaleString()} {goal.unit || ""}
          </Text>
        </View>
      )}
    </View>
  );
}
