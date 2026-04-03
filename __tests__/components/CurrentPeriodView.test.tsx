import { fireEvent, render } from "@testing-library/react-native";
import { CurrentPeriodView } from "../../components/goal-detail/CurrentPeriodView";
import type { GoalGraphData } from "../../services/goal-analytics";
import type { Goal } from "../../types/domain";

const mockAddEntry = jest.fn();

jest.mock("../../hooks/useGoalActions", () => ({
  useGoalActions: () => ({
    addEntry: mockAddEntry,
  }),
}));

const createGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "goal-1",
  title: "Water",
  type: "counter",
  unit: "mL",
  target: 2000,
  resetValue: 1,
  resetUnit: "day",
  quickAdd1: 250,
  quickAdd2: 500,
  quickAdd3: null,
  quickAdd4: null,
  sortOrder: 0,
  status: "active",
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  ...overrides,
});

const baseGraph: GoalGraphData = {
  range: "7d",
  target: 2000,
  goalType: "counter",
  hasData: true,
  xDomainStart: new Date("2026-03-28T00:00:00.000Z"),
  xDomainEnd: new Date("2026-04-03T00:00:00.000Z"),
  points: [
    { bucketStart: new Date("2026-03-28T00:00:00.000Z"), value: 300 },
    { bucketStart: new Date("2026-03-29T00:00:00.000Z"), value: 250 },
    { bucketStart: new Date("2026-03-30T00:00:00.000Z"), value: 500 },
    { bucketStart: new Date("2026-03-31T00:00:00.000Z"), value: 150 },
    { bucketStart: new Date("2026-04-01T00:00:00.000Z"), value: 600 },
    { bucketStart: new Date("2026-04-02T00:00:00.000Z"), value: 0 },
    { bucketStart: new Date("2026-04-03T00:00:00.000Z"), value: 450 },
  ],
};

