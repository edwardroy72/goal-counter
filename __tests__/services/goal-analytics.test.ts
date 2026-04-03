import { createMockEntry } from "../factories/entry.factory";
import {
  getGoalGraphWindow,
  shapeGoalGraphData,
  type GoalGraphRange,
} from "../../services/goal-analytics";
import { getDateKeyInTimezone } from "../../utils/timezone-utils";

describe("goal analytics graph shaping", () => {
  const now = new Date("2025-01-15T14:00:00Z");

  const pointKeys = (range: GoalGraphRange, timezone = "UTC") =>
    shapeGoalGraphData({
      entries: [],
      range,
      timezone,
      now,
      target: null,
    }).points.map((point) => getDateKeyInTimezone(point.bucketStart, timezone));

  it("zero-fills missing days and preserves the target for counter goals", () => {
    const result = shapeGoalGraphData({
      entries: [
        createMockEntry({
          amount: 3,
          timestamp: new Date("2025-01-10T10:00:00Z"),
        }),
        createMockEntry({
          amount: 5,
          timestamp: new Date("2025-01-12T10:00:00Z"),
        }),
      ],
      range: "7d",
      timezone: "UTC",
      now,
      target: 10,
      goal: {
        type: "counter",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      },
    });

    expect(result.target).toBe(10);
    expect(result.goalType).toBe("counter");
    expect(result.points).toHaveLength(7);
    expect(
      result.points.map((point) => getDateKeyInTimezone(point.bucketStart, "UTC"))
    ).toEqual([
      "2025-01-09",
      "2025-01-10",
      "2025-01-11",
      "2025-01-12",
      "2025-01-13",
      "2025-01-14",
      "2025-01-15",
    ]);
    expect(result.points.map((point) => point.value)).toEqual([0, 3, 0, 5, 0, 0, 0]);
    expect(result.points.map((point) => point.hasEntries)).toEqual([
      false,
      true,
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it("sums multiple entries on the same local day for counters", () => {
    const result = shapeGoalGraphData({
      entries: [
        createMockEntry({
          amount: 2,
          timestamp: new Date("2025-01-15T02:00:00Z"),
        }),
        createMockEntry({
          amount: 4,
          timestamp: new Date("2025-01-15T18:00:00Z"),
        }),
      ],
      range: "7d",
      timezone: "UTC",
      now,
      target: null,
      goal: {
        type: "counter",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      },
    });

    expect(result.points[result.points.length - 1]?.value).toBe(6);
  });

  it("buckets counter entries by local day across timezone boundaries", () => {
    const result = shapeGoalGraphData({
      entries: [
        createMockEntry({
          amount: 4,
          timestamp: new Date("2025-01-15T02:30:00Z"),
        }),
        createMockEntry({
          amount: 7,
          timestamp: new Date("2025-01-15T06:30:00Z"),
        }),
      ],
      range: "7d",
      timezone: "America/New_York",
      now,
      target: 12,
      goal: {
        type: "counter",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      },
    });

    const valuesByDate = new Map(
      result.points.map((point) => [
        getDateKeyInTimezone(point.bucketStart, "America/New_York"),
        point.value,
      ])
    );

    expect(valuesByDate.get("2025-01-14")).toBe(4);
    expect(valuesByDate.get("2025-01-15")).toBe(7);
  });

  it("returns a zero-filled series for an empty counter range", () => {
    const result = shapeGoalGraphData({
      entries: [],
      range: "30d",
      timezone: "UTC",
      now,
      target: null,
      goal: {
        type: "counter",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      },
    });

    expect(result.points).toHaveLength(30);
    expect(result.points.every((point) => point.value === 0)).toBe(true);
  });

  it("keeps measurement entries as direct points instead of daily buckets", () => {
    const result = shapeGoalGraphData({
      entries: [
        createMockEntry({
          amount: 72.3,
          timestamp: new Date("2025-01-02T09:15:00Z"),
        }),
        createMockEntry({
          amount: 71.9,
          timestamp: new Date("2025-01-10T07:45:00Z"),
        }),
      ],
      range: "30d",
      timezone: "UTC",
      now,
      target: 70,
      goal: {
        type: "measurement",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      },
    });

    expect(result.goalType).toBe("measurement");
    expect(result.hasData).toBe(true);
    expect(result.points).toHaveLength(2);
    expect(result.points.map((point) => point.value)).toEqual([72.3, 71.9]);
    expect(result.points.every((point) => point.hasEntries === true)).toBe(true);
    expect(result.points.map((point) => point.bucketStart.toISOString())).toEqual([
      "2025-01-02T09:15:00.000Z",
      "2025-01-10T07:45:00.000Z",
    ]);
  });

  it("builds exact bucket counts and bounded window edges for each fixed range", () => {
    expect(pointKeys("7d")).toHaveLength(7);
    expect(pointKeys("30d")).toHaveLength(30);
    expect(pointKeys("90d")).toHaveLength(90);
    expect(pointKeys("6m").length).toBeGreaterThan(180);
    expect(pointKeys("1y").length).toBeGreaterThan(360);

    const window = getGoalGraphWindow({
      range: "7d",
      timezone: "America/New_York",
      now,
    });

    expect(window.bucketKeys?.[0]).toBe("2025-01-09");
    expect(window.bucketKeys?.[window.bucketKeys.length - 1]).toBe("2025-01-15");
    expect(window.rangeStart.toISOString()).toBe("2025-01-09T05:00:00.000Z");
    expect(window.rangeEnd.toISOString()).toBe("2025-01-16T05:00:00.000Z");
  });

  it("uses creation date as the start of the max graph range", () => {
    const window = getGoalGraphWindow({
      range: "max",
      timezone: "UTC",
      now,
      createdAt: new Date("2024-12-20T10:00:00Z"),
    });

    expect(window.bucketKeys?.[0]).toBe("2024-12-20");
    expect(window.bucketKeys?.[window.bucketKeys.length - 1]).toBe("2025-01-15");
  });
});
