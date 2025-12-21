/**
 * Settings Screen
 *
 * Allows users to configure app preferences including timezone.
 */

import { useRouter } from "expo-router";
import { Check, ChevronDown, X } from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import { COMMON_TIMEZONES, formatGmtOffset } from "../db/settings";

export default function Settings() {
  const router = useRouter();
  const { settings, updateSetting } = useSettings();
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);

  const currentTimezone = COMMON_TIMEZONES.find(
    (tz) => tz.value === settings.timezone
  );
  const currentTimezoneLabel = currentTimezone
    ? `${currentTimezone.label} (${formatGmtOffset(currentTimezone.offset)})`
    : settings.timezone;

  const handleTimezoneSelect = async (timezone: string) => {
    await updateSetting("timezone", timezone);
    setShowTimezonePicker(false);
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
          onPress={() => setShowTimezonePicker(true)}
          className="bg-zinc-800 p-5 rounded-2xl flex-row justify-between items-center border border-zinc-700/50"
        >
          <Text className="text-white text-lg">{currentTimezoneLabel}</Text>
          <ChevronDown color="#71717a" size={20} />
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View className="mt-8 pt-8 border-t border-zinc-800">
        <Text className="text-zinc-500 text-xs text-center">
          Goal Counter v1.0.0
        </Text>
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
              onPress={() => setShowTimezonePicker(false)}
              className="bg-zinc-800 p-2 rounded-full"
            >
              <X color="#a1a1aa" size={20} />
            </TouchableOpacity>
          </View>

          {/* Timezone List */}
          <FlatList
            data={COMMON_TIMEZONES}
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
                      ({formatGmtOffset(item.offset)})
                    </Text>
                  </View>
                  <Text className="text-zinc-500 text-sm">{item.value}</Text>
                </View>
                {settings.timezone === item.value && (
                  <Check color="#22c55e" size={24} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 50 }}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}
