import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import type {
  GoalGraphData,
  GoalGraphPoint,
  GoalGraphRange,
} from "../../services/goal-analytics";
import { formatDateInTimezone } from "../../utils/timezone-utils";

const WIDTH = 320;
const HEIGHT = 180;
const LEFT_PADDING = 52;
const RIGHT_PADDING = 20;
const TOP_PADDING = 20;
const BOTTOM_PADDING = 24;
const RANGE_OPTIONS: GoalGraphRange[] = ["7d", "30d", "90d", "6m", "1y", "max"];

interface GoalGraphCardProps {
  graph: GoalGraphData | null;
  isLoading: boolean;
  range: GoalGraphRange;
  timezone: string;
  unit?: string | null;
  onRangeChange: (range: GoalGraphRange) => void;
}

function formatGraphValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatGraphValueWithUnit(value: number, unit?: string | null): string {
  return `${formatGraphValue(value)}${unit ? ` ${unit}` : ""}`;
}

function formatPointText(
  point: GoalGraphPoint,
  timezone: string,
  goalType: GoalGraphData["goalType"]
): string {
  return formatDateInTimezone(
    point.bucketStart,
    timezone,
    goalType === "measurement" ? "MMM d, h:mm a" : "MMM d"
  );
}

function formatAxisDate(
  date: Date,
  timezone: string,
  range: GoalGraphRange
): string {
  const format =
    range === "6m" || range === "1y" || range === "max" ? "MMM yyyy" : "MMM d";

  return formatDateInTimezone(date, timezone, format);
}

function getPointValueLabel(
  point: GoalGraphPoint,
  goalType: GoalGraphData["goalType"],
  unit?: string | null
): string {
  if (goalType === "counter" && point.hasEntries === false) {
    return "No Entries";
  }

  return formatGraphValueWithUnit(point.value, unit);
}

function getRangeLabel(range: GoalGraphRange): string {
  switch (range) {
    case "7d":
      return "7d";
    case "30d":
      return "30d";
    case "90d":
      return "90d";
    case "6m":
      return "6m";
    case "1y":
      return "1y";
    case "max":
      return "Max";
  }
}

function getRangeAccessibilityLabel(range: GoalGraphRange): string {
  switch (range) {
    case "7d":
      return "Show 7 day graph";
    case "30d":
      return "Show 30 day graph";
    case "90d":
      return "Show 90 day graph";
    case "6m":
      return "Show 6 month graph";
    case "1y":
      return "Show 1 year graph";
    case "max":
      return "Show max range graph";
  }
}

