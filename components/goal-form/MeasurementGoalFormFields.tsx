import { useRef } from "react";
import { Text, TextInput, View } from "react-native";
import type { GoalTargetType } from "../../types/domain";
import { GoalTargetTypeSelector } from "./GoalTargetTypeSelector";

interface MeasurementGoalFormFieldsProps {
  title: string;
  unit: string;
  target: string;
  targetType: GoalTargetType;
  startingMeasurement?: string;
  onTitleChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onTargetTypeChange: (value: GoalTargetType) => void;
  onStartingMeasurementChange?: (value: string) => void;
  onInputFocus?: (anchorY: number) => void;
}

export function MeasurementGoalFormFields({
  title,
  unit,
  target,
  targetType,
  startingMeasurement,
  onTitleChange,
  onUnitChange,
  onTargetChange,
  onTargetTypeChange,
  onStartingMeasurementChange,
  onInputFocus,
}: MeasurementGoalFormFieldsProps) {
  const titleSectionY = useRef(0);
  const targetSectionY = useRef(0);
  const startingMeasurementSectionY = useRef(0);

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
          placeholder="e.g., Body Weight"
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
              placeholder="e.g. 70"
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
              placeholder="e.g. kg"
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

      {typeof startingMeasurement === "string" &&
      onStartingMeasurementChange ? (
        <View
          className="mb-6"
          onLayout={(event) => {
            startingMeasurementSectionY.current = event.nativeEvent.layout.y;
          }}
        >
          <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
            Starting Measurement (optional)
          </Text>
          <TextInput
            value={startingMeasurement}
            onChangeText={onStartingMeasurementChange}
            onFocus={() => notifyInputFocus(startingMeasurementSectionY.current)}
            onPressIn={() => notifyInputFocus(startingMeasurementSectionY.current)}
            keyboardType="decimal-pad"
            placeholder={unit.trim() ? `e.g. current ${unit.trim()}` : "Enter current value"}
            placeholderTextColor="#52525b"
            className="bg-zinc-800 p-5 rounded-surface text-white text-lg border border-zinc-700/50"
          />
        </View>
      ) : null}

      <View className="bg-zinc-800/70 border border-zinc-700/50 rounded-surface p-5">
        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">
          Measurement Goals
        </Text>
        <Text className="text-zinc-500 text-sm leading-6">
          Measurements do not reset. You can add entries directly from the goal card and detail screen.
        </Text>
      </View>
    </>
  );
}
