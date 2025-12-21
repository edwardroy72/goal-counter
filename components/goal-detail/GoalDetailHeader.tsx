/**
 * GoalDetailHeader Component
 *
 * Displays the header with back button and goal title.
 */

import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

interface GoalDetailHeaderProps {
  title: string;
  unit?: string | null;
}

export function GoalDetailHeader({ title, unit }: GoalDetailHeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center mb-6">
      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        className="bg-zinc-200 dark:bg-zinc-800 p-2 rounded-full mr-4"
      >
        <ChevronLeft color="#a1a1aa" size={24} />
      </TouchableOpacity>
      <View className="flex-1">
        <Text
          className="text-2xl font-bold dark:text-white"
          numberOfLines={1}
        >
          {title}
        </Text>
        {unit && (
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}
