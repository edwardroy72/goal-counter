/**
 * HistoryLedgerView Component
 *
 * Displays entries grouped first by period, then by day within each period.
 * Used for the dedicated history tab with proper period boundaries.
 */

import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { NormalizedEntry } from "../../hooks/useGoalEntries";
import type { PeriodGroup } from "../../hooks/useGoalHistory";
import type { GoalType } from "../../types/domain";
import { EntryItem } from "./EntryItem";

interface HistoryLedgerViewProps {
  periods: PeriodGroup[];
  goalType?: GoalType | null;
  unit?: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEditEntry: (entry: NormalizedEntry) => void;
  onDeleteEntry: (entry: NormalizedEntry) => void;
}

export function HistoryLedgerView({
  periods,
  goalType = "counter",
  unit,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onEditEntry,
  onDeleteEntry,
}: HistoryLedgerViewProps) {
  const isMeasurementGoal = goalType === "measurement";

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-zinc-400">Loading entries...</Text>
      </View>
    );
  }

  if (periods.length === 0) {
    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-zinc-400 text-center text-lg">
            No entries yet
          </Text>
          <Text className="text-zinc-500 text-center text-sm mt-2">
            {isMeasurementGoal
              ? "Use quick log to record your first measurement"
              : "Use quick log or Quick Add to log your first entry"}
          </Text>
        </View>
        <View className="h-20" />
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {periods.map((period) => (
        <View key={period.periodStart.toISOString()} className="mb-6">
          {/* Period Header */}
          <View className="flex-row justify-between items-center py-3 px-1 border-b border-zinc-200 dark:border-zinc-800 mb-3">
            <View className="flex-row items-center">
              {period.isCurrentPeriod && (
                <View className="bg-blue-500 w-2 h-2 rounded-full mr-2" />
              )}
              <Text className="text-zinc-700 dark:text-zinc-300 font-bold text-sm">
                {period.periodLabel}
              </Text>
            </View>
            {!isMeasurementGoal ? (
              <Text className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                {period.periodTotal.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
                {unit && ` ${unit}`}
              </Text>
            ) : null}
          </View>

          {/* Days within period */}
          {period.days.map((day) => (
            <View key={day.date} className="mb-4">
              {/* Day Header - only show if period spans multiple days */}
              {period.days.length > 1 && (
                <View className="flex-row justify-between items-center py-1 px-1 mb-2">
                  <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    {day.displayDate}
                  </Text>
                  {!isMeasurementGoal ? (
                    <Text className="text-zinc-400 dark:text-zinc-500 text-xs">
                      {day.dayTotal.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                      {unit && ` ${unit}`}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Entries for this day */}
              <View
                testID={`history-day-group-${day.date}`}
                className="overflow-hidden rounded-history-entry border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-app-dark-surface"
              >
                {day.entries.map((entry, index) => (
                  <EntryItem
                    key={entry.id}
                    entry={entry}
                    unit={unit}
                    showSign={!isMeasurementGoal}
                    grouped
                    isLastInGroup={index === day.entries.length - 1}
                    onEdit={onEditEntry}
                    onDelete={onDeleteEntry}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}

      {hasMore && (
        <View className="mb-6">
          <TouchableOpacity
            onPress={onLoadMore}
            accessibilityRole="button"
            accessibilityLabel="Load more history"
            disabled={isLoadingMore}
            className={`py-4 rounded-surface items-center border ${
              isLoadingMore
                ? "bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700"
                : "bg-white border-zinc-200 dark:bg-app-dark-surface dark:border-zinc-800"
            }`}
          >
            <Text className="text-zinc-700 dark:text-zinc-200 font-semibold">
              {isLoadingMore ? "Loading more..." : "Load more"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom padding */}
      <View className="h-20" />
    </ScrollView>
  );
}
