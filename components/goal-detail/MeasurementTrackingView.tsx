import { Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useToast } from "../../contexts/ToastContext";
import { useGoalActions } from "../../hooks/useGoalActions";
import type { Goal } from "../../types/domain";
import type { GoalGraphData, GoalGraphRange } from "../../services/goal-analytics";
import { GoalGraphCard } from "./GoalGraphCard";

interface MeasurementTrackingViewProps {
  goal: Goal;
  graph: GoalGraphData | null;
  graphRange: GoalGraphRange;
  isGraphLoading: boolean;
  timezone: string;
  onGraphRangeChange: (range: GoalGraphRange) => void;
}

export function MeasurementTrackingView({
  goal,
  graph,
  graphRange,
  isGraphLoading,
  timezone,
  onGraphRangeChange,
}: MeasurementTrackingViewProps) {
  const { addEntry, undoEntry } = useGoalActions();
  const { showToast } = useToast();
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canLogMeasurement =
    value.trim().length > 0 && Number.isFinite(Number.parseFloat(value.trim()));

  const handleLogMeasurement = useCallback(async () => {
    const parsedValue = Number.parseFloat(value.trim());
    if (isSaving) {
      return;
    }

    if (!Number.isFinite(parsedValue)) {
      Alert.alert("Invalid Value", "Please enter a valid number.");
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
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="rounded-3xl border border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/80 mb-6">
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
          Quick Log
        </Text>
        <Text className="text-zinc-900 dark:text-zinc-100 text-base font-semibold mb-4">
          Record a new measurement
        </Text>
        <View className="flex-row gap-3 items-center">
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={() => {
              void handleLogMeasurement();
            }}
            placeholder={goal.unit ?? "Value"}
            placeholderTextColor="#71717a"
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-4 px-4 rounded-2xl text-zinc-900 dark:text-white text-lg border border-zinc-200/50 dark:border-zinc-700/50"
          />
          <TouchableOpacity
            onPress={() => {
              void handleLogMeasurement();
            }}
            disabled={isSaving || !canLogMeasurement}
            className={`py-4 px-5 rounded-2xl flex-row items-center justify-center ${
              isSaving || !canLogMeasurement ? "bg-blue-600/50" : "bg-blue-600"
            }`}
          >
            <Plus color="white" size={18} strokeWidth={3} />
            <Text className="text-white font-bold text-base ml-2">
              {isSaving ? "Saving..." : "Log"}
            </Text>
          </TouchableOpacity>
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
    </ScrollView>
  );
}
