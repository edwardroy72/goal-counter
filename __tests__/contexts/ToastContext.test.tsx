/**
 * Unit Tests: Toast Context
 *
 * Tests the toast notification system:
 * - Toast shows with correct message
 * - Undo button appears when onUndo provided
 * - Undo callback is triggered when pressed
 * - Toast auto-hides after duration
 * - Toast can be manually hidden
 */

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { ToastProvider, useToast } from "../../contexts/ToastContext";

// Test component that uses the toast
function TestComponent({
  onUndo,
  duration,
}: {
  onUndo?: () => void;
  duration?: number;
}) {
  const { showToast, hideToast } = useToast();

  return (
    <>
      <TouchableOpacity
        testID="show-toast"
        onPress={() =>
          showToast({
            message: "Test message",
            onUndo,
            duration,
          })
        }
      >
        <Text>Show Toast</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="hide-toast" onPress={hideToast}>
        <Text>Hide Toast</Text>
      </TouchableOpacity>
    </>
  );
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("ToastContext", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Basic Functionality", () => {
    it("should show toast with message when showToast is called", async () => {
      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <TestComponent />
      );

      // Toast should not be visible initially
      expect(queryByText("Test message")).toBeNull();

      // Show the toast
      fireEvent.press(getByTestId("show-toast"));

      // Toast should now be visible
      await waitFor(() => {
        expect(getByText("Test message")).toBeTruthy();
      });
    });

    it("should auto-hide toast after default duration (3s)", async () => {
      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <TestComponent />
      );

      fireEvent.press(getByTestId("show-toast"));

      // Toast visible
      await waitFor(() => {
        expect(getByText("Test message")).toBeTruthy();
      });

      // Advance timer past duration
      act(() => {
        jest.advanceTimersByTime(3200); // 3s + 200ms for animation
      });

      // Toast should be hidden
      await waitFor(() => {
        expect(queryByText("Test message")).toBeNull();
      });
    });

    it("should respect custom duration", async () => {
      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <TestComponent duration={5000} />
      );

      fireEvent.press(getByTestId("show-toast"));

      await waitFor(() => {
        expect(getByText("Test message")).toBeTruthy();
      });

      // Advance by 3s - toast should still be visible
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(getByText("Test message")).toBeTruthy();

      // Advance past 5s - toast should be hidden
      act(() => {
        jest.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(queryByText("Test message")).toBeNull();
      });
    });

    it("should hide toast when hideToast is called", async () => {
      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <TestComponent />
      );

      fireEvent.press(getByTestId("show-toast"));

      await waitFor(() => {
        expect(getByText("Test message")).toBeTruthy();
      });

      // Manually hide
      fireEvent.press(getByTestId("hide-toast"));

      act(() => {
        jest.advanceTimersByTime(300); // Allow animation
      });

      await waitFor(() => {
        expect(queryByText("Test message")).toBeNull();
      });
    });
  });

  describe("Undo Functionality", () => {
    it("should show Undo button when onUndo is provided", async () => {
      const mockUndo = jest.fn();
      const { getByTestId, getByText, getByLabelText } = renderWithProvider(
        <TestComponent onUndo={mockUndo} />
      );

      fireEvent.press(getByTestId("show-toast"));

      await waitFor(() => {
        expect(getByText("Test message")).toBeTruthy();
        expect(getByLabelText("Undo")).toBeTruthy();
      });
    });

    it("should NOT show Undo button when onUndo is not provided", async () => {
      const { getByTestId, getByText, queryByLabelText } = renderWithProvider(
        <TestComponent />
      );

      fireEvent.press(getByTestId("show-toast"));

      await waitFor(() => {
        expect(getByText("Test message")).toBeTruthy();
      });

      expect(queryByLabelText("Undo")).toBeNull();
    });

    it("should call onUndo callback when Undo is pressed", async () => {
      const mockUndo = jest.fn();
      const { getByTestId, getByLabelText } = renderWithProvider(
        <TestComponent onUndo={mockUndo} />
      );

      fireEvent.press(getByTestId("show-toast"));

      await waitFor(() => {
        expect(getByLabelText("Undo")).toBeTruthy();
      });

      fireEvent.press(getByLabelText("Undo"));

      expect(mockUndo).toHaveBeenCalledTimes(1);
    });

    it("should hide toast immediately when Undo is pressed", async () => {
      const mockUndo = jest.fn();
      const { getByTestId, getByText, getByLabelText, queryByText } =
        renderWithProvider(<TestComponent onUndo={mockUndo} />);

      fireEvent.press(getByTestId("show-toast"));

      await waitFor(() => {
        expect(getByText("Test message")).toBeTruthy();
      });

      fireEvent.press(getByLabelText("Undo"));

      act(() => {
        jest.advanceTimersByTime(300); // Allow animation
      });

      await waitFor(() => {
        expect(queryByText("Test message")).toBeNull();
      });
    });

    it("should clear auto-hide timeout when Undo is pressed", async () => {
      const mockUndo = jest.fn();
      const { getByTestId, getByLabelText, queryByText } = renderWithProvider(
        <TestComponent onUndo={mockUndo} duration={5000} />
      );

      fireEvent.press(getByTestId("show-toast"));

      // Press undo after 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      fireEvent.press(getByLabelText("Undo"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Toast should be hidden
      await waitFor(() => {
        expect(queryByText("Test message")).toBeNull();
      });

      // Undo should be called only once
      expect(mockUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe("Multiple Toasts", () => {
    it("should replace previous toast when new toast is shown", async () => {
      function MultiToastTest() {
        const { showToast } = useToast();
        return (
          <>
            <TouchableOpacity
              testID="show-first"
              onPress={() => showToast({ message: "First message" })}
            >
              <Text>First</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="show-second"
              onPress={() => showToast({ message: "Second message" })}
            >
              <Text>Second</Text>
            </TouchableOpacity>
          </>
        );
      }

      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <MultiToastTest />
      );

      // Show first toast
      fireEvent.press(getByTestId("show-first"));

      await waitFor(() => {
        expect(getByText("First message")).toBeTruthy();
      });

      // Show second toast
      fireEvent.press(getByTestId("show-second"));

      await waitFor(() => {
        expect(getByText("Second message")).toBeTruthy();
        expect(queryByText("First message")).toBeNull();
      });
    });

    it("should reset timeout when new toast replaces old one", async () => {
      function MultiToastTest() {
        const { showToast } = useToast();
        return (
          <>
            <TouchableOpacity
              testID="show-first"
              onPress={() =>
                showToast({ message: "First message", duration: 2000 })
              }
            >
              <Text>First</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="show-second"
              onPress={() =>
                showToast({ message: "Second message", duration: 3000 })
              }
            >
              <Text>Second</Text>
            </TouchableOpacity>
          </>
        );
      }

      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <MultiToastTest />
      );

      // Show first toast (2s duration)
      fireEvent.press(getByTestId("show-first"));

      await waitFor(() => {
        expect(getByText("First message")).toBeTruthy();
      });

      // Wait 1.5s
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Show second toast (3s duration) - should reset timer
      fireEvent.press(getByTestId("show-second"));

      await waitFor(() => {
        expect(getByText("Second message")).toBeTruthy();
      });

      // Wait another 2s (total 3.5s from first toast)
      // Second toast should still be visible (only 2s elapsed for it)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(getByText("Second message")).toBeTruthy();

      // Wait another 1.5s (total 3.5s for second toast)
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(queryByText("Second message")).toBeNull();
      });
    });
  });

  describe("Error Handling", () => {
    it("should throw error when useToast is used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      function InvalidComponent() {
        useToast();
        return null;
      }

      expect(() => render(<InvalidComponent />)).toThrow(
        "useToast must be used within a ToastProvider"
      );

      consoleSpy.mockRestore();
    });
  });
});
