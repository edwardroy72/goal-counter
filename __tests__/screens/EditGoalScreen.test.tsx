import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import EditGoalScreen from "../../app/goal/edit/[id]";
import { useGoalById } from "../../hooks/useGoalById";
import { useGoalLifecycle } from "../../hooks/useGoalLifecycle";
import { createMockGoal } from "../factories/goal.factory";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockDuplicateGoal = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "goal-1" }),
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
  }),
}));

jest.mock("../../components/goal-form", () => ({
  GoalFormFields: () => null,
}));

jest.mock("../../hooks/useGoalById", () => ({
  useGoalById: jest.fn(),
}));

jest.mock("../../hooks/useGoalLifecycle", () => ({
  useGoalLifecycle: jest.fn(),
}));

jest.mock("../../db/client", () => ({
  db: {
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

jest.mock("../../db/query-cache", () => ({
  queryCache: {
    invalidate: jest.fn(),
  },
}));

describe("EditGoalScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useGoalById as jest.Mock).mockReturnValue({
      goal: createMockGoal({ id: "goal-1", title: "Daily Water" }),
      isLoading: false,
      error: null,
    });

    (useGoalLifecycle as jest.Mock).mockReturnValue({
      archiveGoal: jest.fn(),
      unarchiveGoal: jest.fn(),
      deleteGoal: jest.fn(),
      duplicateGoal: mockDuplicateGoal,
      isProcessing: false,
      activeAction: null,
      error: null,
      clearError: jest.fn(),
    });
  });

  it("duplicates the goal and routes to the new detail screen", async () => {
    mockDuplicateGoal.mockResolvedValue("goal-copy-1");

    const { getByText } = render(<EditGoalScreen />);

    fireEvent.press(getByText("Duplicate Goal"));

    await waitFor(() => {
      expect(mockDuplicateGoal).toHaveBeenCalledWith("goal-1");
    });

    expect(mockReplace).toHaveBeenCalledWith("/goal/goal-copy-1");
  });

  it("shows an alert if duplication fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockDuplicateGoal.mockResolvedValue(null);

    const { getByText } = render(<EditGoalScreen />);

    fireEvent.press(getByText("Duplicate Goal"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error", "Failed to duplicate goal.");
    });
  });
});
