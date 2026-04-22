/**
 * ManualAddModal Component
 *
 * Two-step modal for manual entry:
 * 1. Amount input with numeric keypad
 * 2. Note input with text keyboard
 */

import { Check, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
import { useGoalActions } from "../../hooks/useGoalActions";
import type { Goal } from "../../types/domain";

type Step = "amount" | "note";

interface ManualAddModalProps {
  visible: boolean;
  goal: Goal;
  onClose: () => void;
}

export function ManualAddModal({
  visible,
  goal,
  onClose,
}: ManualAddModalProps) {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const amountInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);

  const { addEntry } = useGoalActions();

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setStep("amount");
      setAmount("");
      setNote("");
      // Auto-focus amount input
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  // Auto-focus note input when moving to step 2
  useEffect(() => {
    if (step === "note") {
      setTimeout(() => {
        noteInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const handleContinue = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive number.");
      return;
    }
    setStep("note");
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive number.");
      setStep("amount");
      return;
    }

    try {
      setIsSaving(true);
      await addEntry(goal.id, parsedAmount, note.trim() || null);
      onClose();
    } catch (err) {
      console.error("[ManualAddModal] Failed to save:", err);
      Alert.alert("Error", "Failed to save entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (step === "note") {
      setStep("amount");
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-app-dark-base"
      >
        <View className="flex-1 p-6 pt-12">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-8">
            <TouchableOpacity
              onPress={handleBack}
              accessibilityLabel={step === "note" ? "Go back" : "Close"}
              className="bg-zinc-800 p-2 rounded-surface"
            >
              <X color="#a1a1aa" size={24} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white">
              {step === "amount" ? "Enter Amount" : "Add Note"}
            </Text>
            <View className="w-10" />
          </View>

          {/* Step indicator */}
          <View className="flex-row justify-center gap-2 mb-8">
            <View
              className={`w-2 h-2 rounded-full ${
                step === "amount" ? "bg-blue-500" : "bg-zinc-600"
              }`}
            />
            <View
              className={`w-2 h-2 rounded-full ${
                step === "note" ? "bg-blue-500" : "bg-zinc-600"
              }`}
            />
          </View>

          {step === "amount" ? (
            <>
              {/* Amount Input */}
              <View className="flex-1 justify-center">
                <Text className="text-zinc-500 text-center text-sm mb-4">
                  How much did you log?
                </Text>
                <View className="flex-row items-center justify-center">
                  <TextInput
                    ref={amountInputRef}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#52525b"
                    className="text-white text-6xl font-bold text-center min-w-[150px]"
                    style={{ fontSize: 64 }}
                  />
                  {goal.unit && (
                    <Text className="text-zinc-400 text-2xl ml-2">
                      {goal.unit}
                    </Text>
                  )}
                </View>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleContinue}
                className="bg-blue-600 py-4 rounded-surface items-center flex-row justify-center"
              >
                <Text className="text-white font-bold text-lg">Continue</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Note Input */}
              <View className="flex-1">
                <Text className="text-zinc-500 text-center text-sm mb-4">
                  Add a note (optional)
                </Text>
                <View className="bg-zinc-800 rounded-surface p-4 mb-4">
                  <Text className="text-zinc-400 text-sm mb-2">
                    Amount: {amount} {goal.unit || ""}
                  </Text>
                </View>
                <TextInput
                  ref={noteInputRef}
                  value={note}
                  onChangeText={setNote}
                  placeholder="What was this for? (Optional)"
                  placeholderTextColor="#52525b"
                  multiline
                  numberOfLines={4}
                  className="bg-zinc-800 p-4 rounded-surface text-white text-lg border border-zinc-700/50 min-h-[120px]"
                  textAlignVertical="top"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className={`py-4 rounded-surface items-center flex-row justify-center ${
                  isSaving ? "bg-green-600/50" : "bg-green-600"
                }`}
              >
                <Check color="white" size={20} strokeWidth={3} />
                <Text className="text-white font-bold text-lg ml-2">
                  {isSaving ? "Saving..." : "Done"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
