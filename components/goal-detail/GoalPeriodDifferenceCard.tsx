import { Text, TouchableOpacity, View } from "react-native";
import { getRollingWindowLabel, type GoalRollingSummary } from "../../services/goal-analytics";
import type { Goal } from "../../types/domain";

interface GoalPeriodDifferenceCardProps {
  goal: Goal;
  summary: GoalRollingSummary | null;
  isLoading: boolean;
  periodCounts: number[];
  selectedPeriodCount: number | null;
  countEmptyPeriods: boolean;
  onCountEmptyPeriodsChange: (value: boolean) => void;
  onSelectPeriodCount: (periodCount: number) => void;
}

function formatValue(value: number, unit?: string | null): string {
  const formatted = value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  return unit ? `${formatted} ${unit}` : formatted;
}

function formatSignedValue(value: number, unit?: string | null): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${formatValue(Math.abs(value), unit)}`;
}

function getStatusLabel(status: GoalRollingSummary["status"]): string {
  switch (status) {
    case "over":
      return "Over target";
    case "under":
      return "Under target";
    case "on-pace":
      return "On target";
  }
}

function getStatusTone(status: GoalRollingSummary["status"]): string {
  switch (status) {
    case "over":
      return "text-green-600 dark:text-green-400";
    case "under":
      return "text-red-500 dark:text-red-400";
    case "on-pace":
      return "text-blue-500 dark:text-blue-400";
  }
}

function getChipLabel(goal: Goal, periodCount: number): string {
  const resetValue = goal.resetValue ?? 1;
  const resetUnit = goal.resetUnit ?? "day";

  if (resetUnit === "none") {
    return String(periodCount);
  }

  const totalWindow = resetValue * periodCount;
  const suffix = resetUnit === "day" ? "D" : resetUnit === "week" ? "W" : "M";
  return `${totalWindow}${suffix}`;
}

function getPeriodLabel(count: number, unit: GoalRollingSummary["windowUnit"]): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function GoalPeriodDifferenceCard({
  goal,
  summary,
  isLoading,
  periodCounts,
  selectedPeriodCount,
  countEmptyPeriods,
  onCountEmptyPeriodsChange,
  onSelectPeriodCount,
}: GoalPeriodDifferenceCardProps) {
  const resetUnit = goal.resetUnit ?? "day";
  const isAvailable =
    goal.target !== null && resetUnit !== "none" && periodCounts.length > 0;

  return (
    <View className="mb-6 rounded-3xl border border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/80">
      <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
        Target Difference
      </Text>
      <Text className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        Compare your total against target across a longer time window.
      </Text>

      {!isAvailable ? (
        <Text className="text-sm leading-5 text-zinc-500 dark:text-zinc-400">
          Add a target and reset period to compare a longer time span.
        </Text>
      ) : (
        <>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {periodCounts.map((periodCount) => {
              const isSelected = periodCount === selectedPeriodCount;

              return (
                <TouchableOpacity
                  key={periodCount}
                  onPress={() => onSelectPeriodCount(periodCount)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show target difference for ${getChipLabel(goal, periodCount)}`}
                  className={`rounded-full border px-4 py-2 ${
                    isSelected
                      ? "border-blue-500 bg-blue-600"
                      : "border-zinc-200/70 bg-zinc-100 dark:border-zinc-700/60 dark:bg-zinc-800"
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      isSelected ? "text-white" : "text-zinc-700 dark:text-zinc-200"
                    }`}
                  >
                    {getChipLabel(goal, periodCount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isLoading ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Loading target difference...
            </Text>
          ) : summary ? (
            <>
              <Text
                className={`mb-2 text-4xl font-black ${getStatusTone(summary.status)}`}
              >
                {formatSignedValue(summary.delta, goal.unit)}
              </Text>
              <Text className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
                {getStatusLabel(summary.status)} over{" "}
                {getRollingWindowLabel(summary.windowValue, summary.windowUnit)}
              </Text>

              <View className="mb-5 flex-row gap-3">
                <View className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800/80">
                  <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Actual
                  </Text>
                  <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatValue(summary.actualTotal, goal.unit)}
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800/80">
                  <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Target
                  </Text>
                  <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatValue(summary.expectedTotal, goal.unit)}
                  </Text>
                </View>
              </View>

              <View className="mb-4">
                <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Include Skipped Days
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => onCountEmptyPeriodsChange(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Include periods with no entries"
                    className={`flex-1 rounded-2xl border px-4 py-3 ${
                      countEmptyPeriods
                        ? "border-blue-500 bg-blue-600"
                        : "border-zinc-200/70 bg-zinc-100 dark:border-zinc-700/60 dark:bg-zinc-800"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${
                        countEmptyPeriods ? "text-white" : "text-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      Include
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onCountEmptyPeriodsChange(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Exclude periods with no entries"
                    className={`flex-1 rounded-2xl border px-4 py-3 ${
                      !countEmptyPeriods
                        ? "border-blue-500 bg-blue-600"
                        : "border-zinc-200/70 bg-zinc-100 dark:border-zinc-700/60 dark:bg-zinc-800"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${
                        !countEmptyPeriods ? "text-white" : "text-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      Exclude
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                {countEmptyPeriods
                  ? `Target will be based on all ${getPeriodLabel(summary.periodCount, summary.windowUnit)} in this range.`
                  : `Target will be based on ${getPeriodLabel(summary.comparedPeriodCount, summary.windowUnit)} in this range.`}
              </Text>
            </>
          ) : (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Not enough data yet to calculate this period.
            </Text>
          )}
        </>
      )}
    </View>
  );
}
