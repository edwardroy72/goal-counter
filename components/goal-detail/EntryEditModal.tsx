/**
 * EntryEditModal Component
 *
 * Modal for editing an entry's amount, date/time, and note.
 */

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSettings } from "../../contexts/SettingsContext";
import { useEntryActions } from "../../hooks/useEntryActions";
import type { NormalizedEntry } from "../../hooks/useGoalEntries";

type PickerMode = "datetime" | null;

interface EntryEditModalProps {
  visible: boolean;
  entry: NormalizedEntry | null;
  unit?: string | null;
  onClose: () => void;
}

export function EntryEditModal({
  visible,
  entry,
  unit,
  onClose,
}: EntryEditModalProps) {
  const [amount, setAmount] = useState("");
  const [editedTimestamp, setEditedTimestamp] = useState(new Date());
  const [note, setNote] = useState("");
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const { settings } = useSettings();
  const { updateEntry, isProcessing, error, clearError } = useEntryActions();

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setAmount(entry.amount.toString());
      setEditedTimestamp(entry.timestamp);
      setNote(entry.note || "");
      setPickerMode(null);
    }
  }, [entry]);

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error.message, [
        { text: "OK", onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  const handleSave = async () => {
    if (!entry) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive number.");
      return;
    }

    if (isNaN(editedTimestamp.getTime())) {
      Alert.alert(
        "Invalid Date or Time",
        "Please select a valid date and time."
      );
      return;
    }

    const success = await updateEntry(entry.id, {
      amount: parsedAmount,
      timestamp: editedTimestamp,
      note: note.trim() || null,
    });

    if (success) {
      onClose();
    }
  };

  const updatePickerValue = (selectedDate: Date) => {
    setEditedTimestamp((current) =>
      isNaN(selectedDate.getTime()) ? current : selectedDate
    );
  };

  const handleInlinePickerChange = (
    _event: DateTimePickerChangeEvent,
    selectedDate: Date
  ) => {
    if (!pickerMode) {
      return;
    }

    updatePickerValue(selectedDate);
  };

  const openPicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: editedTimestamp,
        mode: "date",
        design: "material",
        title: "Choose Date",
        is24Hour: false,
        timeZoneName: settings.timezone,
        onValueChange: (_event, selectedDate) => {
          const mergedDate = mergeTimestampParts({
            datePartSource: selectedDate,
            timePartSource: editedTimestamp,
            timezone: settings.timezone,
          });

          setEditedTimestamp(mergedDate);

          DateTimePickerAndroid.open({
            value: mergedDate,
            mode: "time",
            design: "material",
            title: "Choose Time",
            is24Hour: false,
            timeZoneName: settings.timezone,
            onValueChange: (_timeEvent, selectedTime) => {
              updatePickerValue(
                mergeTimestampParts({
                  datePartSource: mergedDate,
                  timePartSource: selectedTime,
                  timezone: settings.timezone,
                })
              );
            },
          });
        },
      });
      return;
    }

    setPickerMode("datetime");
  };

  if (!entry) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-zinc-900"
      >
        <View className="flex-1 p-6 pt-12">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-2xl font-bold text-white">Edit Entry</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close"
              className="bg-zinc-800 p-2 rounded-full"
            >
              <X color="#a1a1aa" size={24} />
            </TouchableOpacity>
          </View>

          {/* Date & Time */}
          <View className="mb-6">
            <Text className="text-zinc-500 font-bold text-xs uppercase mb-2">
              Date & Time
            </Text>
            <TouchableOpacity
              onPress={openPicker}
              accessibilityRole="button"
              accessibilityLabel="Edit date and time"
              className="rounded-xl border border-zinc-700/50 bg-zinc-800 px-4 py-4"
            >
              <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Tap To Change
              </Text>
              <Text className="text-xl font-bold text-white">
                {formatDateTimeInput(editedTimestamp, settings.timezone)}
              </Text>
              <Text className="mt-2 text-sm text-zinc-500">
                Uses your app timezone: {settings.timezone}
              </Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === "ios" && pickerMode ? (
            <View className="mb-6 overflow-hidden rounded-[24px] border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900/80">
              <View className="flex-row items-center justify-between border-b border-zinc-200/70 px-4 py-3 dark:border-zinc-800">
                <Text className="text-zinc-900 dark:text-zinc-100 font-semibold">
                  Choose Date & Time
                </Text>
                <TouchableOpacity
                  onPress={() => setPickerMode(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Done with picker"
                >
                  <Text className="text-blue-400 font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                testID="entry-date-time-picker"
                value={editedTimestamp}
                mode="datetime"
                display="spinner"
                timeZoneName={settings.timezone}
                onValueChange={handleInlinePickerChange}
              />
            </View>
          ) : null}

          {/* Amount */}
          <View className="mb-6">
            <Text className="text-zinc-500 font-bold text-xs uppercase mb-2">
              Amount {unit && `(${unit})`}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
              placeholderTextColor="#52525b"
              className="bg-zinc-800 p-4 rounded-xl text-white text-lg border border-zinc-700/50"
              autoFocus
            />
          </View>

          {/* Note */}
          <View className="mb-8">
            <Text className="text-zinc-500 font-bold text-xs uppercase mb-2">
              Note (Optional)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What was this for? (Optional)"
              placeholderTextColor="#52525b"
              multiline
              numberOfLines={3}
              className="bg-zinc-800 p-4 rounded-xl text-white text-lg border border-zinc-700/50 min-h-[100px]"
              textAlignVertical="top"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isProcessing}
            className={`py-4 rounded-xl items-center ${
              isProcessing ? "bg-blue-600/50" : "bg-blue-600"
            }`}
          >
            <Text className="text-white font-bold text-lg">
              {isProcessing ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function formatDateTimeInput(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "EEE, d MMM yyyy • h:mm a");
}

function mergeTimestampParts({
  datePartSource,
  timePartSource,
  timezone,
}: {
  datePartSource: Date;
  timePartSource: Date;
  timezone: string;
}): Date {
  const datePart = formatInTimeZone(datePartSource, timezone, "yyyy-MM-dd");
  const timePart = formatInTimeZone(timePartSource, timezone, "HH:mm");
  return fromZonedTime(`${datePart}T${timePart}:00`, timezone);
}
