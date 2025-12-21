import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { goals } from "../db/schema";

export default function CreateGoal() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [resetValue, setResetValue] = useState("1");
  const [resetUnit, setResetUnit] = useState<"day" | "week" | "month" | "none">(
    "day"
  );
  const [quickAdd, setQuickAdd] = useState("1");

  const handleSave = async () => {
    if (!title || !quickAdd) {
      Alert.alert(
        "Missing Info",
        "Goal Name and at least one increment are required."
      );
      return;
    }

    try {
      await db.insert(goals).values({
        title,
        unit: unit || null,
        target: target ? parseFloat(target) : null,
        resetValue: parseInt(resetValue),
        resetUnit: resetUnit,
        quickAdd1: parseFloat(quickAdd),
        sortOrder: Date.now(),
        status: "active",
      });

      // Explicitly invalidate all queries after successful insert
      queryCache.invalidate();

      router.back();
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  return (
    // Updated: Flat dark gray background and deep top padding
    <ScrollView className="flex-1 bg-zinc-900 p-6 pt-20">
      <View className="flex-row justify-between items-center mb-10">
        <Text className="text-3xl font-bold text-white">New Goal</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-zinc-800 p-2 rounded-full"
        >
          <X color="#a1a1aa" size={24} />
        </TouchableOpacity>
      </View>

      <View className="space-y-6">
        {/* Goal Name */}
        <View className="mb-6">
          <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
            Goal Name
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Daily Water"
            placeholderTextColor="#52525b"
            className="bg-zinc-800 p-5 rounded-2xl text-white text-lg border border-zinc-700/50"
          />
        </View>

        {/* Target & Unit */}
        <View className="flex-row gap-4 mb-6">
          <View className="flex-1">
            <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
              Target
            </Text>
            <TextInput
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
              placeholder="Optional"
              placeholderTextColor="#52525b"
              className="bg-zinc-800 p-5 rounded-2xl text-white text-lg border border-zinc-700/50"
            />
          </View>
          <View className="flex-1">
            <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
              Unit
            </Text>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g. mL"
              placeholderTextColor="#52525b"
              className="bg-zinc-800 p-5 rounded-2xl text-white text-lg border border-zinc-700/50"
            />
          </View>
        </View>

        {/* Required Quick Add */}
        <View className="mb-6">
          <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
            Quick Add Increment
          </Text>
          <TextInput
            value={quickAdd}
            onChangeText={setQuickAdd}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor="#52525b"
            className="bg-zinc-800 p-5 rounded-2xl text-white text-lg border border-zinc-700/50"
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handleSave}
        activeOpacity={0.8}
        className="bg-blue-600 p-5 rounded-3xl mt-6 shadow-lg shadow-blue-900/20"
      >
        <Text className="text-white text-center font-bold text-lg">
          Create Goal
        </Text>
      </TouchableOpacity>

      {/* Bottom spacing for scrollability */}
      <View className="h-20" />
    </ScrollView>
  );
}
