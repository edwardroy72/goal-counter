/**
 * LedgerView Component
 *
 * Displays entries grouped by day in a scrollable list.
 */

import { SectionList, Text, View } from "react-native";
import type { DayGroup, NormalizedEntry } from "../../hooks/useGoalEntries";
import { EntryItem } from "./EntryItem";

interface LedgerViewProps {
  groupedEntries: DayGroup[];
  unit?: string | null;
  isLoading: boolean;
  onEditEntry: (entry: NormalizedEntry) => void;
  onDeleteEntry: (entry: NormalizedEntry) => void;
}

export function LedgerView({
  groupedEntries,
  unit,
  isLoading,
  onEditEntry,
  onDeleteEntry,
}: LedgerViewProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-zinc-400">Loading entries...</Text>
      </View>
    );
  }

  if (groupedEntries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-zinc-400 text-center text-lg">
          No entries yet
        </Text>
        <Text className="text-zinc-500 text-center text-sm mt-2">
          Use quick log or Quick Add to log your first entry
        </Text>
      </View>
    );
  }

  // Transform for SectionList
  const sections = groupedEntries.map((group) => ({
    title: group.displayDate,
    dayTotal: group.dayTotal,
    data: group.entries,
  }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <EntryItem
          entry={item}
          unit={unit}
          onEdit={onEditEntry}
          onDelete={onDeleteEntry}
        />
      )}
      renderSectionHeader={({ section }) => (
        <View className="flex-row justify-between items-center py-2 px-1 bg-zinc-50 dark:bg-app-dark-base">
          <Text className="text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest">
            {section.title}
          </Text>
          <Text className="text-zinc-400 dark:text-zinc-500 text-xs">
            Total:{" "}
            {section.dayTotal.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
            {unit && ` ${unit}`}
          </Text>
        </View>
      )}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    />
  );
}
