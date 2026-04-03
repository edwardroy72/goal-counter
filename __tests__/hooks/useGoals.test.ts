import { renderHook, waitFor } from "@testing-library/react-native";
import { db } from "../../db/client";
import { queryCache } from "../../db/query-cache";
import { useGoals } from "../../hooks/useGoals";

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
  goals: {
    status: "status",
    sortOrder: "sort_order",
    createdAt: "created_at",
  },
}));

describe("useGoals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches active goals and subscribes to cache invalidation", async () => {
    const mockGoals = [
      { id: "goal-1", title: "Water", status: "active", sortOrder: 1 },
      { id: "goal-2", title: "Sleep", status: null, sortOrder: 2 },
    ];

    (db.orderBy as jest.Mock).mockResolvedValueOnce(mockGoals);

    const { result } = renderHook(() => useGoals({ status: "active" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.goals).toEqual(mockGoals);
    expect(db.where).toHaveBeenCalledTimes(1);
    expect(queryCache.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it("fetches archived goals", async () => {
    const mockGoals = [
      { id: "goal-3", title: "Archived Goal", status: "archived", sortOrder: 3 },
    ];

    (db.orderBy as jest.Mock).mockResolvedValueOnce(mockGoals);

    const { result } = renderHook(() => useGoals({ status: "archived" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.goals).toEqual(mockGoals);
    expect(db.where).toHaveBeenCalledTimes(1);
  });

  it("can be disabled", async () => {
    const { result } = renderHook(() => useGoals({ status: "active", enabled: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.goals).toEqual([]);
    expect(queryCache.subscribe).not.toHaveBeenCalled();
    expect(db.orderBy).not.toHaveBeenCalled();
  });

  it("handles database errors", async () => {
    const dbError = new Error("Failed to query goals");
    (db.orderBy as jest.Mock).mockRejectedValueOnce(dbError);

    const { result } = renderHook(() => useGoals({ status: "active" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.goals).toEqual([]);
    expect(result.current.error).toEqual(dbError);
  });
});
