import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  GoalFormFields,
  MeasurementGoalFormFields,
} from "../components/goal-form";
import { db } from "../db/client";
import { queryCache } from "../db/query-cache";
import { entries, goals } from "../db/schema";
import type { GoalType, ResetUnit } from "../types/domain";
import { buildGoalMutationValues } from "../utils/goal-config";
import { buildMeasurementGoalMutationValues } from "../utils/measurement-goal-config";

type ResetUnitType = ResetUnit;

const GOAL_TYPE_PAGES: GoalType[] = ["counter", "measurement"];
const BASE_FORM_BOTTOM_PADDING = 100;
const KEYBOARD_EXTRA_PADDING = 32;
const FOCUSED_FIELD_TOP_OFFSET = 120;
const KEYBOARD_SCROLL_DELAY_MS = Platform.OS === "ios" ? 40 : 80;

export default function CreateGoal() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const pageListRef = useRef<FlatList<GoalType>>(null);
  const counterScrollRef = useRef<ScrollView>(null);
  const measurementScrollRef = useRef<ScrollView>(null);
  const focusScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const focusedAnchorByTypeRef = useRef<Record<GoalType, number | null>>({
    counter: null,
    measurement: null,
  });
  const [selectedType, setSelectedType] = useState<GoalType>("counter");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Counter form state
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [resetValue, setResetValue] = useState("1");
  const [resetUnit, setResetUnit] = useState<ResetUnitType>("day");
  const [quickAdd1, setQuickAdd1] = useState("100");
  const [quickAdd2, setQuickAdd2] = useState("");
  const [quickAdd3, setQuickAdd3] = useState("");
  const [quickAdd4, setQuickAdd4] = useState("");

  // Measurement form state
  const [measurementTitle, setMeasurementTitle] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("");
  const [measurementTarget, setMeasurementTarget] = useState("");
  const [startingMeasurement, setStartingMeasurement] = useState("");

  useEffect(() => {
    return () => {
      if (focusScrollTimeoutRef.current) {
        clearTimeout(focusScrollTimeoutRef.current);
      }
    };
  }, []);

  const scrollFormIntoView = useCallback((goalType: GoalType, anchorY: number) => {
    if (focusScrollTimeoutRef.current) {
      clearTimeout(focusScrollTimeoutRef.current);
    }

    focusScrollTimeoutRef.current = setTimeout(() => {
      const scrollRef =
        goalType === "counter"
          ? counterScrollRef.current
          : measurementScrollRef.current;

      scrollRef?.scrollTo({
        y: Math.max(0, anchorY - FOCUSED_FIELD_TOP_OFFSET),
        animated: true,
      });
    }, KEYBOARD_SCROLL_DELAY_MS);
  }, []);

  useEffect(() => {
    const handleKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);

      const focusedAnchor = focusedAnchorByTypeRef.current[selectedType];
      if (focusedAnchor !== null) {
        scrollFormIntoView(selectedType, focusedAnchor);
      }
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollFormIntoView, selectedType]);

  const handleFormInputFocus = useCallback(
    (goalType: GoalType, anchorY: number) => {
      focusedAnchorByTypeRef.current[goalType] = anchorY;

      if (keyboardHeight > 0) {
        scrollFormIntoView(goalType, anchorY);
      }
    },
    [keyboardHeight, scrollFormIntoView]
  );

  const handleTypePress = (goalType: GoalType) => {
    Keyboard.dismiss();
    setSelectedType(goalType);
    pageListRef.current?.scrollToIndex({
      index: GOAL_TYPE_PAGES.indexOf(goalType),
      animated: true,
    });
  };

  const handlePagerMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    const nextType = GOAL_TYPE_PAGES[nextIndex] ?? "counter";
    setSelectedType(nextType);
  };

  const listBottomPadding =
    keyboardHeight > 0
      ? Math.max(
          BASE_FORM_BOTTOM_PADDING,
          keyboardHeight + KEYBOARD_EXTRA_PADDING
        )
      : BASE_FORM_BOTTOM_PADDING;

  const handleCounterSave = async () => {
    const result = buildGoalMutationValues({
      title,
      unit,
      target,
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

    try {
      await db.insert(goals).values({
        ...result.values,
        type: "counter",
        sortOrder: Date.now(),
        status: "active",
      });

      queryCache.invalidate();
      router.back();
    } catch (err) {
      console.error("Save failed:", err);
      Alert.alert("Error", "Failed to create goal. Please try again.");
    }
  };

  const handleMeasurementSave = async () => {
    const result = buildMeasurementGoalMutationValues({
      title: measurementTitle,
      unit: measurementUnit,
      target: measurementTarget,
      startingMeasurement,
    });

    if (!result.ok) {
      Alert.alert(result.error.title, result.error.message);
      return;
    }

    try {
      db.transaction((tx) => {
        const createdGoal = tx
          .insert(goals)
          .values({
            ...result.values,
            sortOrder: Date.now(),
            status: "active",
          })
          .returning()
          .get();

        if (!createdGoal) {
          throw new Error("Failed to create measurement goal.");
        }

        if (result.startingMeasurement !== null) {
          tx
            .insert(entries)
            .values({
              goalId: createdGoal.id,
              amount: result.startingMeasurement,
              note: null,
              timestamp: new Date(),
            })
            .run();
        }
      });

      queryCache.invalidate();
      router.back();
    } catch (err) {
      console.error("Save failed:", err);
      Alert.alert("Error", "Failed to create goal. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-zinc-900 pt-20">
      <View className="px-6">
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-3xl font-bold text-white">New Goal</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-zinc-800 p-2 rounded-full"
          >
            <X color="#a1a1aa" size={24} />
          </TouchableOpacity>
        </View>

        <View className="bg-zinc-800 p-1 rounded-2xl flex-row mb-6">
          {GOAL_TYPE_PAGES.map((goalType) => {
            const isActive = goalType === selectedType;

            return (
              <TouchableOpacity
                key={goalType}
                onPress={() => handleTypePress(goalType)}
                className={`flex-1 py-3 rounded-xl ${
                  isActive ? "bg-blue-600" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    isActive ? "text-white" : "text-zinc-400"
                  }`}
                >
                  {goalType === "counter" ? "Counter" : "Measurement"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        ref={pageListRef}
        data={GOAL_TYPE_PAGES}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePagerMomentumEnd}
        getItemLayout={(_, index) => ({
          index,
          length: width,
          offset: width * index,
        })}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1">
            <ScrollView
              ref={item === "counter" ? counterScrollRef : measurementScrollRef}
              className="flex-1"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom: listBottomPadding,
              }}
            >
              {item === "counter" ? (
                <>
                  <GoalFormFields
                    title={title}
                    unit={unit}
                    target={target}
                    resetValue={resetValue}
                    resetUnit={resetUnit}
                    quickAdd1={quickAdd1}
                    quickAdd2={quickAdd2}
                    quickAdd3={quickAdd3}
                    quickAdd4={quickAdd4}
                    onTitleChange={setTitle}
                    onUnitChange={setUnit}
                    onTargetChange={setTarget}
                    onResetValueChange={setResetValue}
                    onResetUnitChange={setResetUnit}
                    onQuickAdd1Change={setQuickAdd1}
                    onQuickAdd2Change={setQuickAdd2}
                    onQuickAdd3Change={setQuickAdd3}
                    onQuickAdd4Change={setQuickAdd4}
                    onInputFocus={(anchorY) =>
                      handleFormInputFocus("counter", anchorY)
                    }
                  />

                  <TouchableOpacity
                    onPress={handleCounterSave}
                    activeOpacity={0.8}
                    className="bg-blue-600 p-5 rounded-3xl mt-6 shadow-lg shadow-blue-900/20"
                  >
                    <Text className="text-white text-center font-bold text-lg">
                      Create Counter Goal
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <MeasurementGoalFormFields
                    title={measurementTitle}
                    unit={measurementUnit}
                    target={measurementTarget}
                    startingMeasurement={startingMeasurement}
                    onTitleChange={setMeasurementTitle}
                    onUnitChange={setMeasurementUnit}
                    onTargetChange={setMeasurementTarget}
                    onStartingMeasurementChange={setStartingMeasurement}
                    onInputFocus={(anchorY) =>
                      handleFormInputFocus("measurement", anchorY)
                    }
                  />

                  <TouchableOpacity
                    onPress={handleMeasurementSave}
                    activeOpacity={0.8}
                    className="bg-blue-600 p-5 rounded-3xl mt-6 shadow-lg shadow-blue-900/20"
                  >
                    <Text className="text-white text-center font-bold text-lg">
                      Create Measurement Goal
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        )}
      />
    </View>
  );
}
