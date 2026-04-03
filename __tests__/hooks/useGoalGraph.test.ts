import { renderHook, waitFor } from "@testing-library/react-native";
import { useGoalGraph } from "../../hooks/useGoalGraph";
import { db } from "../../db/client";
import { queryCache } from "../../db/query-cache";
import type { Goal } from "../../types/domain";

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
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()),
    invalidate: jest.fn(),
  },
}));

jest.mock("../../db/schema", () => ({
  entries: { goalId: "goal_id", timestamp: "timestamp" },
}));

function createTestGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    title: "Read",
    type: "counter",
    unit: "pages",
    target: 25,
    resetValue: 1,
    resetUnit: "day",
    quickAdd1: 5,
    quickAdd2: null,
    quickAdd3: null,
    quickAdd4: null,
    sortOrder: 0,
    status: "active",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("useGoalGraph", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches ranged entries and shapes counter graph data", async () => {
    const goal = createTestGoal();
    (db.orderBy as jest.Mock).mockResolvedValueOnce([
      {
        id: "entry-1",
        goalId: "goal-1",
        amount: 3,
        note: null,
        timestamp: new Date("2025-01-14T09:00:00Z"),
      },
      {
        id: "entry-2",
        goalId: "goal-1",
        amount: 5,
        note: null,
        timestamp: new Date("2025-01-15T09:00:00Z"),
      },
    ]);

    const { result } = renderHook(() =>
      useGoalGraph(goal, "7d", {
        enabled: true,
        now: new Date("2025-01-15T14:00:00Z"),
      })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.graph?.goalType).toBe("counter");
    expect(result.current.graph?.points).toHaveLength(7);
    expect(result.current.graph?.target).toBe(25);
    expect(
      result.current.graph?.points[result.current.graph.points.length - 1]?.value
    ).toBe(5);
  });

  it("returns measurement points without zero filling", async () => {
    const goal = createTestGoal({
      type: "measurement",
      unit: "kg",
      target: 70,
      resetValue: 0,
      resetUnit: "none",
    });
    (db.orderBy as jest.Mock).mockResolvedValueOnce([
      {
        id: "entry-1",
        goalId: "goal-1",
        amount: 72.1,
        note: null,
        timestamp: new Date("2025-01-02T09:00:00Z"),
      },
      {
        id: "entry-2",
        goalId: "goal-1",
        amount: 71.8,
        note: null,
        timestamp: new Date("2025-01-05T09:00:00Z"),
      },
    ]);

    const { result } = renderHook(() =>
      useGoalGraph(goal, "30d", {
        enabled: true,
        now: new Date("2025-01-15T14:00:00Z"),
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.graph?.goalType).toBe("measurement");
    expect(result.current.graph?.points).toHaveLength(2);
    expect(result.current.graph?.points.map((point) => point.value)).toEqual([
      72.1,
      71.8,
    ]);
  });

  it("returns null graph when disabled", async () => {
    const goal = createTestGoal();
    const { result } = renderHook(() =>
      useGoalGraph(goal, "7d", { enabled: false })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.graph).toBeNull();
    expect(db.orderBy).not.toHaveBeenCalled();
  });

  it("subscribes to cache invalidation while enabled", async () => {
    const goal = createTestGoal();
    (db.orderBy as jest.Mock).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGoalGraph(goal, "30d"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(queryCache.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it("supports the max range for long-lived goals", async () => {
    const goal = createTestGoal({
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    (db.orderBy as jest.Mock).mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useGoalGraph(goal, "max", {
        now: new Date("2025-01-15T14:00:00Z"),
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.graph?.range).toBe("max");
    expect(result.current.graph?.points.length).toBeGreaterThan(300);
  });

  it("handles database errors gracefully", async () => {
    const goal = createTestGoal();
    const dbError = new Error("Database query failed");
    (db.orderBy as jest.Mock).mockRejectedValueOnce(dbError);

    const { result } = renderHook(() =>
      useGoalGraph(goal, "7d", {
        enabled: true,
        now: new Date("2025-01-15T14:00:00Z"),
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(dbError);
    expect(result.current.graph?.points.every((point) => point.value === 0)).toBe(
      true
    );
  });
});
