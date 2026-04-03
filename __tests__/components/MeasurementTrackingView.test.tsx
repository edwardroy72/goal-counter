import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { MeasurementTrackingView } from "../../components/goal-detail/MeasurementTrackingView";
import type { GoalGraphData } from "../../services/goal-analytics";
import type { Goal } from "../../types/domain";

const mockAddEntry = jest.fn();
const mockUndoEntry = jest.fn();
const mockShowToast = jest.fn();

jest.mock("../../hooks/useGoalActions", () => ({
  useGoalActions: () => ({
    addEntry: mockAddEntry,
    undoEntry: mockUndoEntry,
  }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

const createGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "goal-1",
  title: "Body Weight",
  type: "measurement",
  unit: "kg",
  target: 70,
  resetValue: 0,
  resetUnit: "none",
  quickAdd1: 1,
  quickAdd2: null,
  quickAdd3: null,
  quickAdd4: null,
  sortOrder: 0,
  status: "active",
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  ...overrides,
});

const baseGraph: GoalGraphData = {
  range: "30d",
  target: 70,
  goalType: "measurement",
  hasData: true,
  xDomainStart: new Date("2026-03-01T00:00:00.000Z"),
  xDomainEnd: new Date("2026-04-01T00:00:00.000Z"),
  points: [
    { bucketStart: new Date("2026-03-20T08:00:00.000Z"), value: 72.5 },
    { bucketStart: new Date("2026-03-28T08:00:00.000Z"), value: 71.8 },
  ],
};

describe("MeasurementTrackingView", () => {
  const onGraphRangeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddEntry.mockResolvedValue("entry-1");
  });

  it("renders quick log and the graph together", () => {
    const view = render(
      <MeasurementTrackingView
        goal={createGoal()}
        graph={baseGraph}
        graphRange="30d"
        isGraphLoading={false}
        timezone="UTC"
        onGraphRangeChange={onGraphRangeChange}
      />
    );

    expect(view.getByText("Quick Log")).toBeTruthy();
    expect(view.getByText("Record a new measurement")).toBeTruthy();
    expect(view.getByText("Measurement Graph")).toBeTruthy();
  });

  it("logs a measurement when the keyboard submit action is used", async () => {
    const view = render(
      <MeasurementTrackingView
        goal={createGoal()}
        graph={baseGraph}
        graphRange="30d"
        isGraphLoading={false}
        timezone="UTC"
        onGraphRangeChange={onGraphRangeChange}
      />
    );

    fireEvent.changeText(view.getByPlaceholderText("kg"), "71.2");
    fireEvent(view.getByPlaceholderText("kg"), "submitEditing", {
      nativeEvent: { text: "71.2" },
    });

    await waitFor(() => {
      expect(mockAddEntry).toHaveBeenCalledWith("goal-1", 71.2);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Logged 71.2 kg for Body Weight",
      })
    );
  });
});
