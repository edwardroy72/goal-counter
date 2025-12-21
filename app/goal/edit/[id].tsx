/**
 * Edit Goal Screen
 *
 * Allows editing of goal properties:
 * - Name, Target, Unit
 * - Quick Add amounts (up to 4)
 * - Reset interval configuration
 */

import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../../db/client";
import { queryCache } from "../../../db/query-cache";
import { goals } from "../../../db/schema";
import { useGoalById } from "../../../hooks/useGoalById";

type ResetUnitType = "day" | "week" | "month" | "none";

const RESET_UNIT_OPTIONS: { value: ResetUnitType; label: string }[] = [
  { value: "day", label: "Day(s)" },
  { value: "week", label: "Week(s)" },
  { value: "month", label: "Month(s)" },
  { value: "none", label: "Never" },
];

export default function EditGoal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = typeof id === "string" ? id : "";

  const { goal, isLoading, error } = useGoalById(goalId);

  // Form State
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [resetValue, setResetValue] = useState("1");
  const [resetUnit, setResetUnit] = useState<ResetUnitType>("day");
  const [quickAdd1, setQuickAdd1] = useState("1");
  const [quickAdd2, setQuickAdd2] = useState("");
  const [quickAdd3, setQuickAdd3] = useState("");
  const [quickAdd4, setQuickAdd4] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(3);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset delete confirmation after 3 seconds with countdown
  useEffect(() => {
    if (confirmingDelete) {
      setDeleteCountdown(3);

      // Update countdown every second
      deleteIntervalRef.current = setInterval(() => {
        setDeleteCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Reset after 3 seconds
      deleteTimeoutRef.current = setTimeout(() => {
        setConfirmingDelete(false);
        setDeleteCountdown(3);
      }, 3000);
    }
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      if (deleteIntervalRef.current) {
        clearInterval(deleteIntervalRef.current);
      }
    };
  }, [confirmingDelete]);

  // Populate form when goal loads
  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setUnit(goal.unit || "");
      setTarget(goal.target !== null ? String(goal.target) : "");
      setResetValue(String(goal.resetValue ?? 1));
      setResetUnit((goal.resetUnit as ResetUnitType) ?? "day");
      setQuickAdd1(String(goal.quickAdd1));
      setQuickAdd2(goal.quickAdd2 !== null ? String(goal.quickAdd2) : "");
      setQuickAdd3(goal.quickAdd3 !== null ? String(goal.quickAdd3) : "");
      setQuickAdd4(goal.quickAdd4 !== null ? String(goal.quickAdd4) : "");
    }
  }, [goal]);

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

    setIsSaving(true);
    try {
      await db
        .update(goals)
        .set({
          title: title.trim(),
          unit: unit.trim() || null,
          target: target ? parseFloat(target) : null,
          resetValue: resetUnit === "none" ? 0 : parseInt(resetValue) || 1,
          resetUnit: resetUnit,
          quickAdd1: qa1,
          quickAdd2: parseQuickAdd(quickAdd2),
          quickAdd3: parseQuickAdd(quickAdd3),
          quickAdd4: parseQuickAdd(quickAdd4),
        })
        .where(eq(goals.id, goalId));

      queryCache.invalidate();
      router.back();
    } catch (err) {
      console.error("Update failed:", err);
      Alert.alert("Error", "Failed to update goal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (confirmingDelete) {
      // Second tap - perform delete
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      try {
        await db.delete(goals).where(eq(goals.id, goalId));
        queryCache.invalidate();
        // Navigate back to dashboard
        router.replace("/");
      } catch (err) {
        console.error("Delete failed:", err);
        Alert.alert("Error", "Failed to delete goal.");
        setConfirmingDelete(false);
      }
    } else {
      // First tap - show confirmation
      setConfirmingDelete(true);
    }
  }, [confirmingDelete, goalId, router]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-zinc-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !goal) {
    return (
      <View className="flex-1 bg-zinc-900 pt-20 px-6">
        <Text className="text-red-500 text-center text-lg">Goal not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 self-center"
        >
          <Text className="text-blue-500 font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-zinc-900 p-6 pt-20">
      <View className="flex-row justify-between items-center mb-10">
        <Text className="text-3xl font-bold text-white">Edit Goal</Text>
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

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={isSaving}
        activeOpacity={0.8}
        className={`p-5 rounded-3xl mt-6 shadow-lg ${
          isSaving ? "bg-blue-800" : "bg-blue-600"
        }`}
      >
        <Text className="text-white text-center font-bold text-lg">
          {isSaving ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>

      {/* Delete Button */}
      <TouchableOpacity
        onPress={handleDelete}
        activeOpacity={0.8}
        className={`p-5 rounded-3xl mt-4 ${
          confirmingDelete
            ? "bg-red-500"
            : "bg-red-500/70 border border-red-500/30"
        }`}
      >
        <Text className={`text-center font-bold text-lg text-white`}>
          {confirmingDelete
            ? `Tap Again to Confirm Delete (${deleteCountdown})`
            : "Delete Goal"}
        </Text>
      </TouchableOpacity>

      <View className="h-20" />
    </ScrollView>
  );
}
