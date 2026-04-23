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
import {
  Archive,
  ArchiveRestore,
  Copy,
  Save,
  Trash2,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GoalFormFields,
  MeasurementGoalFormFields,
} from "../../../components/goal-form";
import { db } from "../../../db/client";
import { queryCache } from "../../../db/query-cache";
import { goals } from "../../../db/schema";
import { useGoalById } from "../../../hooks/useGoalById";
import { useGoalLifecycle } from "../../../hooks/useGoalLifecycle";
import type { GoalTargetType, ResetUnit } from "../../../types/domain";
import { buildGoalMutationValues } from "../../../utils/goal-config";
import { buildMeasurementGoalMutationValues } from "../../../utils/measurement-goal-config";

type ResetUnitType = ResetUnit;

export default function EditGoal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = typeof id === "string" ? id : "";

  const { goal, isLoading, error } = useGoalById(goalId);
  const {
    archiveGoal,
    unarchiveGoal,
    deleteGoal,
    duplicateGoal,
    isProcessing: isLifecycleProcessing,
    activeAction,
  } = useGoalLifecycle();

  // Form State
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState<GoalTargetType>("min");
  const [resetValue, setResetValue] = useState("1");
  const [resetUnit, setResetUnit] = useState<ResetUnitType>("day");
  const [quickAdd1, setQuickAdd1] = useState("1");
  const [quickAdd2, setQuickAdd2] = useState("");
  const [quickAdd3, setQuickAdd3] = useState("");
  const [quickAdd4, setQuickAdd4] = useState("");
  const [measurementTitle, setMeasurementTitle] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("");
  const [measurementTarget, setMeasurementTarget] = useState("");
  const [measurementTargetType, setMeasurementTargetType] =
    useState<GoalTargetType>("min");
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
      setTargetType(goal.targetType ?? "min");
      setResetValue(String(goal.resetValue ?? 1));
      setResetUnit((goal.resetUnit as ResetUnitType) ?? "day");
      setQuickAdd1(String(goal.quickAdd1));
      setQuickAdd2(goal.quickAdd2 !== null ? String(goal.quickAdd2) : "");
      setQuickAdd3(goal.quickAdd3 !== null ? String(goal.quickAdd3) : "");
      setQuickAdd4(goal.quickAdd4 !== null ? String(goal.quickAdd4) : "");
      setMeasurementTitle(goal.title);
      setMeasurementUnit(goal.unit || "");
      setMeasurementTarget(goal.target !== null ? String(goal.target) : "");
      setMeasurementTargetType(goal.targetType ?? "min");
    }
  }, [goal]);

  const handleSave = async () => {
    const goalType = goal?.type ?? "counter";
    const result =
      goalType === "measurement"
        ? buildMeasurementGoalMutationValues({
            title: measurementTitle,
            unit: measurementUnit,
            target: measurementTarget,
            targetType: measurementTargetType,
          })
        : buildGoalMutationValues({
            title,
            unit,
            target,
            targetType,
            resetValue,
            resetUnit,
            quickAdd1,
            quickAdd2,
            quickAdd3,
            quickAdd4,
          });

    if (!result.ok) {
      Alert.alert(result.error.title, result.error.message);
      return;
    }

    setIsSaving(true);
    try {
      await db
        .update(goals)
        .set(result.values)
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
        const success = await deleteGoal(goalId);
        if (!success) {
          throw new Error("Delete failed");
        }
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
  }, [confirmingDelete, deleteGoal, goalId, router]);

  const handleArchiveToggle = useCallback(async () => {
    const isArchived = goal?.status === "archived";
    const success = isArchived
      ? await unarchiveGoal(goalId)
      : await archiveGoal(goalId);

    if (!success) {
      Alert.alert(
        "Error",
        isArchived ? "Failed to unarchive goal." : "Failed to archive goal."
      );
      return;
    }

    if (isArchived) {
      router.back();
      return;
    }

    router.replace("/");
  }, [archiveGoal, goal?.status, goalId, router, unarchiveGoal]);

  const handleDuplicate = useCallback(async () => {
    const duplicatedGoalId = await duplicateGoal(goalId);

    if (!duplicatedGoalId) {
      Alert.alert("Error", "Failed to duplicate goal.");
      return;
    }

    router.replace(`/goal/${duplicatedGoalId}`);
  }, [duplicateGoal, goalId, router]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-app-dark-base items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !goal) {
    return (
      <View className="flex-1 bg-app-dark-base pt-20 px-6">
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

  const isArchived = goal.status === "archived";
  const isMeasurementGoal = (goal.type ?? "counter") === "measurement";
  const isDuplicatePending = activeAction === "duplicate";
  const isArchivePending =
    activeAction === "archive" || activeAction === "unarchive";
  const isDeletePending = activeAction === "delete";

  return (
    <ScrollView className="flex-1 bg-app-dark-base p-6 pt-20">
      <View className="flex-row justify-between items-center mb-10">
        <Text className="text-3xl font-bold text-white">Edit Goal</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-zinc-800 p-2 rounded-surface"
        >
          <X color="#a1a1aa" size={24} />
        </TouchableOpacity>
      </View>

      <View className="mb-6">
        <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
          Goal Type
        </Text>
        <View className="bg-zinc-800 border border-zinc-700/50 rounded-surface px-5 py-4">
          <Text className="text-white text-base font-semibold">
            {isMeasurementGoal ? "Measurement" : "Counter"}
          </Text>
          <Text className="text-zinc-500 text-sm mt-1">
            {isMeasurementGoal
              ? "Tracks point-in-time values and never resets."
              : "Tracks cumulative progress with reset periods."}
          </Text>
        </View>
      </View>

      {isMeasurementGoal ? (
        <MeasurementGoalFormFields
          title={measurementTitle}
          unit={measurementUnit}
          target={measurementTarget}
          targetType={measurementTargetType}
          onTitleChange={setMeasurementTitle}
          onUnitChange={setMeasurementUnit}
          onTargetChange={setMeasurementTarget}
          onTargetTypeChange={setMeasurementTargetType}
        />
      ) : (
        <GoalFormFields
          title={title}
          unit={unit}
          target={target}
          targetType={targetType}
          resetValue={resetValue}
          resetUnit={resetUnit}
          quickAdd1={quickAdd1}
          quickAdd2={quickAdd2}
          quickAdd3={quickAdd3}
          quickAdd4={quickAdd4}
          onTitleChange={setTitle}
          onUnitChange={setUnit}
          onTargetChange={setTarget}
          onTargetTypeChange={setTargetType}
          onResetValueChange={setResetValue}
          onResetUnitChange={setResetUnit}
          onQuickAdd1Change={setQuickAdd1}
          onQuickAdd2Change={setQuickAdd2}
          onQuickAdd3Change={setQuickAdd3}
          onQuickAdd4Change={setQuickAdd4}
        />
      )}

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={isSaving || isLifecycleProcessing}
        activeOpacity={0.8}
        className={`p-5 rounded-surface mt-6 shadow-lg flex-row items-center justify-center ${
          isSaving ? "bg-blue-800" : "bg-blue-600"
        }`}
      >
        <Save color="white" size={20} strokeWidth={2.5} />
        <Text className="text-white text-center font-bold text-lg ml-2">
          {isSaving ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>

      {/* Delete Button */}
      <TouchableOpacity
        onPress={handleDelete}
        disabled={isSaving || isLifecycleProcessing}
        activeOpacity={0.8}
        className={`p-5 rounded-surface mt-4 flex-row items-center justify-center ${
          confirmingDelete
            ? "bg-red-500"
            : "bg-red-500/70 border border-red-500/30"
        }`}
      >
        <Trash2 color="white" size={20} strokeWidth={2.5} />
        <Text className={`text-center font-bold text-lg text-white ml-2`}>
          {isDeletePending
            ? "Deleting..."
            : confirmingDelete
            ? `Tap Again to Confirm Delete (${deleteCountdown})`
            : "Delete Goal"}
        </Text>
      </TouchableOpacity>

      <View className="mt-4 flex-row gap-4">
        <TouchableOpacity
          onPress={handleDuplicate}
          disabled={isSaving || isLifecycleProcessing}
          activeOpacity={0.8}
          className={`flex-1 p-5 rounded-surface border flex-row items-center justify-center ${
            isDuplicatePending
              ? "bg-zinc-700 border-zinc-600"
              : "bg-zinc-800 border-zinc-700"
          }`}
        >
          <Copy color="white" size={20} strokeWidth={2.5} />
          <Text className="text-white text-center font-bold text-lg ml-2">
            {isDuplicatePending ? "Duplicating..." : "Duplicate"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleArchiveToggle}
          disabled={isSaving || isLifecycleProcessing}
          activeOpacity={0.8}
          className={`flex-1 p-5 rounded-surface border flex-row items-center justify-center ${
            isArchivePending
              ? "bg-zinc-700 border-zinc-600"
              : "bg-zinc-800 border-zinc-700"
          }`}
        >
          {isArchived ? (
            <ArchiveRestore color="white" size={20} strokeWidth={2.5} />
          ) : (
            <Archive color="white" size={20} strokeWidth={2.5} />
          )}
          <Text className="text-center font-bold text-lg text-white ml-2">
            {isArchivePending
              ? isArchived
                ? "Unarchiving..."
                : "Archiving..."
              : isArchived
                ? "Unarchive"
                : "Archive"}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="h-20" />
    </ScrollView>
  );
}
