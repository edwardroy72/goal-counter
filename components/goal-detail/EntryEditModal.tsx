/**
 * EntryEditModal Component
 *
 * Modal for editing an entry's amount and note.
 * Timestamp remains immutable per design spec.
 */

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
import { useEntryActions } from "../../hooks/useEntryActions";
import type { NormalizedEntry } from "../../hooks/useGoalEntries";

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
  const [note, setNote] = useState("");
  const { updateEntry, isProcessing, error, clearError } = useEntryActions();

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setAmount(entry.amount.toString());
      setNote(entry.note || "");
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

    const success = await updateEntry(entry.id, {
      amount: parsedAmount,
      note: note.trim() || null,
    });

    if (success) {
      onClose();
    }
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

          {/* Timestamp (read-only) */}
          <View className="mb-6">
            <Text className="text-zinc-500 font-bold text-xs uppercase mb-2">
              Timestamp (Read-only)
            </Text>
            <View className="bg-zinc-800/50 p-4 rounded-xl">
              <Text className="text-zinc-400 text-lg">
                {entry.timestamp.toLocaleString()}
              </Text>
            </View>
          </View>

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
              placeholder="Add a note..."
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
