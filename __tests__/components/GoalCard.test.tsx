import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { GoalCard } from "../../components/GoalCard";
import { useGoalLatestEntry } from "../../hooks/useGoalLatestEntry";
import { useGoalTotal } from "../../hooks/useGoalTotal";
import type { Goal } from "../../types/domain";

const mockPush = jest.fn();
const mockAddEntry = jest.fn();
const mockUndoEntry = jest.fn();
const mockShowToast = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("../../contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: { timezone: "UTC" },
    updateSetting: jest.fn(),
  }),
}));

jest.mock("../../hooks/useGoalActions", () => ({
  useGoalActions: () => ({
    addEntry: mockAddEntry,
    undoEntry: mockUndoEntry,
    undoLastEntry: jest.fn(),
  }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: mockShowToast,
    hideToast: jest.fn(),
  }),
}));

jest.mock("../../hooks/useGoalTotal", () => ({
  useGoalTotal: jest.fn(),
}));

jest.mock("../../hooks/useGoalLatestEntry", () => ({
  useGoalLatestEntry: jest.fn(),
}));

jest.mock("../../utils/timezone-utils", () => ({
  calculatePeriodEndInTimezone: jest.fn(
    (
      _createdAt: Date,
      _resetValue: number,
      resetUnit: Goal["resetUnit"]
    ) => (resetUnit === "none" ? null : new Date("2025-01-16T00:00:00Z"))
  ),
  getCountdownTextWithTimezone: jest.fn((nextReset: Date | null) =>
    nextReset ? "10h left" : ""
  ),
}));

const createMockGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "goal-1",
  title: "Test Goal",
  type: "counter",
  unit: "km",
  target: 100,
  targetType: "min",
  resetValue: 1,
  resetUnit: "day",
  quickAdd1: 5,
  quickAdd2: 10,
  quickAdd3: null,
  quickAdd4: null,
  sortOrder: 0,
  status: "active",
  createdAt: new Date("2025-01-01T00:00:00Z"),
  ...overrides,
});

describe("GoalCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGoalTotal as jest.Mock).mockReturnValue(0);
    (useGoalLatestEntry as jest.Mock).mockReturnValue({
      latestEntry: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockAddEntry.mockResolvedValue("entry-1");
  });

  it("renders a counter goal with countdown, target, and quick adds", () => {
    (useGoalTotal as jest.Mock).mockReturnValue(25);

    const view = render(<GoalCard goal={createMockGoal({ title: "Daily Running" })} />);

    expect(view.getByText("Daily Running")).toBeTruthy();
    expect(view.getByText("25 km")).toBeTruthy();
    expect(view.getByText("(Min 100 km)")).toBeTruthy();
    expect(view.getByText("75")).toBeTruthy();
    expect(view.getByText("10h left")).toBeTruthy();
    expect(view.getByText("+5")).toBeTruthy();
    expect(view.getByText("+10")).toBeTruthy();
  });

  it("logs a quick add for counter goals and shows undo toast", async () => {
    const view = render(<GoalCard goal={createMockGoal()} />);

    fireEvent.press(view.getByText("+5"));

    await waitFor(() => {
      expect(mockAddEntry).toHaveBeenCalledWith("goal-1", 5);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Added +5 km to Test Goal",
        onUndo: expect.any(Function),
      })
    );
  });

  it("renders a measurement goal with latest value and quick log input", () => {
    (useGoalLatestEntry as jest.Mock).mockReturnValue({
      latestEntry: {
        id: "entry-1",
        goalId: "goal-1",
        amount: 72.5,
        note: null,
        timestamp: new Date("2025-01-15T08:30:00Z"),
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const view = render(
      <GoalCard
        goal={createMockGoal({
          type: "measurement",
          title: "Body Weight",
          unit: "kg",
          target: 70,
          resetValue: 0,
          resetUnit: "none",
        })}
      />
    );

    expect(view.getByText("Latest")).toBeTruthy();
    expect(view.getByText("72.5 kg")).toBeTruthy();
    expect(view.getByText("2.5 kg")).toBeTruthy();
    expect(view.getByText("To Target")).toBeTruthy();
    expect(view.getByText("Quick Log")).toBeTruthy();
    expect(view.getByDisplayValue("")).toBeTruthy();
    expect(view.queryByText("10h left")).toBeNull();
  });

  it("logs a measurement directly from the card", async () => {
    const goal = createMockGoal({
      type: "measurement",
      title: "Body Weight",
      unit: "kg",
      target: 70,
      resetValue: 0,
      resetUnit: "none",
    });
    const view = render(<GoalCard goal={goal} />);

    fireEvent.changeText(view.getByPlaceholderText("kg"), "71.3");
    fireEvent.press(view.getByLabelText("Log measurement for Body Weight"));

    await waitFor(() => {
      expect(mockAddEntry).toHaveBeenCalledWith("goal-1", 71.3);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Logged 71.3 kg for Body Weight",
      })
    );
  });

  it("logs a measurement from the keyboard submit action on the card", async () => {
    const goal = createMockGoal({
      type: "measurement",
      title: "Body Weight",
      unit: "kg",
      target: 70,
      resetValue: 0,
      resetUnit: "none",
    });
    const view = render(<GoalCard goal={goal} />);

    fireEvent.changeText(view.getByPlaceholderText("kg"), "70.9");
    fireEvent(view.getByPlaceholderText("kg"), "submitEditing", {
      nativeEvent: { text: "70.9" },
    });

    await waitFor(() => {
      expect(mockAddEntry).toHaveBeenCalledWith("goal-1", 70.9);
    });
  });

  it("notifies the parent when the measurement input receives focus", () => {
    const onMeasurementInputFocus = jest.fn();
    const goal = createMockGoal({
      type: "measurement",
      title: "Body Weight",
      unit: "kg",
      target: 70,
      resetValue: 0,
      resetUnit: "none",
    });
    const view = render(
      <GoalCard
        goal={goal}
        onMeasurementInputFocus={onMeasurementInputFocus}
      />
    );

    fireEvent(view.getByPlaceholderText("kg"), "focus");

    expect(onMeasurementInputFocus).toHaveBeenCalledTimes(1);
  });

  it("notifies the parent when the measurement input is pressed again", () => {
    const onMeasurementInputFocus = jest.fn();
    const goal = createMockGoal({
      type: "measurement",
      title: "Body Weight",
      unit: "kg",
      target: 70,
      resetValue: 0,
      resetUnit: "none",
    });
    const view = render(
      <GoalCard
        goal={goal}
        onMeasurementInputFocus={onMeasurementInputFocus}
      />
    );

    fireEvent(view.getByPlaceholderText("kg"), "pressIn");

    expect(onMeasurementInputFocus).toHaveBeenCalledTimes(1);
  });

  it("shows move controls instead of quick actions in reorder mode", () => {
    const onMoveUp = jest.fn();
    const onMoveDown = jest.fn();
    const view = render(
      <GoalCard
        goal={createMockGoal({ title: "Water" })}
        isReorderMode
        canMoveUp={false}
        canMoveDown
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    );

    expect(view.queryByText("+5")).toBeNull();
    expect(view.getByText("Move Up")).toBeTruthy();
    expect(view.getByText("Move Down")).toBeTruthy();

    fireEvent.press(view.getByLabelText("Move Water down"));

    expect(onMoveDown).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to the detail view when the card is pressed", () => {
    const view = render(<GoalCard goal={createMockGoal()} />);

    fireEvent.press(view.getByText("Test Goal"));

    expect(mockPush).toHaveBeenCalledWith("/goal/goal-1");
  });
});
