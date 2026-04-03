/**
 * CurrentPeriodView Component
 *
 * Shows tracking controls with Manual Add, Quick Add buttons,
 * and the progress graph in a scrollable layout.
 */

import { Plus } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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
  onManualAdd: () => void;
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
  onManualAdd,
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
  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="rounded-3xl border border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/80 mb-6">
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
          Add Entries
        </Text>
        <Text className="text-zinc-900 dark:text-zinc-100 text-base font-semibold mb-4">
          Manual and quick ways to log progress
        </Text>

        <TouchableOpacity
          onPress={onManualAdd}
          accessibilityLabel="Add entry manually"
          accessibilityRole="button"
          className="flex-row items-center justify-center bg-blue-600 py-4 rounded-2xl mb-5"
        >
          <Plus color="white" size={20} strokeWidth={3} />
          <Text className="text-white font-bold text-lg ml-2">Manual Add</Text>
        </TouchableOpacity>

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
      className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-4 rounded-xl items-center border border-zinc-200/50 dark:border-zinc-700/50"
    >
      <Text className="font-bold dark:text-white text-lg">+{value}</Text>
    </TouchableOpacity>
  );
}
