/**
 * Goal Detail Screen
 *
 * Displays detailed view of a goal with:
 * - Summary card (current total, target, countdown)
 * - Tab navigation (Current Period / Ledger)
 * - Entry management (add, edit, delete)
 */

import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import {
  CurrentPeriodView,
  EntryEditModal,
  GoalDetailHeader,
  GoalSummaryCard,
  LedgerView,
  ManualAddModal,
  TabBar,
  type TabId,
} from "../../components/goal-detail";
import { useEntryActions } from "../../hooks/useEntryActions";
import { useGoalById } from "../../hooks/useGoalById";
import { useGoalEntries, type NormalizedEntry } from "../../hooks/useGoalEntries";
import { useGoalTotal } from "../../hooks/useGoalTotal";

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = typeof id === "string" ? id : "";

  // Data fetching hooks
  const { goal, isLoading: isLoadingGoal, error: goalError } = useGoalById(goalId);
  const currentTotal = useGoalTotal(goal ?? createPlaceholderGoal(goalId));
  const {
    groupedByDay,
    isLoading: isLoadingEntries,
    periodStart,
  } = useGoalEntries(goal);
  const { deleteEntry } = useEntryActions();

  // UI state
  const [activeTab, setActiveTab] = useState<TabId>("current");
  const [editingEntry, setEditingEntry] = useState<NormalizedEntry | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);

  // Entry actions
  const handleEditEntry = useCallback((entry: NormalizedEntry) => {
    setEditingEntry(entry);
  }, []);

  const handleDeleteEntry = useCallback(
    (entry: NormalizedEntry) => {
      Alert.alert(
        "Delete Entry",
        `Are you sure you want to delete this entry of ${entry.amount}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await deleteEntry(entry.id);
            },
          },
        ]
      );
    },
    [deleteEntry]
  );

  const handleCloseEditModal = useCallback(() => {
    setEditingEntry(null);
  }, []);

  const handleOpenManualAdd = useCallback(() => {
    setShowManualAdd(true);
  }, []);

  const handleCloseManualAdd = useCallback(() => {
    setShowManualAdd(false);
  }, []);

  // Loading state
  if (isLoadingGoal) {
    return (
      <View className="flex-1 bg-zinc-50 dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-zinc-400 mt-4">Loading goal...</Text>
      </View>
    );
  }

  // Error state
  if (goalError || !goal) {
    return (
      <View className="flex-1 bg-zinc-50 dark:bg-zinc-950 pt-20 px-6">
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
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950 pt-20 px-4">
      {/* Header */}
      <GoalDetailHeader title={goal.title} unit={goal.unit} />

      {/* Summary Card */}
      <GoalSummaryCard
        goal={goal}
        currentTotal={currentTotal}
        periodStart={periodStart}
      />

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "current" ? (
        <CurrentPeriodView
          goal={goal}
          groupedEntries={groupedByDay}
          isLoading={isLoadingEntries}
          onManualAdd={handleOpenManualAdd}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      ) : (
        <LedgerView
          groupedEntries={groupedByDay}
          unit={goal.unit}
          isLoading={isLoadingEntries}
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

      {/* Manual Add Modal */}
      <ManualAddModal
        visible={showManualAdd}
        goal={goal}
        onClose={handleCloseManualAdd}
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
    unit: null,
    target: null,
    resetValue: 1,
    resetUnit: "day" as const,
    quickAdd1: 1,
    quickAdd2: null,
    quickAdd3: null,
    quickAdd4: null,
    sortOrder: 0,
    status: "active" as const,
    createdAt: new Date(),
  };
}

