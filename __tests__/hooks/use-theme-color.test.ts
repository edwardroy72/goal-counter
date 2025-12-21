/**
 * Unit Tests: Theme Color Hook
 *
 * Tests the hook responsible for theme-aware color selection.
 * Ensures correct colors are returned based on light/dark mode.
 */

import { renderHook } from "@testing-library/react-native";
import * as useColorScheme from "../../hooks/use-color-scheme";
import { useThemeColor } from "../../hooks/use-theme-color";

// Mock the color scheme hook
jest.mock("../../hooks/use-color-scheme");

// Mock the theme constants
jest.mock("@/constants/theme", () => ({
  Colors: {
    light: {
      text: "#000000",
      background: "#FFFFFF",
      tint: "#2f95dc",
      tabIconDefault: "#ccc",
      tabIconSelected: "#2f95dc",
    },
    dark: {
      text: "#FFFFFF",
      background: "#000000",
      tint: "#4a9eff",
      tabIconDefault: "#888",
      tabIconSelected: "#4a9eff",
    },
  },
}));

describe("useThemeColor Hook", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Light theme", () => {
    beforeEach(() => {
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue("light");
    });

    it("should return color from light theme when no props provided", () => {
      const { result } = renderHook(() => useThemeColor({}, "text"));

      expect(result.current).toBe("#000000");
    });

    it("should return prop color over theme color when light prop is provided", () => {
      const { result } = renderHook(() =>
        useThemeColor({ light: "#FF0000" }, "text")
      );

      expect(result.current).toBe("#FF0000");
    });

    it("should ignore dark prop in light mode", () => {
      const { result } = renderHook(() =>
        useThemeColor({ dark: "#FF0000" }, "text")
      );

      expect(result.current).toBe("#000000");
    });

    it("should prioritize light prop over dark prop", () => {
      const { result } = renderHook(() =>
        useThemeColor({ light: "#00FF00", dark: "#FF0000" }, "text")
      );

      expect(result.current).toBe("#00FF00");
    });

    it("should work with all theme color keys", () => {
      const { result: textResult } = renderHook(() =>
        useThemeColor({}, "text")
      );
      const { result: bgResult } = renderHook(() =>
        useThemeColor({}, "background")
      );
      const { result: tintResult } = renderHook(() =>
        useThemeColor({}, "tint")
      );

      expect(textResult.current).toBe("#000000");
      expect(bgResult.current).toBe("#FFFFFF");
      expect(tintResult.current).toBe("#2f95dc");
    });
  });

  describe("Dark theme", () => {
    beforeEach(() => {
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue("dark");
    });

    it("should return color from dark theme when no props provided", () => {
      const { result } = renderHook(() => useThemeColor({}, "text"));

      expect(result.current).toBe("#FFFFFF");
    });

    it("should return prop color over theme color when dark prop is provided", () => {
      const { result } = renderHook(() =>
        useThemeColor({ dark: "#FF0000" }, "text")
      );

      expect(result.current).toBe("#FF0000");
    });

    it("should ignore light prop in dark mode", () => {
      const { result } = renderHook(() =>
        useThemeColor({ light: "#FF0000" }, "text")
      );

      expect(result.current).toBe("#FFFFFF");
    });

    it("should prioritize dark prop over light prop", () => {
      const { result } = renderHook(() =>
        useThemeColor({ light: "#00FF00", dark: "#FF0000" }, "text")
      );

      expect(result.current).toBe("#FF0000");
    });

    it("should work with all theme color keys", () => {
      const { result: textResult } = renderHook(() =>
        useThemeColor({}, "text")
      );
      const { result: bgResult } = renderHook(() =>
        useThemeColor({}, "background")
      );
      const { result: tintResult } = renderHook(() =>
        useThemeColor({}, "tint")
      );

      expect(textResult.current).toBe("#FFFFFF");
      expect(bgResult.current).toBe("#000000");
      expect(tintResult.current).toBe("#4a9eff");
    });
  });

  describe("Null/undefined theme handling", () => {
    it("should default to light theme when colorScheme is null", () => {
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useThemeColor({}, "text"));

      expect(result.current).toBe("#000000");
    });

    it("should default to light theme when colorScheme is undefined", () => {
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue(undefined);

      const { result } = renderHook(() => useThemeColor({}, "text"));

      expect(result.current).toBe("#000000");
    });
  });

  describe("Empty props handling", () => {
    beforeEach(() => {
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue("light");
    });

    it("should handle empty props object", () => {
      const { result } = renderHook(() => useThemeColor({}, "text"));

      expect(result.current).toBe("#000000");
    });

    it("should handle undefined props values", () => {
      const { result } = renderHook(() =>
        useThemeColor({ light: undefined, dark: undefined }, "text")
      );

      expect(result.current).toBe("#000000");
    });
  });

  describe("Theme switching", () => {
    it("should update color when theme changes from light to dark", () => {
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue("light");

      const { result, rerender } = renderHook(() => useThemeColor({}, "text"));

      expect(result.current).toBe("#000000");

      // Switch to dark mode
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue("dark");
      rerender();

      expect(result.current).toBe("#FFFFFF");
    });

    it("should update color when theme changes from dark to light", () => {
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue("dark");

      const { result, rerender } = renderHook(() =>
        useThemeColor({}, "background")
      );

      expect(result.current).toBe("#000000");

      // Switch to light mode
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue("light");
      rerender();

      expect(result.current).toBe("#FFFFFF");
    });

    it("should maintain prop overrides during theme changes", () => {
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue("light");

      const { result, rerender } = renderHook(() =>
        useThemeColor({ light: "#CUSTOM1", dark: "#CUSTOM2" }, "text")
      );

      expect(result.current).toBe("#CUSTOM1");

      // Switch to dark mode
      (useColorScheme.useColorScheme as jest.Mock).mockReturnValue("dark");
      rerender();

      expect(result.current).toBe("#CUSTOM2");
    });
  });
});
