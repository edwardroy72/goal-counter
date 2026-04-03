import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import SettingsScreen from "../../app/settings";
import { useSettings } from "../../contexts/SettingsContext";
import { useGoalLifecycle } from "../../hooks/useGoalLifecycle";
import { useGoals } from "../../hooks/useGoals";
import { createMockGoal } from "../factories/goal.factory";

const mockBack = jest.fn();
const mockDeleteGoal = jest.fn();
const mockUnarchiveGoal = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock("../../contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("../../hooks/useGoalLifecycle", () => ({
  useGoalLifecycle: jest.fn(),
}));

jest.mock("../../hooks/useGoals", () => ({
  useGoals: jest.fn(),
}));

jest.mock("../../utils/timezone-options", () => ({
  getTimezoneOptions: jest.fn(() => [
    {
      value: "Australia/Sydney",
      label: "Sydney",
      offsetMinutes: 600,
      searchText: "sydney australia/sydney",
    },
  ]),
  buildTimezoneOption: jest.fn(() => null),
  findTimezoneOption: jest.fn(() => null),
  formatGmtOffset: jest.fn((offsetMinutes: number) => `GMT+${offsetMinutes / 60}`),
}));

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useSettings as jest.Mock).mockReturnValue({
      settings: { timezone: "Australia/Sydney" },
      updateSetting: jest.fn(),
    });

    (useGoals as jest.Mock).mockReturnValue({
      goals: [
        createMockGoal({
          id: "archived-goal-1",
          title: "Archived Water",
          status: "archived",
          unit: "mL",
          target: 3000,
        }),
      ],
      isLoading: false,
    });

    (useGoalLifecycle as jest.Mock).mockReturnValue({
      unarchiveGoal: mockUnarchiveGoal,
      deleteGoal: mockDeleteGoal,
      isProcessing: false,
      activeAction: null,
    });
  });

  it("confirms and permanently deletes an archived goal", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockDeleteGoal.mockResolvedValue(true);

    const { getByText } = render(<SettingsScreen />);

    fireEvent.press(getByText("Delete"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Delete Archived Goal?",
      "This permanently removes the goal and all of its history.",
      expect.any(Array)
    );

    const actionButtons = alertSpy.mock.calls[0]?.[2] as
      | { text?: string; onPress?: () => void }[]
      | undefined;
    const deleteButton = actionButtons?.find((button) => button.text === "Delete");

    await act(async () => {
      deleteButton?.onPress?.();
    });

    await waitFor(() => {
      expect(mockDeleteGoal).toHaveBeenCalledWith("archived-goal-1");
    });
  });

  it("shows an error if permanent delete fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockDeleteGoal.mockResolvedValue(false);

    const { getByText } = render(<SettingsScreen />);

    fireEvent.press(getByText("Delete"));

    const actionButtons = alertSpy.mock.calls[0]?.[2] as
      | { text?: string; onPress?: () => void }[]
      | undefined;
    const deleteButton = actionButtons?.find((button) => button.text === "Delete");

    await act(async () => {
      deleteButton?.onPress?.();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenLastCalledWith(
        "Error",
        "Failed to permanently delete goal."
      );
    });
  });
});
