/**
 * GoalSummaryCard Component
 *
 * Displays the current period summary including:
 * - Current total
 * - Target and remaining (if applicable)
 * - Countdown to next reset
 */

import { Text, View } from "react-native";
import type { Goal } from "../../types/domain";
import { calculateNextReset, getCountdownText } from "../../utils/date-logic";

interface GoalSummaryCardProps {
  goal: Goal;
  currentTotal: number;
  periodStart: Date;
}

export function GoalSummaryCard({
  goal,
  currentTotal,
  periodStart,
}: GoalSummaryCardProps) {
  // Calculate countdown
  const createdAt = goal.createdAt ?? new Date();
  const resetValue = goal.resetValue ?? 1;
  const resetUnit = goal.resetUnit ?? "day";

  const nextReset = calculateNextReset(
    createdAt instanceof Date ? createdAt : new Date(createdAt),
    resetValue,
    resetUnit
  );
  const countdown = getCountdownText(nextReset);

  // Calculate remaining
  const remaining = goal.target
    ? Math.max(0, goal.target - currentTotal)
    : null;

  // Calculate progress percentage
  const progressPercent = goal.target
    ? Math.min(100, (currentTotal / goal.target) * 100)
    : null;

  // Format period start for display
  const periodStartDisplay = periodStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      periodStart.getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });

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
          </Text>
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-tighter">
            Current
          </Text>
        </View>

        {goal.target !== null && (
          <View className="items-end">
            <Text className="text-3xl font-bold text-zinc-700 dark:text-zinc-300">
              {remaining?.toLocaleString(undefined, {
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
