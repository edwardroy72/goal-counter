import { Text, TouchableOpacity, View } from "react-native";
import type { GoalTargetType } from "../../types/domain";

const TARGET_TYPE_OPTIONS: { value: GoalTargetType; label: string }[] = [
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];

interface GoalTargetTypeSelectorProps {
  targetType: GoalTargetType;
  onTargetTypeChange: (value: GoalTargetType) => void;
}

export function GoalTargetTypeSelector({
  targetType,
  onTargetTypeChange,
}: GoalTargetTypeSelectorProps) {
  return (
    <View className="mb-6">
      <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
        Target Type
      </Text>
      <View className="flex-row gap-3">
        {TARGET_TYPE_OPTIONS.map((option) => {
          const isSelected = option.value === targetType;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onTargetTypeChange(option.value)}
              className={`flex-1 rounded-surface border px-4 py-4 ${
                isSelected
                  ? "bg-blue-600 border-blue-500"
                  : "bg-zinc-800 border-zinc-700/50"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  isSelected ? "text-white" : "text-zinc-400"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text className="text-zinc-600 text-xs mt-2 ml-1">
        E.g. Min 3000mL of Water vs Max 2500 Calories
      </Text>
    </View>
  );
}
