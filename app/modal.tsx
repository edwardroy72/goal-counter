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

type ResetUnitType = "day" | "week" | "month" | "none";

const RESET_UNIT_OPTIONS: { value: ResetUnitType; label: string }[] = [
  { value: "day", label: "Day(s)" },
  { value: "week", label: "Week(s)" },
  { value: "month", label: "Month(s)" },
  { value: "none", label: "Never" },
];

export default function CreateGoal() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [resetValue, setResetValue] = useState("1");
  const [resetUnit, setResetUnit] = useState<ResetUnitType>("day");

  // Quick Add amounts (up to 4)
  const [quickAdd1, setQuickAdd1] = useState("1");
  const [quickAdd2, setQuickAdd2] = useState("");
  const [quickAdd3, setQuickAdd3] = useState("");
  const [quickAdd4, setQuickAdd4] = useState("");

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Info", "Goal Name is required.");
      return;
    }

    const qa1 = parseFloat(quickAdd1);
    if (!quickAdd1 || isNaN(qa1) || qa1 <= 0) {
      Alert.alert("Missing Info", "At least one Quick Add value is required.");
      return;
    }

    const parseQuickAdd = (val: string): number | null => {
      const parsed = parseFloat(val);
      return val && !isNaN(parsed) && parsed > 0 ? parsed : null;
    };

    try {
      await db.insert(goals).values({
        title: title.trim(),
        unit: unit.trim() || null,
        target: target ? parseFloat(target) : null,
        resetValue: resetUnit === "none" ? 0 : parseInt(resetValue) || 1,
        resetUnit: resetUnit,
        quickAdd1: qa1,
        quickAdd2: parseQuickAdd(quickAdd2),
        quickAdd3: parseQuickAdd(quickAdd3),
        quickAdd4: parseQuickAdd(quickAdd4),
        sortOrder: Date.now(),
        status: "active",
      });

      queryCache.invalidate();
      router.back();
    } catch (err) {
      console.error("Save failed:", err);
      Alert.alert("Error", "Failed to create goal. Please try again.");
    }
  };

  return (
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
            Target (optional)
          </Text>
          <TextInput
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder="e.g. 2000"
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

      {/* Reset Interval */}
      <View className="mb-6">
        <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
          Reset Every
        </Text>
        <View className="flex-row gap-3">
          {resetUnit !== "none" && (
            <TextInput
              value={resetValue}
              onChangeText={setResetValue}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#52525b"
              className="bg-zinc-800 p-5 rounded-2xl text-white text-lg border border-zinc-700/50 w-20 text-center"
            />
          )}
          <View className="flex-1 flex-row flex-wrap gap-2">
            {RESET_UNIT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setResetUnit(option.value)}
                className={`flex-1 min-w-[70px] py-3 px-2 rounded-xl border ${
                  resetUnit === option.value
                    ? "bg-blue-600 border-blue-500"
                    : "bg-zinc-800 border-zinc-700/50"
                }`}
              >
                <Text
                  className={`text-center text-sm font-medium ${
                    resetUnit === option.value ? "text-white" : "text-zinc-400"
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Quick Add Amounts */}
      <View className="mb-6">
        <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
          Quick Add Amounts (up to 4)
        </Text>
        <View className="flex-row gap-3">
          <TextInput
            value={quickAdd1}
            onChangeText={setQuickAdd1}
            keyboardType="decimal-pad"
            placeholder="1*"
            placeholderTextColor="#52525b"
            className="flex-1 bg-zinc-800 p-4 rounded-2xl text-white text-lg border border-zinc-700/50 text-center"
          />
          <TextInput
            value={quickAdd2}
            onChangeText={setQuickAdd2}
            keyboardType="decimal-pad"
            placeholder="+"
            placeholderTextColor="#52525b"
            className="flex-1 bg-zinc-800 p-4 rounded-2xl text-white text-lg border border-zinc-700/50 text-center"
          />
          <TextInput
            value={quickAdd3}
            onChangeText={setQuickAdd3}
            keyboardType="decimal-pad"
            placeholder="+"
            placeholderTextColor="#52525b"
            className="flex-1 bg-zinc-800 p-4 rounded-2xl text-white text-lg border border-zinc-700/50 text-center"
          />
          <TextInput
            value={quickAdd4}
            onChangeText={setQuickAdd4}
            keyboardType="decimal-pad"
            placeholder="+"
            placeholderTextColor="#52525b"
            className="flex-1 bg-zinc-800 p-4 rounded-2xl text-white text-lg border border-zinc-700/50 text-center"
          />
        </View>
        <Text className="text-zinc-600 text-xs mt-2 ml-1">
          First value is required. Leave others empty if not needed.
        </Text>
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

      <View className="h-20" />
    </ScrollView>
  );
}
