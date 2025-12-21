/**
 * HistoryLedgerView Component
 *
 * Displays entries grouped first by period, then by day within each period.
 * Used for the full ledger/history view with proper period boundaries.
 */

import { ScrollView, Text, View } from "react-native";
import type { NormalizedEntry } from "../../hooks/useGoalEntries";
import type { PeriodGroup } from "../../hooks/useGoalHistory";
import { EntryItem } from "./EntryItem";

interface HistoryLedgerViewProps {
  periods: PeriodGroup[];
  unit?: string | null;
  isLoading: boolean;
  onEditEntry: (entry: NormalizedEntry) => void;
  onDeleteEntry: (entry: NormalizedEntry) => void;
}

export function HistoryLedgerView({
  periods,
  unit,
  isLoading,
  onEditEntry,
  onDeleteEntry,
}: HistoryLedgerViewProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-zinc-400">Loading entries...</Text>
      </View>
    );
  }

  if (periods.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-zinc-400 text-center text-lg">
          No entries yet
        </Text>
        <Text className="text-zinc-500 text-center text-sm mt-2">
          Use Quick Add or Manual Add to log your first entry
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {periods.map((period, periodIndex) => (
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
            <Text className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
              {period.periodTotal.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
              {unit && ` ${unit}`}
            </Text>
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
                  <Text className="text-zinc-400 dark:text-zinc-500 text-xs">
                    {day.dayTotal.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                    {unit && ` ${unit}`}
                  </Text>
                </View>
              )}

              {/* Entries for this day */}
              {day.entries.map((entry) => (
                <EntryItem
                  key={entry.id}
                  entry={entry}
                  unit={unit}
                  onEdit={onEditEntry}
                  onDelete={onDeleteEntry}
                />
              ))}
            </View>
          ))}
        </View>
      ))}

      {/* Bottom padding */}
      <View className="h-20" />
    </ScrollView>
  );
}
