import { renderHook, waitFor } from "@testing-library/react-native";
import { useGoalLatestEntry } from "../../hooks/useGoalLatestEntry";
import { db } from "../../db/client";
import { queryCache } from "../../db/query-cache";

jest.mock("../../db/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()),
    invalidate: jest.fn(),
  },
}));

jest.mock("../../db/schema", () => ({
  entries: { goalId: "goal_id", timestamp: "timestamp", id: "id" },
}));

describe("useGoalLatestEntry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the latest entry for a goal", async () => {
    (db.limit as jest.Mock).mockResolvedValueOnce([
      {
        id: "entry-2",
        goalId: "goal-1",
        amount: 72.5,
        note: null,
        timestamp: new Date("2025-01-15T08:30:00Z"),
      },
    ]);

    const { result } = renderHook(() => useGoalLatestEntry("goal-1"));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.latestEntry).toEqual({
      id: "entry-2",
      goalId: "goal-1",
      amount: 72.5,
      note: null,
      timestamp: new Date("2025-01-15T08:30:00Z"),
    });
  });

  it("returns null and skips querying when disabled", async () => {
    const { result } = renderHook(() =>
      useGoalLatestEntry("goal-1", { enabled: false })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.latestEntry).toBeNull();
    expect(db.limit).not.toHaveBeenCalled();
  });

  it("subscribes to cache invalidation when enabled", async () => {
    (db.limit as jest.Mock).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGoalLatestEntry("goal-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(queryCache.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });
});