export function GoalGraphCard({
  graph,
  isLoading,
  range,
  timezone,
  unit,
  onRangeChange,
}: GoalGraphCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const hasGraphData = graph?.hasData ?? false;
  const goalType = graph?.goalType ?? "counter";
  const maxValue = Math.max(
    ...(graph?.points.map((point) => point.value) ?? [0]),
    graph?.target ?? 0,
    1
  );
  const innerWidth = WIDTH - LEFT_PADDING - RIGHT_PADDING;
  const innerHeight = HEIGHT - TOP_PADDING - BOTTOM_PADDING;
  const axisLabels = [maxValue, Math.max(maxValue / 2, 0), 0];

  useEffect(() => {
    setSelectedIndex(null);
  }, [graph, range]);

  const chartPoints = useMemo(() => {
    const points = graph?.points ?? [];
    const domainStart = graph?.xDomainStart?.getTime() ?? null;
    const domainEnd = graph?.xDomainEnd?.getTime() ?? null;
    const domainWidth =
      domainStart !== null && domainEnd !== null ? domainEnd - domainStart : null;

    return points.map((point, index) => {
      const x =
        points.length === 1
          ? LEFT_PADDING + innerWidth / 2
          : domainStart !== null &&
              domainWidth !== null &&
              Number.isFinite(domainWidth) &&
              domainWidth > 0
            ? LEFT_PADDING +
              ((point.bucketStart.getTime() - domainStart) / domainWidth) *
                innerWidth
            : LEFT_PADDING + (index / Math.max(points.length - 1, 1)) * innerWidth;
      const y =
        TOP_PADDING + innerHeight - (point.value / maxValue) * innerHeight;

      return {
        ...point,
        x,
        y,
        xPercent: (x / WIDTH) * 100,
        yPercent: (y / HEIGHT) * 100,
      };
    });
  }, [
    graph?.points,
    graph?.xDomainEnd,
    graph?.xDomainStart,
    innerHeight,
    innerWidth,
    maxValue,
  ]);

  const polylinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const selectedPoint =
    selectedIndex !== null ? chartPoints[selectedIndex] ?? null : null;
  const middlePoint = chartPoints[Math.floor((chartPoints.length - 1) / 2)] ?? null;
  const targetY =
    graph?.target !== null && graph?.target !== undefined
      ? TOP_PADDING + innerHeight - (graph.target / maxValue) * innerHeight
      : null;
  const targetLabel =
    graph?.target !== null && graph?.target !== undefined
      ? `Target: ${formatGraphValueWithUnit(graph.target, unit)}`
      : null;

  return (
    <View className="rounded-surface border border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-app-dark-surface mb-6">
      <View className="flex-row items-start justify-between mb-4">
        <View>
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">
            {goalType === "measurement" ? "Measurement Graph" : "Progress Graph"}
          </Text>
          <Text className="text-zinc-900 dark:text-zinc-100 text-base font-semibold">
            {targetLabel
              ? targetLabel
              : goalType === "measurement"
                ? "Measurements over time"
                : "Recent progress"}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2 mb-4">
        {RANGE_OPTIONS.map((option) => {
          const isActive = option === range;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={getRangeAccessibilityLabel(option)}
              onPress={() => onRangeChange(option)}
              className={`px-3 py-2 rounded-surface border ${
                isActive
                  ? "bg-blue-600 border-blue-600"
                  : "bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  isActive ? "text-white" : "text-zinc-700 dark:text-zinc-200"
                }`}
              >
                {getRangeLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View className="rounded-surface border border-dashed border-zinc-200 dark:border-zinc-700 py-10 items-center">
          <Text className="text-zinc-400">Loading graph...</Text>
        </View>
      ) : !graph || !hasGraphData ? (
        <View className="rounded-surface border border-dashed border-zinc-200 dark:border-zinc-700 py-10 items-center">
          <Text className="text-zinc-400">
            {goalType === "measurement"
              ? "No measurements yet."
              : "No graph data yet."}
          </Text>
        </View>
      ) : (
        <>
          <View
            className="relative overflow-hidden rounded-surface bg-zinc-50 dark:bg-app-dark-base"
            style={{ aspectRatio: WIDTH / HEIGHT }}
          >
            <Svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="absolute inset-0 h-full w-full"
              accessibilityLabel="Goal graph"
            >
              <Line
                x1={LEFT_PADDING}
                y1={HEIGHT - BOTTOM_PADDING}
                x2={WIDTH - RIGHT_PADDING}
                y2={HEIGHT - BOTTOM_PADDING}
                stroke="#d4d4d8"
                strokeWidth={1}
              />
              {axisLabels.map((label, index) => {
                const y =
                  TOP_PADDING +
                  (innerHeight / Math.max(axisLabels.length - 1, 1)) * index;

                return [
                  <Line
                    key={`grid-${label}-${index}`}
                    x1={LEFT_PADDING}
                    y1={y}
                    x2={WIDTH - RIGHT_PADDING}
                    y2={y}
                    stroke="#d4d4d8"
                    strokeWidth={1}
                    opacity={index === axisLabels.length - 1 ? 0.6 : 0.22}
                  />,
                  <SvgText
                    key={`label-${label}-${index}`}
                    x={6}
                    y={Math.max(y - 6, 12)}
                    fill="#71717a"
                    fontSize="10"
                  >
                    {formatGraphValueWithUnit(label, unit)}
                  </SvgText>,
                ];
              })}
              {targetY !== null ? (
                <>
                  <Line
                    x1={LEFT_PADDING}
                    y1={targetY}
                    x2={WIDTH - RIGHT_PADDING}
                    y2={targetY}
                    stroke="#f59e0b"
                    strokeDasharray="6 6"
                    strokeWidth={2}
                  />
                  <SvgText
                    x={WIDTH - RIGHT_PADDING}
                    y={Math.max(targetY - 8, 12)}
                    textAnchor="end"
                    fill="#f59e0b"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {targetLabel}
                  </SvgText>
                </>
              ) : null}
              <Polyline
                fill="none"
                points={polylinePoints}
                stroke="#2563eb"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chartPoints.map((point, index) => (
                <Circle
                  key={`${point.bucketStart.toISOString()}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={selectedIndex === index ? 5 : 4}
                  fill={selectedIndex === index ? "#1d4ed8" : "#3b82f6"}
                />
              ))}
            </Svg>

            {chartPoints
              .map((point, chartIndex) => ({ point, chartIndex }))
              .map(({ point, chartIndex }) => {
                const pointDate = formatPointText(point, timezone, goalType);
                const pointValue = getPointValueLabel(point, goalType, unit);

                return (
                  <Pressable
                    key={`${point.bucketStart.toISOString()}-press`}
                    accessibilityRole="button"
                    accessibilityLabel={`Inspect ${pointDate}: ${pointValue}`}
                    onPress={() => setSelectedIndex(chartIndex)}
                    style={{
                      position: "absolute",
                      left: `${point.xPercent}%`,
                      top: `${point.yPercent}%`,
                      width: 28,
                      height: 28,
                      transform: [{ translateX: -14 }, { translateY: -14 }],
                    }}
                  >
                    <View />
                  </Pressable>
                );
              })}
          </View>

          <View className="mt-3 flex-row items-center justify-between px-1">
            <Text className="flex-1 text-xs text-zinc-500 dark:text-zinc-400">
              {chartPoints[0]
                ? formatAxisDate(chartPoints[0].bucketStart, timezone, range)
                : ""}
            </Text>
            <Text className="flex-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
              {middlePoint
                ? formatAxisDate(middlePoint.bucketStart, timezone, range)
                : ""}
            </Text>
            <Text className="flex-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
              {chartPoints.length > 0
                ? formatAxisDate(
                    chartPoints[chartPoints.length - 1]!.bucketStart,
                    timezone,
                    range
                  )
                : ""}
            </Text>
          </View>

          <View className="mt-4 min-h-[40px] justify-center">
            {selectedPoint ? (
              <View className="flex-row items-baseline justify-between">
                <Text className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                  {formatPointText(selectedPoint, timezone, goalType)}
                </Text>
                <Text className="text-zinc-900 dark:text-zinc-100 text-base font-semibold">
                  {getPointValueLabel(selectedPoint, goalType, unit)}
                </Text>
              </View>
            ) : (
              <Text className="text-zinc-400 text-sm">
                Tap a point to inspect {goalType === "measurement" ? "a measurement" : "a day"}.
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}
