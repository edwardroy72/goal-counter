import { act, renderHook } from "@testing-library/react-native";
import { queryCache } from "../../db/query-cache";
import { useGoalLifecycle } from "../../hooks/useGoalLifecycle";

const mockSet = jest.fn().mockReturnThis();
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
const mockSelectLimit = jest.fn();
const mockSelectWhere = jest.fn(() => ({
  limit: mockSelectLimit,
}));
const mockSelectFrom = jest.fn(() => ({
  where: mockSelectWhere,
}));
const mockInsertReturning = jest.fn();
const mockInsertValues = jest.fn(() => ({
  returning: mockInsertReturning,
}));

jest.mock("../../db/client", () => ({
  db: {
    select: jest.fn(() => ({
      from: mockSelectFrom,
    })),
    insert: jest.fn(() => ({
      values: mockInsertValues,
    })),
    update: () => ({
      set: mockSet,
    }),
    delete: () => ({
      where: mockDeleteWhere,
    }),
  },
}));

mockSet.mockReturnValue({ where: mockUpdateWhere });

jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()),
    invalidate: jest.fn(),
  },
}));

jest.mock("../../db/schema", () => ({
  goals: { id: "id", status: "status" },
}));

describe("useGoalLifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateWhere.mockResolvedValue(undefined);
    mockDeleteWhere.mockResolvedValue(undefined);
    mockSelectLimit.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([{ id: "goal-copy-1" }]);
  });

  it("archives a goal", async () => {
    const { result } = renderHook(() => useGoalLifecycle());

    let success = false;
    await act(async () => {
      success = await result.current.archiveGoal("goal-1");
    });

    expect(success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({ status: "archived" });
    expect(queryCache.invalidate).toHaveBeenCalled();
  });

  it("unarchives a goal", async () => {
    const { result } = renderHook(() => useGoalLifecycle());

    let success = false;
    await act(async () => {
      success = await result.current.unarchiveGoal("goal-1");
    });

    expect(success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({
      status: "active",
      sortOrder: expect.any(Number),
    });
  });

  it("deletes a goal", async () => {
    const { result } = renderHook(() => useGoalLifecycle());

    let success = false;
    await act(async () => {
      success = await result.current.deleteGoal("goal-1");
    });

    expect(success).toBe(true);
    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(queryCache.invalidate).toHaveBeenCalled();
  });

  it("duplicates a goal without copying its history", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: "goal-1",
        title: "Daily Water",
        unit: "mL",
        target: 3000,
        targetType: "min",
        resetValue: 1,
        resetUnit: "day",
        rollingWindowValue: 7,
        rollingWindowUnit: "day",
        quickAdd1: 250,
        quickAdd2: 500,
        quickAdd3: null,
        quickAdd4: null,
        sortOrder: 1,
        status: "archived",
        timezone: "Australia/Sydney",
      },
    ]);

    const { result } = renderHook(() => useGoalLifecycle());

    let duplicatedGoalId: string | null = null;
    await act(async () => {
      duplicatedGoalId = await result.current.duplicateGoal("goal-1");
    });

    expect(duplicatedGoalId).toBe("goal-copy-1");
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Daily Water Copy",
        type: "counter",
        unit: "mL",
        target: 3000,
        targetType: "min",
        resetValue: 1,
        resetUnit: "day",
        rollingWindowValue: null,
        rollingWindowUnit: null,
        quickAdd1: 250,
        quickAdd2: 500,
        quickAdd3: null,
        quickAdd4: null,
        sortOrder: expect.any(Number),
        status: "active",
        timezone: "Australia/Sydney",
      })
    );
    expect(queryCache.invalidate).toHaveBeenCalled();
  });

  it("rejects empty goal ids", async () => {
    const { result } = renderHook(() => useGoalLifecycle());

    let success = false;
    await act(async () => {
      success = await result.current.archiveGoal("");
    });

    expect(success).toBe(false);
    expect(result.current.error?.message).toContain("Goal ID is required");
  });

  it("returns null when duplicating a missing goal", async () => {
    const { result } = renderHook(() => useGoalLifecycle());

    let duplicatedGoalId: string | null = "unexpected";
    await act(async () => {
      duplicatedGoalId = await result.current.duplicateGoal("missing-goal");
    });

    expect(duplicatedGoalId).toBeNull();
    expect(result.current.error?.message).toContain("Goal not found");
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("handles database errors", async () => {
    const dbError = new Error("Update failed");
    mockUpdateWhere.mockRejectedValueOnce(dbError);

    const { result } = renderHook(() => useGoalLifecycle());

    let success = false;
    await act(async () => {
      success = await result.current.archiveGoal("goal-1");
    });

    expect(success).toBe(false);
    expect(result.current.error).toEqual(dbError);
  });
});
