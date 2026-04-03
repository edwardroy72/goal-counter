import { act, fireEvent, render } from "@testing-library/react-native";
import Dashboard from "../../app/index";
import { useGoalOrdering } from "../../hooks/useGoalOrdering";
import { useGoals } from "../../hooks/useGoals";
import { createMockGoal } from "../factories/goal.factory";

const mockPush = jest.fn();
const mockMoveGoal = jest.fn();
const mockGoalCard = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("../../hooks/useGoals", () => ({
  useGoals: jest.fn(),
}));

jest.mock("../../hooks/useGoalOrdering", () => ({
  useGoalOrdering: jest.fn(),
}));

jest.mock("../../components/GoalCard", () => ({
  GoalCard: (props: {
    goal: { id: string; title: string };
    isReorderMode?: boolean;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
  }) => {
    mockGoalCard(props);
    return null;
  },
}));

describe("DashboardScreen", () => {
  const activeGoals = [
    createMockGoal({ id: "goal-1", title: "Water", sortOrder: 10 }),
    createMockGoal({ id: "goal-2", title: "Sleep", sortOrder: 20 }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMoveGoal.mockResolvedValue(true);

    (useGoals as jest.Mock).mockReturnValue({
      goals: activeGoals,
      isLoading: false,
    });

    (useGoalOrdering as jest.Mock).mockReturnValue({
      moveGoal: mockMoveGoal,
      isProcessing: false,
      movingGoalId: null,
      movingDirection: null,
    });
  });

  it("toggles reorder mode and passes reorder props to cards", async () => {
    const { getByText } = render(<Dashboard />);

    expect(getByText("Reorder")).toBeTruthy();
    expect(mockGoalCard.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        goal: activeGoals[0],
        isReorderMode: false,
      })
    );

    fireEvent.press(getByText("Reorder"));

    expect(getByText("Done")).toBeTruthy();
    const reorderedCalls = mockGoalCard.mock.calls.slice(-2);
    expect(reorderedCalls[0]?.[0]).toEqual(
      expect.objectContaining({
        goal: activeGoals[0],
        isReorderMode: true,
        canMoveUp: false,
        canMoveDown: true,
        onMeasurementInputFocus: expect.any(Function),
      })
    );

    await act(async () => {
      await reorderedCalls[0]?.[0].onMoveDown?.();
    });

    expect(mockMoveGoal).toHaveBeenCalledWith(activeGoals, "goal-1", "down");
  });
});
