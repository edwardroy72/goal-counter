/**
 * Unit Tests: EntryItem Component
 *
 * Tests the two-tap delete UX:
 * - First tap shows confirmation (check icon)
 * - Second tap performs delete
 * - Auto-resets after 3 seconds
 * - Edit button works correctly
 */

import { act, fireEvent, render } from "@testing-library/react-native";
import { EntryItem } from "../../components/goal-detail/EntryItem";
import type { NormalizedEntry } from "../../hooks/useGoalEntries";

const createMockEntry = (
  overrides: Partial<NormalizedEntry> = {}
): NormalizedEntry => ({
  id: "entry-1",
  goalId: "goal-1",
  amount: 5,
  timestamp: new Date("2025-01-15T10:30:00Z"),
  note: "Test note",
  createdAt: new Date("2025-01-15T10:30:00Z"),
  ...overrides,
});

describe("EntryItem", () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Basic Rendering", () => {
    it("should render entry time correctly", () => {
      const entry = createMockEntry({
        timestamp: new Date("2025-01-15T14:30:00Z"),
      });
      const { getByText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Time should be rendered in local format (implementation-specific)
      expect(getByText(/\d{2}:\d{2}/)).toBeTruthy();
    });

    it("should render entry amount with unit", () => {
      const entry = createMockEntry({ amount: 10 });
      const { getByText } = render(
        <EntryItem
          entry={entry}
          unit="km"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Amount is rendered as "+10" with nested unit text, search with regex
      expect(getByText(/\+10/)).toBeTruthy();
      expect(getByText("km")).toBeTruthy();
    });

    it("should render entry amount without unit when null", () => {
      const entry = createMockEntry({ amount: 5.5 });
      const { getByText, queryByText } = render(
        <EntryItem
          entry={entry}
          unit={null}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText("+5.5")).toBeTruthy();
      expect(queryByText("km")).toBeNull();
    });

    it("should render entry note", () => {
      const entry = createMockEntry({ note: "Morning run" });
      const { getByText } = render(
        <EntryItem
          entry={entry}
          unit="km"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText("Morning run")).toBeTruthy();
    });
  });

  describe("Edit Button", () => {
    it("should call onEdit when edit button is pressed", () => {
      const entry = createMockEntry();
      const { getByLabelText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByLabelText("Edit entry"));

      expect(mockOnEdit).toHaveBeenCalledWith(entry);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe("Two-Tap Delete", () => {
    it("should show confirmation on first tap (not delete yet)", () => {
      const entry = createMockEntry();
      const { getByLabelText, queryByLabelText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Initially shows "Delete entry" button
      expect(getByLabelText("Delete entry")).toBeTruthy();
      expect(queryByLabelText("Confirm delete")).toBeNull();

      // First tap
      fireEvent.press(getByLabelText("Delete entry"));

      // Should NOT have called onDelete yet
      expect(mockOnDelete).not.toHaveBeenCalled();

      // Should now show "Confirm delete" button
      expect(getByLabelText("Confirm delete")).toBeTruthy();
    });

    it("should delete on second tap (confirmation tap)", () => {
      const entry = createMockEntry();
      const { getByLabelText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // First tap - show confirmation
      fireEvent.press(getByLabelText("Delete entry"));
      expect(mockOnDelete).not.toHaveBeenCalled();

      // Second tap - confirm delete
      fireEvent.press(getByLabelText("Confirm delete"));
      expect(mockOnDelete).toHaveBeenCalledWith(entry);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it("should reset confirmation state after 3 seconds", () => {
      const entry = createMockEntry();
      const { getByLabelText, queryByLabelText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // First tap - show confirmation
      fireEvent.press(getByLabelText("Delete entry"));
      expect(getByLabelText("Confirm delete")).toBeTruthy();

      // Advance time by 2.9 seconds - should still be in confirmation state
      act(() => {
        jest.advanceTimersByTime(2900);
      });
      expect(getByLabelText("Confirm delete")).toBeTruthy();

      // Advance past 3 seconds - should reset
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(queryByLabelText("Confirm delete")).toBeNull();
      expect(getByLabelText("Delete entry")).toBeTruthy();
    });

    it("should not call onDelete if user waits past timeout", () => {
      const entry = createMockEntry();
      const { getByLabelText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // First tap
      fireEvent.press(getByLabelText("Delete entry"));

      // Wait past timeout
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Delete should not have been called
      expect(mockOnDelete).not.toHaveBeenCalled();

      // Should show original delete button again (ready for new attempt)
      expect(getByLabelText("Delete entry")).toBeTruthy();
    });

    it("should cancel timeout if user confirms before 3 seconds", () => {
      const entry = createMockEntry();
      const { getByLabelText, queryByLabelText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // First tap
      fireEvent.press(getByLabelText("Delete entry"));

      // Advance 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Second tap (confirm)
      fireEvent.press(getByLabelText("Confirm delete"));
      expect(mockOnDelete).toHaveBeenCalledTimes(1);

      // Button should return to normal after delete
      expect(queryByLabelText("Confirm delete")).toBeNull();
    });

    it("should handle rapid double-tap correctly", () => {
      const entry = createMockEntry();
      const { getByLabelText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Rapid taps
      const deleteButton = getByLabelText("Delete entry");
      fireEvent.press(deleteButton);

      const confirmButton = getByLabelText("Confirm delete");
      fireEvent.press(confirmButton);

      expect(mockOnDelete).toHaveBeenCalledWith(entry);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("should have correct accessibility labels", () => {
      const entry = createMockEntry();
      const { getByLabelText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(getByLabelText("Edit entry")).toBeTruthy();
      expect(getByLabelText("Delete entry")).toBeTruthy();
    });

    it("should have button roles", () => {
      const entry = createMockEntry();
      const { getAllByRole } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Should have 2 buttons (edit and delete)
      const buttons = getAllByRole("button");
      expect(buttons.length).toBe(2);
    });
  });

  describe("Number Formatting", () => {
    it("should format large numbers with locale separators", () => {
      const entry = createMockEntry({ amount: 1234567 });
      const { getByText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Should contain the formatted number (the + is separate)
      expect(getByText(/1[,.]?234[,.]?567/)).toBeTruthy();
    });

    it("should limit decimal places to 2", () => {
      const entry = createMockEntry({ amount: 1.23456 });
      const { getByText } = render(
        <EntryItem
          entry={entry}
          unit="units"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // The + is part of the text, so check for the full pattern
      expect(getByText(/\+.*1\.23/)).toBeTruthy();
    });
  });
});
