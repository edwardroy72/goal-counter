import { useFocusEffect, useRouter } from "expo-router";
import { Plus, Settings } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { GoalCard } from "../components/GoalCard";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { goals } from "../db/schema";
import type { Goal } from "../types/domain";

export default function Dashboard() {
  const router = useRouter();
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const hasMounted = useRef(false);

  // Manual fetch function
  const fetchGoals = useCallback(async () => {
    try {
      console.log("[Dashboard] Fetching goals...");
      const result = await db.select().from(goals);
      console.log("[Dashboard] Fetched", result.length, "goals");
      setAllGoals(result);
    } catch (err) {
      console.error("[Dashboard] Error fetching goals:", err);
      setAllGoals([]);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    console.log("[Dashboard] Initial fetch");
    hasMounted.current = true;
    fetchGoals();
  }, [fetchGoals]);

  // Subscribe to cache invalidation for immediate updates
  useEffect(() => {
    console.log("[Dashboard] Subscribing to query cache");
    const unsubscribe = queryCache.subscribe(() => {
      console.log("[Dashboard] Cache invalidated, refetching goals");
      fetchGoals();
    });
    return () => {
      console.log("[Dashboard] Unsubscribing from query cache");
      unsubscribe();
    };
  }, [fetchGoals]);

  // Re-fetch when returning to screen (but not on initial mount)
  useFocusEffect(
    useCallback(() => {
      // Skip initial mount - useEffect already handles that
      if (!hasMounted.current) return;
      console.log("[Dashboard] Screen focused, refetching goals");
      fetchGoals();
    }, [fetchGoals])
  );

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950 px-4 pt-20">
      <View className="mb-8 px-2 flex-row justify-between items-center">
        <Text className="text-4xl font-black dark:text-white">Goals</Text>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          className="p-2"
          accessibilityLabel="Settings"
        >
          <Settings color="#71717a" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={allGoals}
        keyExtractor={(item) => item.id}
        // UPDATED: Use the GoalCard component instead of the temporary View
        renderItem={({ item }) => <GoalCard goal={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <View className="mt-32 items-center px-10">
            <Text className="text-zinc-500 text-center text-lg leading-6">
              Your ledger is empty.{"\n"}Start by adding a numeric goal.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/modal")}
              className="mt-6 border-b-2 border-blue-500 pb-1"
            >
              <Text className="text-blue-500 font-black text-lg">
                Create Goal
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        onPress={() => router.push("/modal")}
        activeOpacity={0.9}
        className="absolute bottom-12 right-8 bg-blue-600 w-16 h-16 rounded-full items-center justify-center shadow-2xl shadow-blue-500/50"
      >
        <Plus color="white" size={32} strokeWidth={3} />
      </TouchableOpacity>
    </View>
  );
}
