import { act, renderHook } from "@testing-library/react-native";
import { queryCache } from "../../db/query-cache";
import { useGoalOrdering } from "../../hooks/useGoalOrdering";
import { createMockGoal } from "../factories/goal.factory";

const mockSet = jest.fn();
const mockWhere = jest.fn().mockResolvedValue(undefined);

jest.mock("../../db/client", () => ({
  db: {
    update: jest.fn(() => ({
      set: mockSet,
    })),
  },
}));

mockSet.mockReturnValue({ where: mockWhere });

jest.mock("../../db/query-cache", () => ({
  queryCache: {
    subscribe: jest.fn(() => jest.fn()),
    invalidate: jest.fn(),
  },
}));

jest.mock("../../db/schema", () => ({
  goals: {
    id: "id",
    sortOrder: "sort_order",
  },
}));

describe("useGoalOrdering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhere.mockResolvedValue(undefined);
  });

  it("swaps sort order with the previous goal when moving up", async () => {
    const goalList = [
      createMockGoal({ id: "goal-1", sortOrder: 10 }),
      createMockGoal({ id: "goal-2", sortOrder: 20 }),
      createMockGoal({ id: "goal-3", sortOrder: 30 }),
    ];
    const { result } = renderHook(() => useGoalOrdering());

    let success = false;
    await act(async () => {
      success = await result.current.moveGoal(goalList, "goal-2", "up");
    });

    expect(success).toBe(true);
    expect(mockSet).toHaveBeenNthCalledWith(1, { sortOrder: 10 });
    expect(mockSet).toHaveBeenNthCalledWith(2, { sortOrder: 20 });
    expect(mockWhere).toHaveBeenCalledTimes(2);
    expect(queryCache.invalidate).toHaveBeenCalled();
  });

  it("swaps sort order with the next goal when moving down", async () => {
    const goalList = [
      createMockGoal({ id: "goal-1", sortOrder: 10 }),
      createMockGoal({ id: "goal-2", sortOrder: 20 }),
      createMockGoal({ id: "goal-3", sortOrder: 30 }),
    ];
    const { result } = renderHook(() => useGoalOrdering());

    let success = false;
    await act(async () => {
      success = await result.current.moveGoal(goalList, "goal-2", "down");
    });

    expect(success).toBe(true);
    expect(mockSet).toHaveBeenNthCalledWith(1, { sortOrder: 30 });
    expect(mockSet).toHaveBeenNthCalledWith(2, { sortOrder: 20 });
    expect(mockWhere).toHaveBeenCalledTimes(2);
  });

  it("does nothing when moving the first goal up", async () => {
    const goalList = [
      createMockGoal({ id: "goal-1", sortOrder: 10 }),
      createMockGoal({ id: "goal-2", sortOrder: 20 }),
    ];
    const { result } = renderHook(() => useGoalOrdering());

    let success = true;
    await act(async () => {
      success = await result.current.moveGoal(goalList, "goal-1", "up");
    });

    expect(success).toBe(false);
    expect(mockSet).not.toHaveBeenCalled();
    expect(queryCache.invalidate).not.toHaveBeenCalled();
  });

  it("tracks the goal currently being moved", async () => {
    const resolveMoves: (() => void)[] = [];
    mockWhere.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveMoves.push(resolve);
        })
    );

    const goalList = [
      createMockGoal({ id: "goal-1", sortOrder: 10 }),
      createMockGoal({ id: "goal-2", sortOrder: 20 }),
    ];
    const { result } = renderHook(() => useGoalOrdering());

    let movePromise: Promise<boolean> | null = null;
    act(() => {
      movePromise = result.current.moveGoal(goalList, "goal-2", "up");
    });

    expect(result.current.isProcessing).toBe(true);
    expect(result.current.movingGoalId).toBe("goal-2");
    expect(result.current.movingDirection).toBe("up");

    resolveMoves[0]?.();

    await act(async () => {
      await Promise.resolve();
    });

    resolveMoves[1]?.();

    await act(async () => {
      await movePromise;
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.movingGoalId).toBeNull();
    expect(result.current.movingDirection).toBeNull();
  });
});
