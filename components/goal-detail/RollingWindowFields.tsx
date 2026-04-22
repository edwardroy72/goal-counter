import { Text, TextInput, View } from "react-native";
import type { ResetUnit } from "../../types/domain";
import { ROLLING_UNIT_LABELS } from "../../utils/goal-config";

interface RollingWindowFieldsProps {
  available: boolean;
  resetUnit: ResetUnit;
  value: string;
  error: string | null;
  onChangeValue: (value: string) => void;
}

export function RollingWindowFields({
  available,
  resetUnit,
  value,
  error,
  onChangeValue,
}: RollingWindowFieldsProps) {
  const unitLabel =
    resetUnit !== "none" ? ROLLING_UNIT_LABELS[resetUnit] : "Period(s)";

  return (
    <View className="mb-6">
      <Text className="text-zinc-500 font-bold text-xs uppercase mb-2 ml-1">
        Rolling Surplus Window (optional)
      </Text>

      {available ? (
        <>
          <View className="flex-row gap-3 items-center">
            <TextInput
              value={value}
              onChangeText={onChangeValue}
              keyboardType="number-pad"
              placeholder="e.g. 7"
              placeholderTextColor="#52525b"
              accessibilityLabel="Rolling surplus window length"
              className="bg-zinc-800 p-5 rounded-surface text-white text-lg border border-zinc-700/50 w-28 text-center"
            />
            <View className="flex-1 bg-zinc-800 py-5 px-4 rounded-surface border border-zinc-700/50">
              <Text className="text-zinc-300 text-base font-medium text-center">
                {unitLabel}
              </Text>
            </View>
          </View>

          <Text
            className={`text-xs mt-2 ml-1 ${
              error ? "text-red-400" : "text-zinc-600"
            }`}
          >
            {error || "Must be a whole multiple of your reset interval."}
          </Text>
        </>
      ) : (
        <Text className="text-zinc-600 text-xs mt-2 ml-1">
          Add a target and choose a reset interval to enable rolling surplus
          tracking.
        </Text>
      )}
    </View>
  );
}
