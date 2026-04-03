import { fireEvent, render } from "@testing-library/react-native";
import { GoalGraphCard } from "../../components/goal-detail/GoalGraphCard";
import type { GoalGraphData } from "../../services/goal-analytics";

const counterGraph: GoalGraphData = {
  range: "7d",
  target: 10,
  goalType: "counter",
  hasData: true,
  xDomainStart: new Date("2025-01-09T00:00:00Z"),
  xDomainEnd: new Date("2025-01-15T00:00:00Z"),
  points: [
    { bucketStart: new Date("2025-01-09T00:00:00Z"), value: 0, hasEntries: false },
    { bucketStart: new Date("2025-01-10T00:00:00Z"), value: 3, hasEntries: true },
    { bucketStart: new Date("2025-01-11T00:00:00Z"), value: 0, hasEntries: false },
    { bucketStart: new Date("2025-01-12T00:00:00Z"), value: 5, hasEntries: true },
    { bucketStart: new Date("2025-01-13T00:00:00Z"), value: 0, hasEntries: false },
    { bucketStart: new Date("2025-01-14T00:00:00Z"), value: 2, hasEntries: true },
    { bucketStart: new Date("2025-01-15T00:00:00Z"), value: 7, hasEntries: true },
  ],
};

const measurementGraph: GoalGraphData = {
  range: "30d",
  target: 70,
  goalType: "measurement",
  hasData: true,
  xDomainStart: new Date("2025-01-01T00:00:00Z"),
  xDomainEnd: new Date("2025-01-31T00:00:00Z"),
  points: [
    { bucketStart: new Date("2025-01-02T08:15:00Z"), value: 72.5, hasEntries: true },
    { bucketStart: new Date("2025-01-11T08:30:00Z"), value: 71.2, hasEntries: true },
    { bucketStart: new Date("2025-01-25T09:00:00Z"), value: 70.8, hasEntries: true },
  ],
};

describe("GoalGraphCard", () => {
  it("renders a loading state", () => {
    const view = render(
      <GoalGraphCard
        graph={null}
        isLoading
        range="7d"
        timezone="UTC"
        unit="units"
        onRangeChange={jest.fn()}
      />
    );

    expect(view.getByText("Loading graph...")).toBeTruthy();
  });

  it("renders an empty state when there is no counter activity", () => {
    const view = render(
      <GoalGraphCard
        graph={{
          ...counterGraph,
          hasData: false,
          points: counterGraph.points.map((point) => ({ ...point, value: 0 })),
        }}
        isLoading={false}
        range="7d"
        timezone="UTC"
        unit="units"
        onRangeChange={jest.fn()}
      />
    );

    expect(view.getByText("No graph data yet.")).toBeTruthy();
  });

  it("calls onRangeChange when a longer range is selected", () => {
    const onRangeChange = jest.fn();
    const view = render(
      <GoalGraphCard
        graph={counterGraph}
        isLoading={false}
        range="7d"
        timezone="UTC"
        unit="units"
        onRangeChange={onRangeChange}
      />
    );

    fireEvent.press(view.getByLabelText("Show 6 month graph"));

    expect(onRangeChange).toHaveBeenCalledWith("6m");
  });

  it("shows the target label and selected point details for counters", () => {
    const view = render(
      <GoalGraphCard
        graph={counterGraph}
        isLoading={false}
        range="7d"
        timezone="UTC"
        unit="units"
        onRangeChange={jest.fn()}
      />
    );

    expect(view.getByText("Goal 10 units")).toBeTruthy();
    expect(view.getByText("Jan 9")).toBeTruthy();
    expect(view.getByText("Jan 12")).toBeTruthy();
    expect(view.getByText("Jan 15")).toBeTruthy();

    fireEvent.press(view.getByLabelText("Inspect Jan 15: 7 units"));

    expect(view.getAllByText("Jan 15").length).toBeGreaterThan(0);
    expect(view.getByText("7 units")).toBeTruthy();
  });

  it("shows no entries when selecting an empty counter day", () => {
    const view = render(
      <GoalGraphCard
        graph={counterGraph}
        isLoading={false}
        range="7d"
        timezone="UTC"
        unit="units"
        onRangeChange={jest.fn()}
      />
    );

    fireEvent.press(view.getByLabelText("Inspect Jan 11: No Entries"));

    expect(view.getAllByText("Jan 11").length).toBeGreaterThan(0);
    expect(view.getByText("No Entries")).toBeTruthy();
  });

  it("renders measurement-specific labels and point timestamps", () => {
    const view = render(
      <GoalGraphCard
        graph={measurementGraph}
        isLoading={false}
        range="30d"
        timezone="UTC"
        unit="kg"
        onRangeChange={jest.fn()}
      />
    );

    expect(view.getByText("Measurement Graph")).toBeTruthy();

    fireEvent.press(view.getByLabelText("Inspect Jan 11, 8:30 AM: 71.2 kg"));

    expect(view.getByText("Jan 11, 8:30 AM")).toBeTruthy();
    expect(view.getByText("71.2 kg")).toBeTruthy();
  });
});
