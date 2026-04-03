import { renderHook, waitFor } from "@testing-library/react-native";
import { useGoalRollingSummary } from "../../hooks/useGoalRollingSummary";
import { db } from "../../db/client";
import { queryCache } from "../../db/query-cache";
import { createMockGoal } from "../factories/goal.factory";

jest.mock("../../contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: { timezone: "UTC" },
    isLoading: false,
    updateSetting: jest.fn(),
    reloadSettings: jest.fn(),
  }),
}));

jest.mock("../../db/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()),
    invalidate: jest.fn(),
  },
}));

jest.mock("../../db/schema", () => ({
  entries: { goalId: "goal_id", timestamp: "timestamp", amount: "amount" },
}));

describe("useGoalRollingSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches a bounded rolling summary and derives the deficit", async () => {
    (db.where as jest.Mock).mockResolvedValue([
      { amount: 400, timestamp: new Date("2025-01-09T10:00:00Z") },
      { amount: 450, timestamp: new Date("2025-01-10T10:00:00Z") },
      { amount: 750, timestamp: new Date("2025-01-11T10:00:00Z") },
      { amount: 500, timestamp: new Date("2025-01-12T10:00:00Z") },
      { amount: 550, timestamp: new Date("2025-01-13T10:00:00Z") },
      { amount: 300, timestamp: new Date("2025-01-14T10:00:00Z") },
      { amount: 400, timestamp: new Date("2025-01-15T10:00:00Z") },
    ]);

    const { result } = renderHook(() =>
      useGoalRollingSummary(
        createMockGoal({
          target: 500,
          resetUnit: "day",
          resetValue: 1,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        }),
        {
          now: new Date("2025-01-15T14:00:00Z"),
          periodCount: 7,
        }
      )
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toEqual(
      expect.objectContaining({
        expectedTotal: 3500,
        actualTotal: 3350,
        comparedPeriodCount: 7,
        delta: -150,
        status: "under",
      })
    );
  });

  it("ignores empty periods by default when there are only a few logged days", async () => {
    (db.where as jest.Mock).mockResolvedValue([
      { amount: 1200, timestamp: new Date("2025-01-14T10:00:00Z") },
      { amount: 1000, timestamp: new Date("2025-01-15T10:00:00Z") },
    ]);

    const { result } = renderHook(() =>
      useGoalRollingSummary(
        createMockGoal({
          target: 2000,
          resetUnit: "day",
          resetValue: 1,
          createdAt: new Date("2025-01-14T00:00:00Z"),
        }),
        {
          now: new Date("2025-01-15T14:00:00Z"),
          periodCount: 7,
        }
      )
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toEqual(
      expect.objectContaining({
        expectedTotal: 4000,
        actualTotal: 2200,
        comparedPeriodCount: 2,
        delta: -1800,
      })
    );
  });

  it("can count empty periods as zero when requested", async () => {
    (db.where as jest.Mock).mockResolvedValue([
      { amount: 1200, timestamp: new Date("2025-01-14T10:00:00Z") },
      { amount: 1000, timestamp: new Date("2025-01-15T10:00:00Z") },
    ]);

    const { result } = renderHook(() =>
      useGoalRollingSummary(
        createMockGoal({
          target: 2000,
          resetUnit: "day",
          resetValue: 1,
          createdAt: new Date("2025-01-14T00:00:00Z"),
        }),
        {
          now: new Date("2025-01-15T14:00:00Z"),
          countEmptyPeriods: true,
          periodCount: 7,
        }
      )
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toEqual(
      expect.objectContaining({
        expectedTotal: 14000,
        actualTotal: 2200,
        comparedPeriodCount: 7,
        delta: -11800,
      })
    );
  });

  it("still includes the current period when skipped periods are excluded", async () => {
    (db.where as jest.Mock).mockResolvedValue([
      { amount: 1200, timestamp: new Date("2025-01-10T10:00:00Z") },
      { amount: 1000, timestamp: new Date("2025-01-12T10:00:00Z") },
    ]);

    const { result } = renderHook(() =>
      useGoalRollingSummary(
        createMockGoal({
          target: 2000,
          resetUnit: "day",
          resetValue: 1,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        }),
        {
          now: new Date("2025-01-15T14:00:00Z"),
          countEmptyPeriods: false,
          periodCount: 7,
        }
      )
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toEqual(
      expect.objectContaining({
        expectedTotal: 6000,
        actualTotal: 2200,
        comparedPeriodCount: 3,
        delta: -3800,
      })
    );
  });

  it("returns null when the goal is not eligible for rolling analytics", async () => {
    const { result } = renderHook(() =>
      useGoalRollingSummary(createMockGoal({ target: null }), {
        periodCount: 7,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary).toBeNull();
    expect(db.where).not.toHaveBeenCalled();
  });

  it("subscribes to cache invalidation when enabled", async () => {
    (db.where as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useGoalRollingSummary(createMockGoal({ target: 100 }), {
        periodCount: 7,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(queryCache.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it("surfaces database errors", async () => {
    const dbError = new Error("Rolling query failed");
    (db.where as jest.Mock).mockRejectedValue(dbError);

    const { result } = renderHook(() =>
      useGoalRollingSummary(createMockGoal({ target: 100 }), {
        periodCount: 7,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(dbError);
    });

    expect(result.current.summary).toBeNull();
  });
});
