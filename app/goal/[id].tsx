import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

export default function GoalDetail() {
  const { id } = useLocalSearchParams(); // Grabs the goal ID from the URL
  const router = useRouter();

  return (
    // Matching your Zinc-950 flat dark gray theme
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950 pt-20 px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-zinc-200 dark:bg-zinc-800 p-2 rounded-full mr-4"
        >
          <ChevronLeft color="#a1a1aa" size={24} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold dark:text-white">Goal Details</Text>
      </View>

      <View className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
        <Text className="text-zinc-500 font-bold uppercase text-xs mb-2">
          Internal ID
        </Text>
        <Text className="text-xl font-mono dark:text-white">{id}</Text>
      </View>
    </View>
  );
}
