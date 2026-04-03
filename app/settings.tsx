/**
 * Settings Screen
 *
 * Allows users to configure app preferences including timezone.
 */

import { useRouter } from "expo-router";
import { Check, ChevronDown, X } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import { useGoalLifecycle } from "../hooks/useGoalLifecycle";
import { useGoals } from "../hooks/useGoals";
import {
  buildTimezoneOption,
  findTimezoneOption,
  formatGmtOffset,
  getTimezoneOptions,
} from "../utils/timezone-options";

export default function Settings() {
  const router = useRouter();
  const { settings, updateSetting } = useSettings();
  const { goals: archivedGoals, isLoading: isLoadingArchivedGoals } = useGoals({
    status: "archived",
  });
  const {
    unarchiveGoal,
    deleteGoal,
    isProcessing: isLifecycleProcessing,
    activeAction,
  } = useGoalLifecycle();
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [timezoneQuery, setTimezoneQuery] = useState("");
  const [processingGoalId, setProcessingGoalId] = useState<string | null>(null);
  const deferredTimezoneQuery = useDeferredValue(timezoneQuery);

  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const currentTimezone = useMemo(
    () =>
      timezoneOptions.find((timezone) => timezone.value === settings.timezone) ??
      buildTimezoneOption(settings.timezone) ??
      findTimezoneOption(settings.timezone),
    [settings.timezone, timezoneOptions]
  );
  const filteredTimezones = useMemo(() => {
    const query = deferredTimezoneQuery.trim().toLowerCase();

    if (!query) {
      return timezoneOptions;
    }

    return timezoneOptions.filter((timezone) => {
      return (
        timezone.searchText.includes(query) ||
        formatGmtOffset(timezone.offsetMinutes).toLowerCase().includes(query)
      );
    });
  }, [deferredTimezoneQuery, timezoneOptions]);

  const currentTimezoneLabel = currentTimezone
    ? `${currentTimezone.label} (${formatGmtOffset(currentTimezone.offsetMinutes)})`
    : settings.timezone;

  const handleTimezoneSelect = async (timezone: string) => {
    await updateSetting("timezone", timezone);
    setShowTimezonePicker(false);
    setTimezoneQuery("");
  };

  const handleUnarchiveGoal = async (goalId: string) => {
    setProcessingGoalId(goalId);
    const success = await unarchiveGoal(goalId);
    if (!success) {
      setProcessingGoalId(null);
      Alert.alert("Error", "Failed to unarchive goal.");
      return;
    }
    setProcessingGoalId(null);
  };

  const handleDeleteArchivedGoal = (goalId: string) => {
    Alert.alert(
      "Delete Archived Goal?",
      "This permanently removes the goal and all of its history.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setProcessingGoalId(goalId);
              const success = await deleteGoal(goalId);
              if (!success) {
                Alert.alert("Error", "Failed to permanently delete goal.");
              }
              setProcessingGoalId(null);
            })();
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-zinc-900 p-6 pt-20">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-10">
        <Text className="text-3xl font-bold text-white">Settings</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-zinc-800 p-2 rounded-full"
        >
          <X color="#a1a1aa" size={24} />
        </TouchableOpacity>
      </View>

      {/* Timezone Section */}
      <View className="mb-6">
        <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
          Timezone
        </Text>
        <Text className="text-zinc-600 text-xs mb-3 ml-1">
          All period resets and time calculations use this timezone
        </Text>
        <TouchableOpacity
          onPress={() => {
            setTimezoneQuery("");
            setShowTimezonePicker(true);
          }}
          className="bg-zinc-800 p-5 rounded-2xl flex-row justify-between items-center border border-zinc-700/50"
        >
          <Text className="text-white text-lg">{currentTimezoneLabel}</Text>
          <ChevronDown color="#71717a" size={20} />
        </TouchableOpacity>
      </View>

      {/* Archived Goals */}
      <View className="mt-8 pt-8 border-t border-zinc-800">
        <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
          Archived Goals
        </Text>
        <Text className="text-zinc-600 text-xs mb-3 ml-1">
          Restore archived goals or permanently delete them when you no longer
          need the history.
        </Text>
        {isLoadingArchivedGoals ? (
          <View className="bg-zinc-800 p-5 rounded-2xl border border-zinc-700/50">
            <Text className="text-zinc-400">Loading archived goals...</Text>
          </View>
        ) : archivedGoals.length === 0 ? (
          <View className="bg-zinc-800 p-5 rounded-2xl border border-zinc-700/50">
            <Text className="text-zinc-400">No archived goals</Text>
          </View>
        ) : (
          <View className="gap-3">
            {archivedGoals.map((goal) => {
              const isGoalProcessing =
                isLifecycleProcessing && processingGoalId === goal.id;
              const isGoalUnarchiving =
                isGoalProcessing && activeAction === "unarchive";
              const isGoalDeleting =
                isGoalProcessing && activeAction === "delete";

              return (
                <View
                  key={goal.id}
                  className="bg-zinc-800 p-5 rounded-2xl border border-zinc-700/50 flex-row items-center justify-between"
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-white text-lg font-semibold">
                      {goal.title}
                    </Text>
                    <Text className="text-zinc-500 text-sm mt-1">
                      {goal.unit || "No unit"}
                      {goal.target !== null ? ` • Target ${goal.target}` : ""}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        void handleUnarchiveGoal(goal.id);
                      }}
                      disabled={isLifecycleProcessing}
                      className="bg-emerald-500/80 px-4 py-3 rounded-xl"
                    >
                      <Text className="text-white font-semibold">
                        {isGoalUnarchiving ? "Unarchiving..." : "Unarchive"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteArchivedGoal(goal.id)}
                      disabled={isLifecycleProcessing}
                      className={`px-4 py-3 rounded-xl border ${
                        isGoalDeleting
                          ? "bg-red-500 border-red-500"
                          : "bg-red-500/10 border-red-500/40"
                      }`}
                    >
                      <Text className="text-white font-semibold">
                        {isGoalDeleting ? "Deleting..." : "Delete"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View className="mt-8 pt-8 border-t border-zinc-800">
          <Text className="text-zinc-500 text-xs text-center">
            Goal Counter v1.0.0
          </Text>
        </View>
      </View>

      {/* Timezone Picker Modal */}
      <Modal
        visible={showTimezonePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTimezonePicker(false)}
      >
        <View className="flex-1 bg-zinc-900">
          {/* Modal Header */}
          <View className="flex-row justify-between items-center p-6 pt-16 border-b border-zinc-800">
            <Text className="text-xl font-bold text-white">
              Select Timezone
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowTimezonePicker(false);
                setTimezoneQuery("");
              }}
              className="bg-zinc-800 p-2 rounded-full"
            >
              <X color="#a1a1aa" size={20} />
            </TouchableOpacity>
          </View>

          <View className="px-6 pt-4">
            <TextInput
              value={timezoneQuery}
              onChangeText={setTimezoneQuery}
              placeholder="Search city, region, or timezone"
              placeholderTextColor="#71717a"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-zinc-800 border border-zinc-700/50 rounded-2xl px-4 py-4 text-white"
            />
          </View>

          {/* Timezone List */}
          <FlatList
            data={filteredTimezones}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleTimezoneSelect(item.value)}
                className="flex-row justify-between items-center p-5 border-b border-zinc-800/50"
              >
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-white text-lg">{item.label}</Text>
                    <Text className="text-zinc-500 text-sm ml-2">
                      ({formatGmtOffset(item.offsetMinutes)})
                    </Text>
                  </View>
                  <Text className="text-zinc-500 text-sm">{item.value}</Text>
                </View>
                {settings.timezone === item.value && (
                  <Check color="#22c55e" size={24} />
                )}
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 50 }}
            ListEmptyComponent={
              <View className="items-center justify-center py-12 px-6">
                <Text className="text-zinc-400 text-base text-center">
                  No matching timezones
                </Text>
                <Text className="text-zinc-500 text-sm text-center mt-2">
                  Try searching by city, region, or the IANA timezone name.
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </ScrollView>
  );
}
