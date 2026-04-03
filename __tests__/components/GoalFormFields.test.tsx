import { fireEvent, render } from "@testing-library/react-native";
import { GoalFormFields } from "../../components/goal-form/GoalFormFields";

describe("GoalFormFields", () => {
  it("renders the shared form fields and forwards input changes", () => {
    const onTitleChange = jest.fn();
    const onResetUnitChange = jest.fn();
    const onQuickAdd4Change = jest.fn();

    const view = render(
      <GoalFormFields
        title="Water"
        unit="mL"
        target="2000"
        resetValue="1"
        resetUnit="day"
        quickAdd1="250"
        quickAdd2="500"
        quickAdd3=""
        quickAdd4=""
        onTitleChange={onTitleChange}
        onUnitChange={jest.fn()}
        onTargetChange={jest.fn()}
        onResetValueChange={jest.fn()}
        onResetUnitChange={onResetUnitChange}
        onQuickAdd1Change={jest.fn()}
        onQuickAdd2Change={jest.fn()}
        onQuickAdd3Change={jest.fn()}
        onQuickAdd4Change={onQuickAdd4Change}
      />
    );

    fireEvent.changeText(view.getByDisplayValue("Water"), "Sleep");
    fireEvent.press(view.getByText("Week(s)"));
    fireEvent.changeText(view.getAllByPlaceholderText("+")[2], "1000");

    expect(onTitleChange).toHaveBeenCalledWith("Sleep");
    expect(onResetUnitChange).toHaveBeenCalledWith("week");
    expect(onQuickAdd4Change).toHaveBeenCalledWith("1000");
    expect(view.queryByText("Rolling Surplus Window")).toBeNull();
  });

  it("does not render the old rolling-window setup field", () => {
    const view = render(
      <GoalFormFields
        title=""
        unit=""
        target=""
        resetValue="1"
        resetUnit="none"
        quickAdd1="1"
        quickAdd2=""
        quickAdd3=""
        quickAdd4=""
        onTitleChange={jest.fn()}
        onUnitChange={jest.fn()}
        onTargetChange={jest.fn()}
        onResetValueChange={jest.fn()}
        onResetUnitChange={jest.fn()}
        onQuickAdd1Change={jest.fn()}
        onQuickAdd2Change={jest.fn()}
        onQuickAdd3Change={jest.fn()}
        onQuickAdd4Change={jest.fn()}
      />
    );

    expect(view.queryByText("Rolling Surplus Window")).toBeNull();
  });

  it("reports focus for lower inputs so the parent can scroll them into view", () => {
    const onInputFocus = jest.fn();

    const view = render(
      <GoalFormFields
        title=""
        unit=""
        target=""
        resetValue="1"
        resetUnit="day"
        quickAdd1="100"
        quickAdd2=""
        quickAdd3=""
        quickAdd4=""
        onTitleChange={jest.fn()}
        onUnitChange={jest.fn()}
        onTargetChange={jest.fn()}
        onResetValueChange={jest.fn()}
        onResetUnitChange={jest.fn()}
        onQuickAdd1Change={jest.fn()}
        onQuickAdd2Change={jest.fn()}
        onQuickAdd3Change={jest.fn()}
        onQuickAdd4Change={jest.fn()}
        onInputFocus={onInputFocus}
      />
    );

    fireEvent(view.getByDisplayValue("100"), "pressIn");

    expect(onInputFocus).toHaveBeenCalledWith(0);
  });
});