describe("CurrentPeriodView", () => {
  const onManualAdd = jest.fn();
  const onGraphRangeChange = jest.fn();
  const onRollingPeriodCountChange = jest.fn();
  const onCountEmptyRollingPeriodsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the tracking controls with the graph", () => {
    const view = render(
      <CurrentPeriodView
        goal={createGoal()}
        onManualAdd={onManualAdd}
        graph={baseGraph}
        graphRange="7d"
        isGraphLoading={false}
        rollingSummary={{
          windowStart: new Date("2026-03-28T00:00:00.000Z"),
          windowEnd: new Date("2026-04-04T00:00:00.000Z"),
          windowValue: 7,
          windowUnit: "day",
          periodCount: 7,
          expectedTotal: 14000,
          actualTotal: 10000,
          comparedPeriodCount: 7,
          delta: -4000,
          status: "under",
        }}
        isRollingSummaryLoading={false}
        rollingPeriodCounts={[7, 30, 90, 365]}
        selectedRollingPeriodCount={7}
        countEmptyRollingPeriods={false}
        timezone="UTC"
        onGraphRangeChange={onGraphRangeChange}
        onCountEmptyRollingPeriodsChange={onCountEmptyRollingPeriodsChange}
        onRollingPeriodCountChange={onRollingPeriodCountChange}
      />
    );

    expect(view.getByText("Add Entries")).toBeTruthy();
    expect(view.getByText("Manual Add")).toBeTruthy();
    expect(view.getByText("Quick Add")).toBeTruthy();
    expect(view.getByText("Progress Graph")).toBeTruthy();
    expect(view.getByText("Target Difference")).toBeTruthy();
    expect(view.getByText("-4,000 mL")).toBeTruthy();
    expect(view.getByText("Include Skipped Days")).toBeTruthy();
    expect(view.getByText("Include")).toBeTruthy();
    expect(view.getByText("Exclude")).toBeTruthy();
    expect(view.getByText("Target will be based on 7 days in this range.")).toBeTruthy();
    expect(view.queryByText("Recent Activity")).toBeNull();
  });

  it("wires manual add, quick add, graph range, and missing-period actions", () => {
    const view = render(
      <CurrentPeriodView
        goal={createGoal()}
        onManualAdd={onManualAdd}
        graph={baseGraph}
        graphRange="7d"
        isGraphLoading={false}
        rollingSummary={{
          windowStart: new Date("2026-03-28T00:00:00.000Z"),
          windowEnd: new Date("2026-04-04T00:00:00.000Z"),
          windowValue: 7,
          windowUnit: "day",
          periodCount: 7,
          expectedTotal: 14000,
          actualTotal: 10000,
          comparedPeriodCount: 7,
          delta: -4000,
          status: "under",
        }}
        isRollingSummaryLoading={false}
        rollingPeriodCounts={[7, 30, 90, 365]}
        selectedRollingPeriodCount={7}
        countEmptyRollingPeriods={false}
        timezone="UTC"
        onGraphRangeChange={onGraphRangeChange}
        onCountEmptyRollingPeriodsChange={onCountEmptyRollingPeriodsChange}
        onRollingPeriodCountChange={onRollingPeriodCountChange}
      />
    );

    fireEvent.press(view.getByLabelText("Add entry manually"));
    fireEvent.press(view.getByLabelText("Quick add 250"));
    fireEvent.press(view.getByLabelText("Show 30 day graph"));
    fireEvent.press(view.getByLabelText("Show target difference for 30D"));
    fireEvent.press(view.getByLabelText("Include periods with no entries"));

    expect(onManualAdd).toHaveBeenCalledTimes(1);
    expect(mockAddEntry).toHaveBeenCalledWith("goal-1", 250);
    expect(onGraphRangeChange).toHaveBeenCalledWith("30d");
    expect(onRollingPeriodCountChange).toHaveBeenCalledWith(30);
    expect(onCountEmptyRollingPeriodsChange).toHaveBeenCalledWith(true);
  });

  it("renders the graph loading state inside tracking", () => {
    const view = render(
      <CurrentPeriodView
        goal={createGoal()}
        onManualAdd={onManualAdd}
        graph={null}
        graphRange="7d"
        isGraphLoading
        rollingSummary={null}
        isRollingSummaryLoading={false}
        rollingPeriodCounts={[7, 30, 90, 365]}
        selectedRollingPeriodCount={7}
        countEmptyRollingPeriods={false}
        timezone="UTC"
        onGraphRangeChange={onGraphRangeChange}
        onCountEmptyRollingPeriodsChange={onCountEmptyRollingPeriodsChange}
        onRollingPeriodCountChange={onRollingPeriodCountChange}
      />
    );

    expect(view.getByText("Loading graph...")).toBeTruthy();
  });

  it("shows the current period as part of the target basis when skipped periods are excluded", () => {
    const view = render(
      <CurrentPeriodView
        goal={createGoal()}
        onManualAdd={onManualAdd}
        graph={baseGraph}
        graphRange="7d"
        isGraphLoading={false}
        rollingSummary={{
          windowStart: new Date("2026-03-28T00:00:00.000Z"),
          windowEnd: new Date("2026-04-04T00:00:00.000Z"),
          windowValue: 7,
          windowUnit: "day",
          periodCount: 7,
          expectedTotal: 2000,
          actualTotal: 0,
          comparedPeriodCount: 1,
          delta: -2000,
          status: "under",
        }}
        isRollingSummaryLoading={false}
        rollingPeriodCounts={[7, 30, 90, 365]}
        selectedRollingPeriodCount={7}
        countEmptyRollingPeriods={false}
        timezone="UTC"
        onGraphRangeChange={onGraphRangeChange}
        onCountEmptyRollingPeriodsChange={onCountEmptyRollingPeriodsChange}
        onRollingPeriodCountChange={onRollingPeriodCountChange}
      />
    );

    expect(view.getByText("-2,000 mL")).toBeTruthy();
    expect(view.getByText("Target will be based on 1 day in this range.")).toBeTruthy();
  });
});
