/**
 * TabBar Component
 *
 * Simple tab navigation for Current Period / Ledger views.
 */

import { Text, TouchableOpacity, View } from "react-native";

export type TabId = "current" | "ledger";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "current", label: "Current Period" },
  { id: "ledger", label: "Ledger" },
];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <View className="flex-row bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-1 mb-4">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            className={`flex-1 py-3 rounded-xl ${
              isActive ? "bg-white dark:bg-zinc-700" : ""
            }`}
          >
            <Text
              className={`text-center font-bold text-sm ${
                isActive
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
