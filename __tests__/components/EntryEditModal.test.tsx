import { Alert, Platform } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { EntryEditModal } from "../../components/goal-detail/EntryEditModal";
import type { NormalizedEntry } from "../../hooks/useGoalEntries";

const mockUpdateEntry = jest.fn();
const mockClearError = jest.fn();
const mockAndroidOpen = jest.fn();

jest.mock("@react-native-community/datetimepicker", () => {
  const React = jest.requireActual("react");
  const { Text, TouchableOpacity } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: ({
      mode,
      onValueChange,
    }: {
      mode: "date" | "time" | "datetime";
      onValueChange: (event: unknown, date: Date) => void;
    }) => (
      <TouchableOpacity
        testID="entry-date-time-picker"
        onPress={() => {
          const value =
            mode === "date"
              ? new Date("2026-04-08T08:00:00Z")
              : mode === "time"
                ? new Date("2026-04-09T09:15:00Z")
                : new Date("2026-04-08T09:15:00Z");
          onValueChange({ nativeEvent: { timestamp: value.getTime() } }, value);
        }}
      >
        <Text>{mode} picker</Text>
      </TouchableOpacity>
    ),
    DateTimePickerAndroid: {
      open: mockAndroidOpen,
    },
  };
});

jest.mock("../../hooks/useEntryActions", () => ({
  useEntryActions: () => ({
    updateEntry: mockUpdateEntry,
    isProcessing: false,
    error: null,
    clearError: mockClearError,
  }),
}));

jest.mock("../../contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: {
      timezone: "UTC",
    },
  }),
}));

jest.mock("../../hooks/use-color-scheme", () => ({
  useColorScheme: () => "dark",
}));

const createEntry = (
  overrides: Partial<NormalizedEntry> = {}
): NormalizedEntry => ({
  id: "entry-1",
  goalId: "goal-1",
  amount: 250,
  note: "Morning entry",
  timestamp: new Date("2026-04-09T08:00:00Z"),
  ...overrides,
});

async function selectDateTime(view: ReturnType<typeof render>) {
  fireEvent.press(view.getByLabelText("Edit date and time"));

  if (Platform.OS === "android") {
    const [dateCall] = mockAndroidOpen.mock.calls[0];
    dateCall.onValueChange({}, new Date("2026-04-08T08:00:00Z"));
    const [timeCall] = mockAndroidOpen.mock.calls[1];
    timeCall.onValueChange({}, new Date("2026-04-09T09:15:00Z"));
    return;
  }

  fireEvent.press(view.getByTestId("entry-date-time-picker"));
  fireEvent.press(view.getByLabelText("Done with picker"));
}

describe("EntryEditModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateEntry.mockResolvedValue(true);
  });

  it("lets the user retroactively edit the entry timestamp with native pickers", async () => {
    const onClose = jest.fn();
    const view = render(
      <EntryEditModal
        visible
        entry={createEntry()}
        unit="mL"
        onClose={onClose}
      />
    );

    await selectDateTime(view);

    fireEvent.changeText(view.getByDisplayValue("250"), "300");
    fireEvent.changeText(
      view.getByDisplayValue("Morning entry"),
      "Backfilled entry"
    );
    fireEvent.press(view.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalled();
    });

    const [, updates] = mockUpdateEntry.mock.calls[0] as [
      string,
      { amount: number; note: string; timestamp: Date }
    ];

    expect(mockUpdateEntry).toHaveBeenCalledWith(
      "entry-1",
      expect.objectContaining({
        amount: 300,
        note: "Backfilled entry",
      })
    );
    expect(updates.timestamp.toISOString()).toBe("2026-04-08T09:15:00.000Z");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error and does not save when amount is invalid", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    const view = render(
      <EntryEditModal
        visible
        entry={createEntry()}
        unit="mL"
        onClose={jest.fn()}
      />
    );

    fireEvent.changeText(view.getByDisplayValue("250"), "0");
    fireEvent.press(view.getByText("Save Changes"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Invalid Amount",
        "Please enter a valid positive number."
      );
    });

    expect(mockUpdateEntry).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
