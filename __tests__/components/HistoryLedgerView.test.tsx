import { fireEvent, render } from "@testing-library/react-native";
import { HistoryLedgerView } from "../../components/goal-detail/HistoryLedgerView";
import type { PeriodGroup } from "../../hooks/useGoalHistory";

const basePeriods: PeriodGroup[] = [
  {
    periodStart: new Date("2026-04-01T00:00:00.000Z"),
    periodEnd: new Date("2026-04-02T00:00:00.000Z"),
    periodLabel: "Apr 1",
    isCurrentPeriod: true,
    periodTotal: 750,
    days: [
      {
        date: "2026-04-01",
        displayDate: "Apr 1",
        dayTotal: 750,
        entries: [
          {
            id: "entry-1",
            goalId: "goal-1",
            amount: 500,
            note: "Morning session",
            timestamp: new Date("2026-04-01T08:00:00.000Z"),
          },
          {
            id: "entry-2",
            goalId: "goal-1",
            amount: 250,
            note: "Evening session",
            timestamp: new Date("2026-04-01T18:00:00.000Z"),
          },
        ],
      },
    ],
  },
];

describe("HistoryLedgerView", () => {
  it("renders history entries without the tracking graph", () => {
    const view = render(
      <HistoryLedgerView
        periods={basePeriods}
        unit="mL"
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={jest.fn()}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );

    expect(view.getByText("Apr 1")).toBeTruthy();
    expect(view.getByText("Morning session")).toBeTruthy();
    expect(view.getByText("Evening session")).toBeTruthy();
    expect(
      view.getByTestId("history-day-group-2026-04-01").props.className
    ).toContain("rounded-history-entry");
    expect(view.queryByText("Progress Graph")).toBeNull();
  });

  it("renders the empty state when there is no history", () => {
    const view = render(
      <HistoryLedgerView
        periods={[]}
        unit="mL"
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={jest.fn()}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );

    expect(view.getByText("No entries yet")).toBeTruthy();
  });

  it("renders measurement history without period totals or plus signs", () => {
    const view = render(
      <HistoryLedgerView
        periods={basePeriods}
        goalType="measurement"
        unit="kg"
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={jest.fn()}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );

    expect(view.queryByText("750 mL")).toBeNull();
    expect(view.queryByText("+500")).toBeNull();
    expect(view.getByText("500 kg")).toBeTruthy();
  });

  it("renders the measurement-specific empty state copy", () => {
    const view = render(
      <HistoryLedgerView
        periods={[]}
        goalType="measurement"
        unit="kg"
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={jest.fn()}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );

    expect(view.getByText("Use quick log to record your first measurement")).toBeTruthy();
  });

  it("shows a load more control and calls it when pressed", () => {
    const onLoadMore = jest.fn();
    const view = render(
      <HistoryLedgerView
        periods={basePeriods}
        unit="mL"
        isLoading={false}
        isLoadingMore={false}
        hasMore
        onLoadMore={onLoadMore}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );

    fireEvent.press(view.getByLabelText("Load more history"));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(view.getByText("Load more")).toBeTruthy();
  });

  it("shows the loading-more state when an extra page is in flight", () => {
    const view = render(
      <HistoryLedgerView
        periods={basePeriods}
        unit="mL"
        isLoading={false}
        isLoadingMore
        hasMore
        onLoadMore={jest.fn()}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );

    expect(view.getByText("Loading more...")).toBeTruthy();
  });
});
