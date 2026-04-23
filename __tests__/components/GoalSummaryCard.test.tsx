import { render } from "@testing-library/react-native";
import { GoalSummaryCard } from "../../components/goal-detail/GoalSummaryCard";
import { createMockGoal } from "../factories/goal.factory";

jest.mock("../../contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: { timezone: "UTC" },
    isLoading: false,
    updateSetting: jest.fn(),
    reloadSettings: jest.fn(),
  }),
}));

jest.mock("../../utils/timezone-utils", () => ({
  calculatePeriodEndInTimezone: jest.fn(() => new Date("2025-01-16T00:00:00Z")),
  formatDateInTimezone: jest.fn((date: Date, _timezone: string, format: string) =>
    format === "MMM d, h:mm a" ? "Jan 15, 8:30 AM" : "Jan 15"
  ),
  getCountdownTextWithTimezone: jest.fn(() => "10h left"),
}));

describe("GoalSummaryCard", () => {
  it("renders the counter summary without the old rolling details", () => {
    const view = render(
      <GoalSummaryCard
        goal={createMockGoal({
          target: 500,
          unit: "pages",
        })}
        currentValue={400}
        periodStart={new Date("2025-01-15T00:00:00Z")}
      />
    );

    expect(view.getByText("Since Jan 15")).toBeTruthy();
    expect(view.getByText("Current")).toBeTruthy();
    expect(view.getByText("Remaining")).toBeTruthy();
    expect(view.getByText("10h left")).toBeTruthy();
    expect(view.queryByText("Rolling Deficit")).toBeNull();
  });

  it("renders the measurement summary with latest value and target delta", () => {
    const view = render(
      <GoalSummaryCard
        goal={createMockGoal({
          type: "measurement",
          title: "Body Weight",
          unit: "kg",
          target: 70,
          resetValue: 0,
          resetUnit: "none",
        })}
        currentValue={72.5}
        periodStart={new Date("2025-01-15T00:00:00Z")}
        lastEntryAt={new Date("2025-01-15T08:30:00Z")}
      />
    );

    expect(view.getByText("Latest Measurement")).toBeTruthy();
    expect(view.getByText("72.5 kg")).toBeTruthy();
    expect(view.getByText("2.5 kg")).toBeTruthy();
    expect(view.getByText("To Target")).toBeTruthy();
    expect(view.getByText("Last updated Jan 15, 8:30 AM")).toBeTruthy();
  });

  it("shows target and no-data states for a measurement goal without entries", () => {
    const view = render(
      <GoalSummaryCard
        goal={createMockGoal({
          type: "measurement",
          unit: "kg",
          target: 70,
          resetValue: 0,
          resetUnit: "none",
        })}
        currentValue={null}
        periodStart={new Date("2025-01-15T00:00:00Z")}
      />
    );

    expect(view.getByText("No data")).toBeTruthy();
    expect(view.getByText("Min Target")).toBeTruthy();
    expect(view.getByText("70 kg")).toBeTruthy();
    expect(view.getByText("No measurements yet")).toBeTruthy();
  });
});
