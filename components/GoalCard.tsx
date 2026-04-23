/**
 * GoalCard Component
 *
 * Dashboard card displaying goal summary.
 * Counter goals show current-period progress and quick-add buttons.
 * Measurement goals show the latest logged value and a quick-log input.
 */

import { useRouter } from "expo-router";
import { ArrowDown, ArrowUp, Plus } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import { useToast } from "../contexts/ToastContext";
import { useGoalActions } from "../hooks/useGoalActions";
import { useGoalLatestEntry } from "../hooks/useGoalLatestEntry";
import type { GoalMoveDirection } from "../hooks/useGoalOrdering";
import { useGoalTotal } from "../hooks/useGoalTotal";
import type { Goal } from "../types/domain";
import {
  formatGoalTargetTypeLabel,
  getGoalTargetStatus,
  normalizeGoalTargetType,
} from "../utils/goal-target";
import {
  calculatePeriodEndInTimezone,
  getCountdownTextWithTimezone,
} from "../utils/timezone-utils";

interface GoalCardProps {
  goal: Goal;
  isReorderMode?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMeasurementInputFocus?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isMovePending?: boolean;
  movingDirection?: GoalMoveDirection | null;
}

interface MeasurementSecondaryMetric {
  label: string;
  value: string;
  tone: string;
  labelTone: string;
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

function formatUpdatedAt(timestamp: Date | null | undefined): string {
  if (!timestamp) {
    return "No measurements yet";
  }

  return `Updated ${timestamp.toLocaleString()}`;
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

function getMeasurementMetricTone(
  goal: Goal,
  latestValue: number
): { tone: string; labelTone: string } {
  const targetType = normalizeGoalTargetType(goal.targetType);
  const status = getGoalTargetStatus(latestValue, goal.target ?? latestValue);

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

function getMeasurementSecondaryMetric(goal: Goal, latestValue: number | null) {
  const targetTypeLabel = formatGoalTargetTypeLabel(goal.targetType);

  if (goal.target === null) {
    return null;
  }

  if (latestValue === null) {
    return {
      label: `${targetTypeLabel} Target`,
      value: formatValue(goal.target, goal.unit),
      tone: "text-zinc-900 dark:text-zinc-100",
      labelTone: "text-zinc-400 dark:text-zinc-400",
    } satisfies MeasurementSecondaryMetric;
  }

  const delta = latestValue - goal.target;
  const status = getGoalTargetStatus(latestValue, goal.target);
  const tone = getMeasurementMetricTone(goal, latestValue);

  return {
    label:
      status === "on-pace"
        ? "On Target"
        : normalizeGoalTargetType(goal.targetType) === "max" && status === "over"
          ? "Over Target"
          : "To Target",
    value: formatValue(Math.abs(delta), goal.unit),
    tone: tone.tone,
    labelTone: tone.labelTone,
  } satisfies MeasurementSecondaryMetric;
}

function renderReorderControls(input: {
  goal: Goal;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isMovePending: boolean;
  movingDirection: GoalMoveDirection | null;
}) {
  return (
    <View className="flex-row gap-2">
      <TouchableOpacity
        onPress={input.onMoveUp}
        disabled={!input.canMoveUp || input.isMovePending}
        accessibilityLabel={`Move ${input.goal.title} up`}
        activeOpacity={0.7}
        className={`flex-1 py-4 rounded-surface items-center border ${
          !input.canMoveUp || input.isMovePending
            ? "bg-zinc-100 dark:bg-app-dark-base border-zinc-200 dark:border-zinc-800"
            : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50"
        }`}
      >
        <View className="flex-row items-center gap-2">
          <ArrowUp color="#a1a1aa" size={18} />
          <Text className="font-bold dark:text-white text-base">
            {input.isMovePending && input.movingDirection === "up"
              ? "Moving Up..."
              : "Move Up"}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={input.onMoveDown}
        disabled={!input.canMoveDown || input.isMovePending}
        accessibilityLabel={`Move ${input.goal.title} down`}
        activeOpacity={0.7}
        className={`flex-1 py-4 rounded-surface items-center border ${
          !input.canMoveDown || input.isMovePending
            ? "bg-zinc-100 dark:bg-app-dark-base border-zinc-200 dark:border-zinc-800"
            : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50"
        }`}
      >
        <View className="flex-row items-center gap-2">
          <ArrowDown color="#a1a1aa" size={18} />
          <Text className="font-bold dark:text-white text-base">
            {input.isMovePending && input.movingDirection === "down"
              ? "Moving Down..."
              : "Move Down"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function GoalCard({
  goal,
  isReorderMode = false,
  canMoveUp = false,
  canMoveDown = false,
  onMeasurementInputFocus,
  onMoveUp,
  onMoveDown,
  isMovePending = false,
  movingDirection = null,
}: GoalCardProps) {
  const router = useRouter();
  const { addEntry, undoEntry } = useGoalActions();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [quickLogValue, setQuickLogValue] = useState("");
  const goalType = goal.type ?? "counter";
  const isMeasurementGoal = goalType === "measurement";
  const currentTotal = useGoalTotal(goal, { enabled: !isMeasurementGoal });
  const { latestEntry } = useGoalLatestEntry(goal.id, {
    enabled: isMeasurementGoal,
  });

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

  const measurementValue = latestEntry?.amount ?? null;
  const latestEntryTimestamp =
    latestEntry?.timestamp instanceof Date
      ? latestEntry.timestamp
      : latestEntry?.timestamp
        ? new Date(latestEntry.timestamp)
        : null;
  const measurementSecondaryMetric = getMeasurementSecondaryMetric(
    goal,
    measurementValue
  );

  // Calculate remaining (can go negative for overflows)
  const remaining = goal.target !== null ? goal.target - currentTotal : null;
  const remainingTone =
    goal.target !== null && remaining !== null
      ? getRemainingToneClasses(remaining, goal.target, goal.targetType)
      : null;

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

  const parsedQuickLogValue =
    quickLogValue.trim().length > 0
      ? Number.parseFloat(quickLogValue.trim())
      : Number.NaN;
  const canLogMeasurement = Number.isFinite(parsedQuickLogValue);

  const handleMeasurementLog = useCallback(async () => {
    if (!canLogMeasurement) {
      Alert.alert("Invalid Value", "Please enter a valid number.");
      return;
    }

    const entryId = await addEntry(goal.id, parsedQuickLogValue);
    if (entryId) {
      showToast({
        message: `Logged ${parsedQuickLogValue}${goal.unit ? ` ${goal.unit}` : ""} for ${goal.title}`,
        onUndo: () => undoEntry(entryId),
        duration: 3000,
      });
      setQuickLogValue("");
    }
  }, [
    addEntry,
    canLogMeasurement,
    goal.id,
    goal.title,
    goal.unit,
    parsedQuickLogValue,
    showToast,
    undoEntry,
  ]);

  const counterControls = useMemo(
    () => (
      <View className="flex-row gap-2">
        {quickAddValues.map((value, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              void handleQuickAdd(value);
            }}
            activeOpacity={0.7}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-4 rounded-surface items-center border border-zinc-200/50 dark:border-zinc-700/50"
          >
            <Text className="font-bold dark:text-white text-lg">+{value}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
    [handleQuickAdd, quickAddValues]
  );

  const measurementControls = (
    <View className="mt-1">
      <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-3">
        Quick Log
      </Text>
      <View className="flex-row gap-2 items-center">
        <TextInput
          value={quickLogValue}
          onChangeText={setQuickLogValue}
          onFocus={onMeasurementInputFocus}
          onPressIn={onMeasurementInputFocus}
          keyboardType="decimal-pad"
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={() => {
            void handleMeasurementLog();
          }}
          placeholder={goal.unit ?? "Value"}
          placeholderTextColor="#71717a"
          className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-4 px-4 rounded-surface text-zinc-900 dark:text-white text-base border border-zinc-200/50 dark:border-zinc-700/50"
        />
        <TouchableOpacity
          onPress={() => {
            void handleMeasurementLog();
          }}
          activeOpacity={0.7}
          disabled={quickLogValue.trim().length === 0}
          accessibilityLabel={`Log measurement for ${goal.title}`}
          className={`py-4 px-4 rounded-surface flex-row items-center justify-center ${
            quickLogValue.trim().length === 0 ? "bg-blue-600/50" : "bg-blue-600"
          }`}
        >
          <Plus color="#ffffff" size={18} strokeWidth={3} />
          <Text className="text-white font-bold text-base ml-2">Log</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Pressable
      onPress={
        isReorderMode ? undefined : () => router.push(`/goal/${goal.id}`)
      }
      disabled={isReorderMode}
      className="bg-white dark:bg-app-dark-surface p-6 rounded-surface mb-4 border border-zinc-100 dark:border-zinc-800 shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center flex-wrap">
            <Text
              className="text-xl font-bold dark:text-white"
              numberOfLines={1}
            >
              {goal.title}
            </Text>
            {goal.target !== null ? (
              <Text className="text-zinc-600 text-[10px] font-bold uppercase italic tracking-tighter ml-2">
                ({formatGoalTargetTypeLabel(goal.targetType)} {formatValue(goal.target, goal.unit)})
              </Text>
            ) : null}
          </View>
        </View>
        {countdown ? (
          <View className="bg-orange-100 dark:bg-orange-950/30 px-3 py-1 rounded-surface">
            <Text className="text-orange-600 dark:text-orange-400 text-[10px] font-bold">
              {countdown}
            </Text>
          </View>
        ) : null}
      </View>

      {isMeasurementGoal ? (
        <>
          <View className="flex-row items-end mb-3">
            <View className="flex-1 pr-4">
              <Text className="text-4xl font-black text-blue-700 dark:text-blue-400">
                {measurementValue !== null
                  ? formatValue(measurementValue, goal.unit)
                  : "No data"}
              </Text>
              <Text className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-blue-600/80 dark:text-blue-300/80">
                Latest
              </Text>
            </View>

            {measurementSecondaryMetric ? (
              <View className="items-end">
              <Text
                  className={`text-2xl font-bold ${measurementSecondaryMetric.tone}`}
                >
                  {measurementSecondaryMetric.value}
                </Text>
                <Text
                  className={`mt-1 text-[10px] font-bold uppercase tracking-tighter ${measurementSecondaryMetric.labelTone}`}
                >
                  {measurementSecondaryMetric.label}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="text-zinc-500 dark:text-zinc-400 text-xs mb-5">
            {formatUpdatedAt(latestEntryTimestamp)}
          </Text>
        </>
      ) : (
        <View className="flex-row items-end mb-6">
          <View className="flex-1">
            <Text className="text-4xl font-black text-blue-700 dark:text-blue-400">
              {formatValue(currentTotal, goal.unit)}
            </Text>
            <View className="flex-row items-end mt-1">
              <Text className="text-[10px] font-bold uppercase tracking-tighter text-blue-600/80 dark:text-blue-300/80">
                Current
              </Text>
            </View>
          </View>

          {goal.target !== null && remaining !== null && (
            <View className="items-end">
              <Text className={`text-2xl font-bold ${remainingTone?.value ?? ""}`}>
                {formatValue(remaining, null)}
              </Text>
              <Text
                className={`mt-1 text-[10px] font-bold uppercase tracking-tighter ${
                  remainingTone?.label ?? "text-zinc-400"
                }`}
              >
                Remaining
              </Text>
            </View>
          )}
        </View>
      )}

      {isReorderMode
        ? renderReorderControls({
            goal,
            canMoveUp,
            canMoveDown,
            onMoveUp,
            onMoveDown,
            isMovePending,
            movingDirection,
          })
        : isMeasurementGoal
          ? measurementControls
          : counterControls}
    </Pressable>
  );
}
