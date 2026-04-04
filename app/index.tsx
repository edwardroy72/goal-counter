import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Plus, Settings } from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { GoalCard } from "../components/GoalCard";
import { useGoalOrdering } from "../hooks/useGoalOrdering";
import { useGoals } from "../hooks/useGoals";
import type { Goal } from "../types/domain";

const BASE_LIST_BOTTOM_PADDING = 120;
const KEYBOARD_EXTRA_PADDING = 32;
const FOCUSED_CARD_VIEW_POSITION = 0.08;
const FOCUSED_CARD_VIEW_OFFSET = 12;
const KEYBOARD_SCROLL_DELAY_MS = Platform.OS === "ios" ? 40 : 80;
const FAB_DEFAULT_BOTTOM_OFFSET = 48;

function swapGoals(
  goals: Goal[],
  goalId: string,
  direction: "up" | "down"
): Goal[] | null {
  const currentIndex = goals.findIndex((goal) => goal.id === goalId);
  if (currentIndex === -1) {
    return null;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= goals.length) {
    return null;
  }

  const nextGoals = [...goals];
  [nextGoals[currentIndex], nextGoals[targetIndex]] = [
    nextGoals[targetIndex],
    nextGoals[currentIndex],
  ];

  return nextGoals;
}

export default function Dashboard() {
  const router = useRouter();
  const listRef = useRef<FlatList<Goal>>(null);
  const focusScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [focusedMeasurementIndex, setFocusedMeasurementIndex] = useState<
    number | null
  >(null);
  const { goals: activeGoals, isLoading } = useGoals({ status: "active" });
  const { moveGoal, isProcessing, movingGoalId, movingDirection } =
    useGoalOrdering();
  const [displayGoals, setDisplayGoals] = useState<Goal[]>(activeGoals);

  useEffect(() => {
    setDisplayGoals(activeGoals);
  }, [activeGoals]);

  useEffect(() => {
    return () => {
      if (focusScrollTimeoutRef.current) {
        clearTimeout(focusScrollTimeoutRef.current);
      }
    };
  }, []);

  const scrollMeasurementCardIntoView = useCallback((index: number) => {
    if (focusScrollTimeoutRef.current) {
      clearTimeout(focusScrollTimeoutRef.current);
    }

    focusScrollTimeoutRef.current = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: FOCUSED_CARD_VIEW_POSITION,
        viewOffset: FOCUSED_CARD_VIEW_OFFSET,
      });
    }, KEYBOARD_SCROLL_DELAY_MS);
  }, []);

  useEffect(() => {
    const handleKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);

      if (focusedMeasurementIndex !== null) {
        scrollMeasurementCardIntoView(focusedMeasurementIndex);
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
  }, [focusedMeasurementIndex, scrollMeasurementCardIntoView]);

  const handleMoveGoal = useCallback(
    (goalId: string, direction: "up" | "down") => {
      const nextGoals = swapGoals(displayGoals, goalId, direction);
      if (!nextGoals) {
        return;
      }

      setDisplayGoals(nextGoals);

      void moveGoal(displayGoals, goalId, direction).then((success) => {
        if (!success) {
          setDisplayGoals(activeGoals);
        }
      });
    },
    [activeGoals, displayGoals, moveGoal]
  );

  const handleMeasurementInputFocus = useCallback(
    (index: number) => {
      setFocusedMeasurementIndex(index);

      if (keyboardHeight > 0) {
        scrollMeasurementCardIntoView(index);
      }
    },
    [keyboardHeight, scrollMeasurementCardIntoView]
  );

  const listBottomPadding =
    keyboardHeight > 0
      ? Math.max(
          BASE_LIST_BOTTOM_PADDING,
          keyboardHeight + KEYBOARD_EXTRA_PADDING
        )
      : BASE_LIST_BOTTOM_PADDING;

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1 px-4 pt-20">
        <View className="mb-8 px-2 flex-row justify-between items-start">
          <View>
            <Text className="text-4xl font-black dark:text-white">
              Goal Tracker
            </Text>
            <Text className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              By Edward Roy
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {(displayGoals.length > 1 || isReorderMode) && (
              <TouchableOpacity
                onPress={() => setIsReorderMode((current) => !current)}
                className="px-4 py-2 rounded-full bg-zinc-200 dark:bg-zinc-800"
                accessibilityLabel={
                  isReorderMode ? "Finish reordering goals" : "Reorder goals"
                }
              >
                <Text className="font-semibold text-zinc-700 dark:text-zinc-200">
                  {isReorderMode ? "Done" : "Reorder"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              className="p-2"
              accessibilityLabel="Settings"
            >
              <Settings color="#71717a" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {isReorderMode && displayGoals.length > 1 && (
          <Text className="text-zinc-500 px-2 mb-4">
            Use move controls on each card to set your dashboard order.
          </Text>
        )}

        <Animated.FlatList
          ref={listRef}
          data={displayGoals}
          keyExtractor={(item) => item.id}
          itemLayoutAnimation={LinearTransition.duration(180)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onScrollToIndexFailed={({ averageItemLength, index }) => {
            listRef.current?.scrollToOffset({
              offset: averageItemLength * index,
              animated: true,
            });
          }}
          renderItem={({ item, index }) => (
            <GoalCard
              goal={item}
              isReorderMode={isReorderMode}
              canMoveUp={index > 0}
              canMoveDown={index < displayGoals.length - 1}
              onMeasurementInputFocus={() => handleMeasurementInputFocus(index)}
              onMoveUp={() => handleMoveGoal(item.id, "up")}
              onMoveDown={() => handleMoveGoal(item.id, "down")}
              isMovePending={isProcessing}
              movingDirection={movingGoalId === item.id ? movingDirection : null}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: listBottomPadding }}
          ListEmptyComponent={
            isLoading ? (
              <View className="mt-32 items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : (
              <View className="mt-32 items-center px-10">
                <Text className="text-zinc-500 text-center text-lg leading-6">
                  No active goals right now.{"\n"}Create a goal or unarchive one
                  from Settings.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/modal")}
                  className="mt-6 border-b-2 border-blue-500 pb-1"
                >
                  <Text className="text-blue-500 font-black text-lg">
                    Create Goal
                  </Text>
                </TouchableOpacity>
              </View>
            )
          }
        />

        <TouchableOpacity
          onPress={() => router.push("/modal")}
          activeOpacity={0.9}
          pointerEvents={keyboardHeight > 0 ? "none" : "auto"}
          className="absolute bottom-12 right-8 bg-blue-600 w-16 h-16 rounded-full items-center justify-center shadow-2xl shadow-blue-500/50"
          style={{
            bottom:
              keyboardHeight > 0
                ? keyboardHeight + 16
                : FAB_DEFAULT_BOTTOM_OFFSET,
            opacity: keyboardHeight > 0 ? 0 : 1,
          }}
        >
          <Plus color="white" size={32} strokeWidth={3} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
