/**
 * GoalSummaryCard Component
 *
 * Displays the summary at the top of the goal detail screen.
 * Counter goals show the current period summary, while measurement goals
 * show the latest measurement and optional target delta.
 */

import { Text, View } from "react-native";
import { useSettings } from "../../contexts/SettingsContext";
import type { Goal } from "../../types/domain";
import {
  formatGoalTargetTypeLabel,
  getGoalTargetStatus,
  normalizeGoalTargetType,
} from "../../utils/goal-target";
import {
  calculatePeriodEndInTimezone,
  formatDateInTimezone,
  getCountdownTextWithTimezone,
} from "../../utils/timezone-utils";

interface GoalSummaryCardProps {
  goal: Goal;
  currentValue: number | null;
  periodStart: Date;
  lastEntryAt?: Date | null;
}

interface MeasurementSecondaryMetric {
  label: string;
  value: string;
  tone: string;
  labelTone: string;
}

function formatValue(value: number, unit?: string | null): string {
  const formatted = value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Get the color classes for remaining value based on completion percentage
 */
function getRemainingToneClasses(
  remaining: number,
  target: number,
  targetType: Goal["targetType"]
): { value: string; label: string } {
  const normalizedTargetType = normalizeGoalTargetType(targetType);
  const progressPercent = target > 0 ? ((target - remaining) / target) * 100 : 0;

  if (normalizedTargetType === "max") {
    if (remaining < 0) {
      return {
        value: "text-red-500 dark:text-red-400",
        label: "text-red-500/80 dark:text-red-300/80",
      };
    }

    if (remaining <= target * 0.2) {
      return {
        value: "text-orange-500 dark:text-orange-400",
        label: "text-orange-500/80 dark:text-orange-300/80",
      };
    }

    return {
      value: "text-emerald-700 dark:text-emerald-400",
      label: "text-emerald-600/80 dark:text-emerald-300/80",
    };
  }

  if (remaining <= 0) {
    return {
      value: "text-emerald-700 dark:text-emerald-400",
      label: "text-emerald-600/80 dark:text-emerald-300/80",
    };
  }

  if (progressPercent >= 80) {
    return {
      value: "text-orange-500 dark:text-orange-400",
      label: "text-orange-500/80 dark:text-orange-300/80",
    };
  }
  return {
    value: "text-emerald-700 dark:text-emerald-400",
    label: "text-emerald-600/80 dark:text-emerald-300/80",
  };
}

function getMeasurementUpdatedLabel(
  lastEntryAt: Date | null | undefined,
  timezone: string
): string {
  if (!lastEntryAt) {
    return "No measurements yet";
  }

  return `Last updated ${formatDateInTimezone(
    lastEntryAt,
    timezone,
    "MMM d, h:mm a"
  )}`;
}

function getMeasurementMetricTone(
  goal: Goal,
  currentValue: number
): { tone: string; labelTone: string } {
  const targetType = normalizeGoalTargetType(goal.targetType);
  const status = getGoalTargetStatus(currentValue, goal.target ?? currentValue);

  if (status === "on-pace") {
    return {
      tone: "text-emerald-600 dark:text-emerald-400",
      labelTone: "text-emerald-600/80 dark:text-emerald-300/80",
    };
  }

  if (targetType === "max" && status === "over") {
    return {
      tone: "text-red-500 dark:text-red-400",
      labelTone: "text-red-500/80 dark:text-red-300/80",
    };
  }

  return {
    tone: "text-emerald-600 dark:text-emerald-400",
    labelTone: "text-emerald-600/80 dark:text-emerald-300/80",
  };
}

function getMeasurementSecondaryMetric(input: {
  goal: Goal;
  currentValue: number | null;
}): MeasurementSecondaryMetric | null {
  const targetTypeLabel = formatGoalTargetTypeLabel(input.goal.targetType);

  if (input.goal.target === null) {
    return null;
  }

  if (input.currentValue === null) {
    return {
      label: `${targetTypeLabel} Target`,
      value: formatValue(input.goal.target, input.goal.unit),
      tone: "text-zinc-900 dark:text-zinc-100",
      labelTone: "text-zinc-400 dark:text-zinc-400",
    };
  }

  const delta = input.currentValue - input.goal.target;
  const status = getGoalTargetStatus(input.currentValue, input.goal.target);
  const tone = getMeasurementMetricTone(input.goal, input.currentValue);

  return {
    label:
      status === "on-pace"
        ? "On Target"
        : normalizeGoalTargetType(input.goal.targetType) === "max" &&
            status === "over"
          ? "Over Target"
          : "To Target",
    value: formatValue(Math.abs(delta), input.goal.unit),
    tone: tone.tone,
    labelTone: tone.labelTone,
  };
}

export function GoalSummaryCard({
  goal,
  currentValue,
  periodStart,
  lastEntryAt = null,
}: GoalSummaryCardProps) {
  const { settings } = useSettings();
  const goalType = goal.type ?? "counter";
  const isMeasurementGoal = goalType === "measurement";

  if (isMeasurementGoal) {
    const secondaryMetric = getMeasurementSecondaryMetric({
      goal,
      currentValue,
    });

    return (
      <View className="bg-white dark:bg-app-dark-surface p-6 rounded-surface border border-zinc-100 dark:border-zinc-800 mb-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
            Latest Measurement
          </Text>
          <View className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-surface">
            <Text className="text-zinc-500 dark:text-zinc-300 text-[10px] font-bold">
              {getMeasurementUpdatedLabel(lastEntryAt, settings.timezone)}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-end">
          <View className="flex-1 pr-4">
            <Text className="text-5xl font-black text-blue-700 dark:text-blue-400">
              {currentValue !== null ? formatValue(currentValue, goal.unit) : "No data"}
            </Text>
            <Text className="mt-2 text-xs font-bold uppercase tracking-tighter text-blue-600/80 dark:text-blue-300/80">
              Current
            </Text>
          </View>

          {secondaryMetric ? (
            <View className="items-end">
              <Text className={`text-2xl font-bold ${secondaryMetric.tone}`}>
                {secondaryMetric.value}
              </Text>
              <Text
                className={`mt-1 text-xs font-bold uppercase tracking-tighter ${secondaryMetric.labelTone}`}
              >
                {secondaryMetric.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  const safeCurrentTotal = currentValue ?? 0;

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
  const remaining = goal.target !== null ? goal.target - safeCurrentTotal : null;
  const remainingTone =
    goal.target !== null && remaining !== null
      ? getRemainingToneClasses(remaining, goal.target, goal.targetType)
      : null;

  // Calculate progress percentage
  const progressPercent = goal.target
    ? Math.min(100, (safeCurrentTotal / goal.target) * 100)
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
    <View className="bg-white dark:bg-app-dark-surface p-6 rounded-surface border border-zinc-100 dark:border-zinc-800 mb-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
          Since {periodStartDisplay}
        </Text>
        {countdown && (
          <View className="bg-orange-100 dark:bg-orange-950/30 px-3 py-1 rounded-surface">
            <Text className="text-orange-600 dark:text-orange-400 text-[10px] font-bold">
              {countdown}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row justify-between items-end mb-4">
        <View>
          <Text className="text-5xl font-black text-blue-700 dark:text-blue-400">
            {safeCurrentTotal.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
            {goal.unit && (
              <Text className="text-2xl font-bold text-blue-600/80 dark:text-blue-300/80">
                {" "}
                {goal.unit}
              </Text>
            )}
          </Text>
          <Text className="text-xs font-bold uppercase tracking-tighter text-blue-600/80 dark:text-blue-300/80">
            Current
          </Text>
        </View>

        {goal.target !== null && remaining !== null && (
          <View className="items-end">
            <Text className={`text-3xl font-bold ${remainingTone?.value ?? ""}`}>
              {remaining.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text
              className={`text-xs font-bold uppercase tracking-tighter ${
                remainingTone?.label ?? "text-zinc-400"
              }`}
            >
              Remaining
            </Text>
          </View>
        )}
      </View>

      {progressPercent !== null && (
        <View className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${
              normalizeGoalTargetType(goal.targetType) === "max"
                ? safeCurrentTotal > (goal.target ?? 0)
                  ? "bg-red-500"
                  : "bg-blue-500"
                : progressPercent >= 100
                  ? "bg-green-500"
                  : "bg-blue-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      )}

      {goal.target !== null && (
        <View className="flex-row justify-end mt-2">
          <Text className="text-zinc-400 text-xs">
            {formatGoalTargetTypeLabel(goal.targetType)} target:{" "}
            {goal.target.toLocaleString()} {goal.unit || ""}
          </Text>
        </View>
      )}

    </View>
  );
}
