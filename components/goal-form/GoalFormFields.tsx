import { useRef } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import type { GoalTargetType, ResetUnit } from "../../types/domain";
import { GoalTargetTypeSelector } from "./GoalTargetTypeSelector";

const RESET_UNIT_OPTIONS: { value: ResetUnit; label: string }[] = [
  { value: "day", label: "Day(s)" },
  { value: "week", label: "Week(s)" },
  { value: "month", label: "Month(s)" },
  { value: "none", label: "Never" },
];

interface GoalFormFieldsProps {
  title: string;
  unit: string;
  target: string;
  targetType: GoalTargetType;
  resetValue: string;
  resetUnit: ResetUnit;
  quickAdd1: string;
  quickAdd2: string;
  quickAdd3: string;
  quickAdd4: string;
  onTitleChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onTargetTypeChange: (value: GoalTargetType) => void;
  onResetValueChange: (value: string) => void;
  onResetUnitChange: (value: ResetUnit) => void;
  onQuickAdd1Change: (value: string) => void;
  onQuickAdd2Change: (value: string) => void;
  onQuickAdd3Change: (value: string) => void;
  onQuickAdd4Change: (value: string) => void;
  onInputFocus?: (anchorY: number) => void;
}

export function GoalFormFields({
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
  onTitleChange,
  onUnitChange,
  onTargetChange,
  onTargetTypeChange,
  onResetValueChange,
  onResetUnitChange,
  onQuickAdd1Change,
  onQuickAdd2Change,
  onQuickAdd3Change,
  onQuickAdd4Change,
  onInputFocus,
}: GoalFormFieldsProps) {
  const titleSectionY = useRef(0);
  const targetSectionY = useRef(0);
  const resetSectionY = useRef(0);
  const quickAddSectionY = useRef(0);

  const notifyInputFocus = (anchorY: number) => {
    onInputFocus?.(anchorY);
  };

  return (
    <>
      <View
        className="mb-6"
        onLayout={(event) => {
          titleSectionY.current = event.nativeEvent.layout.y;
        }}
      >
        <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
          Goal Name
        </Text>
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          onFocus={() => notifyInputFocus(titleSectionY.current)}
          onPressIn={() => notifyInputFocus(titleSectionY.current)}
          placeholder="e.g., Daily Water"
          placeholderTextColor="#52525b"
          className="bg-zinc-800 p-5 rounded-surface text-white text-lg border border-zinc-700/50"
        />
      </View>

      <View
        className={target.trim().length > 0 ? "mb-3" : "mb-6"}
        onLayout={(event) => {
          targetSectionY.current = event.nativeEvent.layout.y;
        }}
      >
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
              Target (optional)
            </Text>
            <TextInput
              value={target}
              onChangeText={onTargetChange}
              onFocus={() => notifyInputFocus(targetSectionY.current)}
              onPressIn={() => notifyInputFocus(targetSectionY.current)}
              keyboardType="decimal-pad"
              placeholder="e.g. 2000"
              placeholderTextColor="#52525b"
              className="bg-zinc-800 p-5 rounded-surface text-white text-lg border border-zinc-700/50"
            />
          </View>
          <View className="flex-1">
            <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
              Unit
            </Text>
            <TextInput
              value={unit}
              onChangeText={onUnitChange}
              onFocus={() => notifyInputFocus(targetSectionY.current)}
              onPressIn={() => notifyInputFocus(targetSectionY.current)}
              placeholder="e.g. mL"
              placeholderTextColor="#52525b"
              className="bg-zinc-800 p-5 rounded-surface text-white text-lg border border-zinc-700/50"
            />
          </View>
        </View>
      </View>

      {target.trim().length > 0 ? (
        <GoalTargetTypeSelector
          targetType={targetType}
          onTargetTypeChange={onTargetTypeChange}
        />
      ) : null}

      <View
        className="mb-6"
        onLayout={(event) => {
          resetSectionY.current = event.nativeEvent.layout.y;
        }}
      >
        <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
          Reset Every
        </Text>
        <View className="flex-row gap-3">
          {resetUnit !== "none" && (
            <TextInput
              value={resetValue}
              onChangeText={onResetValueChange}
              onFocus={() => notifyInputFocus(resetSectionY.current)}
              onPressIn={() => notifyInputFocus(resetSectionY.current)}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#52525b"
              className="bg-zinc-800 p-5 rounded-surface text-white text-lg border border-zinc-700/50 w-20 text-center"
            />
          )}
          <View className="flex-1 flex-row flex-wrap gap-2">
            {RESET_UNIT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => onResetUnitChange(option.value)}
                className={`flex-1 min-w-[70px] py-3 px-2 rounded-surface border ${
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

      <View
        className="mb-6"
        onLayout={(event) => {
          quickAddSectionY.current = event.nativeEvent.layout.y;
        }}
      >
        <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
          Quick Add Increments (Min 1)
        </Text>
        <View className="flex-row gap-3">
          <TextInput
            value={quickAdd1}
            onChangeText={onQuickAdd1Change}
            onFocus={() => notifyInputFocus(quickAddSectionY.current)}
            onPressIn={() => notifyInputFocus(quickAddSectionY.current)}
            keyboardType="decimal-pad"
            placeholder="100*"
            placeholderTextColor="#52525b"
            className="flex-1 bg-zinc-800 p-4 rounded-surface text-white text-lg border border-zinc-700/50 text-center"
          />
          <TextInput
            value={quickAdd2}
            onChangeText={onQuickAdd2Change}
            onFocus={() => notifyInputFocus(quickAddSectionY.current)}
            onPressIn={() => notifyInputFocus(quickAddSectionY.current)}
            keyboardType="decimal-pad"
            placeholder="+"
            placeholderTextColor="#52525b"
            className="flex-1 bg-zinc-800 p-4 rounded-surface text-white text-lg border border-zinc-700/50 text-center"
          />
          <TextInput
            value={quickAdd3}
            onChangeText={onQuickAdd3Change}
            onFocus={() => notifyInputFocus(quickAddSectionY.current)}
            onPressIn={() => notifyInputFocus(quickAddSectionY.current)}
            keyboardType="decimal-pad"
            placeholder="+"
            placeholderTextColor="#52525b"
            className="flex-1 bg-zinc-800 p-4 rounded-surface text-white text-lg border border-zinc-700/50 text-center"
          />
          <TextInput
            value={quickAdd4}
            onChangeText={onQuickAdd4Change}
            onFocus={() => notifyInputFocus(quickAddSectionY.current)}
            onPressIn={() => notifyInputFocus(quickAddSectionY.current)}
            keyboardType="decimal-pad"
            placeholder="+"
            placeholderTextColor="#52525b"
            className="flex-1 bg-zinc-800 p-4 rounded-surface text-white text-lg border border-zinc-700/50 text-center"
          />
        </View>
        <Text className="text-zinc-600 text-xs mt-2 ml-1">
          Choose up to 4 to add entries on the go.
        </Text>
      </View>
    </>
  );
}
