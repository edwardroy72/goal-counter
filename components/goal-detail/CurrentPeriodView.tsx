/**
 * CurrentPeriodView Component
 *
 * Shows inline logging controls, quick add buttons, and the progress graph
 * in a scrollable layout.
 */

import { Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useToast } from "../../contexts/ToastContext";
import { useGoalActions } from "../../hooks/useGoalActions";
import type { Goal } from "../../types/domain";
import type {
  GoalGraphData,
  GoalGraphRange,
  GoalRollingSummary,
} from "../../services/goal-analytics";
import { GoalGraphCard } from "./GoalGraphCard";
import { GoalPeriodDifferenceCard } from "./GoalPeriodDifferenceCard";

interface CurrentPeriodViewProps {
  goal: Goal;
  graph: GoalGraphData | null;
  graphRange: GoalGraphRange;
  isGraphLoading: boolean;
  rollingSummary: GoalRollingSummary | null;
  isRollingSummaryLoading: boolean;
  rollingPeriodCounts: number[];
  selectedRollingPeriodCount: number | null;
  countEmptyRollingPeriods: boolean;
  timezone: string;
  onGraphRangeChange: (range: GoalGraphRange) => void;
  onCountEmptyRollingPeriodsChange: (value: boolean) => void;
  onRollingPeriodCountChange: (periodCount: number) => void;
}

export function CurrentPeriodView({
  goal,
  graph,
  graphRange,
  isGraphLoading,
  rollingSummary,
  isRollingSummaryLoading,
  rollingPeriodCounts,
  selectedRollingPeriodCount,
  countEmptyRollingPeriods,
  timezone,
  onGraphRangeChange,
  onCountEmptyRollingPeriodsChange,
  onRollingPeriodCountChange,
}: CurrentPeriodViewProps) {
  const { addEntry, undoEntry } = useGoalActions();
  const { showToast } = useToast();
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canLogEntry =
    value.trim().length > 0 && Number.isFinite(Number.parseFloat(value.trim()));

  const handleLogEntry = useCallback(async () => {
    const parsedValue = Number.parseFloat(value.trim());

    if (isSaving) {
      return;
    }

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive number.");
      return;
    }

    try {
      setIsSaving(true);
      const entryId = await addEntry(goal.id, parsedValue);

      if (entryId) {
        showToast({
          message: `Logged ${parsedValue}${goal.unit ? ` ${goal.unit}` : ""} for ${goal.title}`,
          onUndo: () => undoEntry(entryId),
          duration: 3000,
        });
      }

      setValue("");
    } finally {
      setIsSaving(false);
    }
  }, [addEntry, goal.id, goal.title, goal.unit, isSaving, showToast, undoEntry, value]);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="rounded-surface border border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-app-dark-surface mb-6">
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
          Quick Log
        </Text>
        <Text className="text-zinc-900 dark:text-zinc-100 text-base font-semibold mb-4">
          Type an amount or use a quick add preset
        </Text>
        <View className="flex-row gap-3 items-center mb-5">
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={() => {
              void handleLogEntry();
            }}
            placeholder={goal.unit ?? "Amount"}
            placeholderTextColor="#71717a"
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-4 px-4 rounded-surface text-zinc-900 dark:text-white text-lg border border-zinc-200/50 dark:border-zinc-700/50"
          />
          <TouchableOpacity
            onPress={() => {
              void handleLogEntry();
            }}
            accessibilityLabel="Log manual entry"
            accessibilityRole="button"
            disabled={isSaving || !canLogEntry}
            className={`py-4 px-5 rounded-surface flex-row items-center justify-center ${
              isSaving || !canLogEntry ? "bg-blue-600/50" : "bg-blue-600"
            }`}
          >
            <Plus color="white" size={18} strokeWidth={3} />
            <Text className="text-white font-bold text-base ml-2">
              {isSaving ? "Saving..." : "Log"}
            </Text>
          </TouchableOpacity>
        </View>

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

      <GoalGraphCard
        graph={graph}
        isLoading={isGraphLoading}
        range={graphRange}
        timezone={timezone}
        unit={goal.unit}
        onRangeChange={onGraphRangeChange}
      />

      <GoalPeriodDifferenceCard
        goal={goal}
        summary={rollingSummary}
        isLoading={isRollingSummaryLoading}
        periodCounts={rollingPeriodCounts}
        selectedPeriodCount={selectedRollingPeriodCount}
        countEmptyPeriods={countEmptyRollingPeriods}
        onCountEmptyPeriodsChange={onCountEmptyRollingPeriodsChange}
        onSelectPeriodCount={onRollingPeriodCountChange}
      />
    </ScrollView>
  );
}

function QuickAddButton({ value, goalId }: { value: number; goalId: string }) {
  const { addEntry } = useGoalActions();

  return (
    <TouchableOpacity
      onPress={() => addEntry(goalId, value)}
      accessibilityLabel={`Quick add ${value}`}
      accessibilityRole="button"
      className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-4 rounded-surface items-center border border-zinc-200/50 dark:border-zinc-700/50"
    >
      <Text className="font-bold dark:text-white text-lg">+{value}</Text>
    </TouchableOpacity>
  );
}
