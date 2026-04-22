/**
 * Goal Detail Screen
 *
 * Displays detailed view of a goal with:
 * - Summary card (current total, target, countdown)
 * - Tab navigation (Tracking / History)
 * - Entry management (add, edit, delete)
 */

import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  CurrentPeriodView,
  EntryEditModal,
  GoalDetailHeader,
  GoalSummaryCard,
  MeasurementTrackingView,
  TabBar,
  type TabId,
} from "../../components/goal-detail";
import { HistoryLedgerView } from "../../components/goal-detail/HistoryLedgerView";
import { useSettings } from "../../contexts/SettingsContext";
import { useEntryActions } from "../../hooks/useEntryActions";
import { useGoalById } from "../../hooks/useGoalById";
import type { NormalizedEntry } from "../../hooks/useGoalEntries";
import { useGoalGraph } from "../../hooks/useGoalGraph";
import { useGoalHistory } from "../../hooks/useGoalHistory";
import { useGoalLatestEntry } from "../../hooks/useGoalLatestEntry";
import { useGoalRollingSummary } from "../../hooks/useGoalRollingSummary";
import { useGoalTotal } from "../../hooks/useGoalTotal";
import {
  getGoalRollingPresetCounts,
  type GoalGraphRange,
} from "../../services/goal-analytics";
import { calculatePeriodStartInTimezone } from "../../utils/timezone-utils";

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = typeof id === "string" ? id : "";
  const { settings } = useSettings();

  // UI state
  const [activeTab, setActiveTab] = useState<TabId>("tracking");
  const [graphRange, setGraphRange] = useState<GoalGraphRange>("7d");
  const [selectedRollingPeriodCount, setSelectedRollingPeriodCount] = useState<
    number | null
  >(null);
  const [countEmptyRollingPeriods, setCountEmptyRollingPeriods] = useState(false);
  const [editingEntry, setEditingEntry] = useState<NormalizedEntry | null>(
    null
  );

  // Data fetching hooks
  const {
    goal,
    isLoading: isLoadingGoal,
    error: goalError,
  } = useGoalById(goalId);
  const goalType = goal?.type ?? "counter";
  const isMeasurementGoal = goalType === "measurement";
  const currentTotal = useGoalTotal(goal ?? createPlaceholderGoal(goalId), {
    enabled: goal !== null && !isMeasurementGoal,
  });
  const { latestEntry } = useGoalLatestEntry(goalId, {
    enabled: goal !== null && isMeasurementGoal,
  });
  const rollingPresetCounts = useMemo(
    () => getGoalRollingPresetCounts(goal?.resetUnit),
    [goal?.resetUnit]
  );
  const { summary: rollingSummary, isLoading: isLoadingRollingSummary } =
    useGoalRollingSummary(goal, {
      enabled:
        activeTab === "tracking" &&
        !isMeasurementGoal &&
        selectedRollingPeriodCount !== null,
      countEmptyPeriods: countEmptyRollingPeriods,
      periodCount: selectedRollingPeriodCount,
    });
  const { graph, isLoading: isLoadingGraph } = useGoalGraph(goal, graphRange, {
    enabled: activeTab === "tracking",
  });
  const {
    periods,
    isLoading: isLoadingHistory,
    isLoadingMore: isLoadingMoreHistory,
    hasMore: hasMoreHistory,
    loadMore: loadMoreHistory,
  } = useGoalHistory(
    activeTab === "history" ? goal : null
  );
  const { deleteEntry } = useEntryActions();

  const periodStart = useMemo(() => {
    if (!goal) {
      return new Date();
    }

    const createdAt =
      goal.createdAt instanceof Date ? goal.createdAt : new Date(goal.createdAt);

    return calculatePeriodStartInTimezone(
      createdAt,
      goal.resetValue ?? 1,
      goal.resetUnit ?? "day",
      settings.timezone
    );
  }, [
    goal,
    settings.timezone,
  ]);

  useEffect(() => {
    if (isMeasurementGoal || rollingPresetCounts.length === 0) {
      setSelectedRollingPeriodCount(null);
      return;
    }

    setSelectedRollingPeriodCount((current) => {
      if (current !== null && rollingPresetCounts.includes(current)) {
        return current;
      }

      return rollingPresetCounts[0] ?? null;
    });
  }, [isMeasurementGoal, rollingPresetCounts]);

  // Entry actions
  const handleEditEntry = useCallback((entry: NormalizedEntry) => {
    setEditingEntry(entry);
  }, []);

  // Two-tap delete is now handled by EntryItem component
  const handleDeleteEntry = useCallback(
    async (entry: NormalizedEntry) => {
      await deleteEntry(entry.id);
    },
    [deleteEntry]
  );

  const handleCloseEditModal = useCallback(() => {
    setEditingEntry(null);
  }, []);

  const currentValue = isMeasurementGoal
    ? latestEntry?.amount ?? null
    : currentTotal;

  // Loading state
  if (isLoadingGoal) {
    return (
      <View className="flex-1 bg-zinc-50 dark:bg-app-dark-base items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-zinc-400 mt-4">Loading goal...</Text>
      </View>
    );
  }

  // Error state
  if (goalError || !goal) {
    return (
      <View className="flex-1 bg-zinc-50 dark:bg-app-dark-base pt-20 px-6">
        <GoalDetailHeader title="Error" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-red-500 text-center text-lg">
            {goalError?.message || "Goal not found"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-app-dark-base pt-20 px-4">
      {/* Header */}
      <GoalDetailHeader title={goal.title} unit={goal.unit} goalId={goal.id} />

      {/* Summary Card */}
      <GoalSummaryCard
        goal={goal}
        currentValue={currentValue}
        periodStart={periodStart}
        lastEntryAt={latestEntry?.timestamp ?? null}
      />

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "tracking" ? (
        isMeasurementGoal ? (
          <MeasurementTrackingView
            goal={goal}
            graph={graph}
            graphRange={graphRange}
            isGraphLoading={isLoadingGraph}
            timezone={settings.timezone}
            onGraphRangeChange={setGraphRange}
          />
        ) : (
          <CurrentPeriodView
            goal={goal}
            graph={graph}
            graphRange={graphRange}
            isGraphLoading={isLoadingGraph}
            rollingSummary={rollingSummary}
            isRollingSummaryLoading={isLoadingRollingSummary}
            rollingPeriodCounts={rollingPresetCounts}
            selectedRollingPeriodCount={selectedRollingPeriodCount}
            countEmptyRollingPeriods={countEmptyRollingPeriods}
            timezone={settings.timezone}
            onGraphRangeChange={setGraphRange}
            onCountEmptyRollingPeriodsChange={setCountEmptyRollingPeriods}
            onRollingPeriodCountChange={setSelectedRollingPeriodCount}
          />
        )
      ) : (
        <HistoryLedgerView
          periods={periods}
          goalType={goalType}
          unit={goal.unit}
          isLoading={isLoadingHistory}
          isLoadingMore={isLoadingMoreHistory}
          hasMore={hasMoreHistory}
          onLoadMore={() => {
            void loadMoreHistory();
          }}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      )}

      {/* Edit Modal */}
      <EntryEditModal
        visible={editingEntry !== null}
        entry={editingEntry}
        unit={goal.unit}
        onClose={handleCloseEditModal}
      />
    </View>
  );
}

/**
 * Creates a placeholder goal for useGoalTotal when real goal is still loading
 */
function createPlaceholderGoal(id: string) {
  return {
    id,
    title: "",
    type: "counter" as const,
    unit: null,
    target: null,
    resetValue: 1,
    resetUnit: "day" as const,
    rollingWindowValue: null,
    rollingWindowUnit: null,
    quickAdd1: 1,
    quickAdd2: null,
    quickAdd3: null,
    quickAdd4: null,
    sortOrder: 0,
    status: "active" as const,
    createdAt: new Date(),
  };
}
