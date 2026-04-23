import { fireEvent, render } from "@testing-library/react-native";
import { MeasurementGoalFormFields } from "../../components/goal-form/MeasurementGoalFormFields";

describe("MeasurementGoalFormFields", () => {
  it("reports focus for the starting measurement input", () => {
    const onInputFocus = jest.fn();

    const view = render(
      <MeasurementGoalFormFields
        title="Weight"
        unit="kg"
        target="70"
        targetType="max"
        startingMeasurement="68"
        onTitleChange={jest.fn()}
        onUnitChange={jest.fn()}
        onTargetChange={jest.fn()}
        onTargetTypeChange={jest.fn()}
        onStartingMeasurementChange={jest.fn()}
        onInputFocus={onInputFocus}
      />
    );

    fireEvent(view.getByDisplayValue("68"), "pressIn");

    expect(onInputFocus).toHaveBeenCalledWith(0);
    expect(view.getByText("Target Type")).toBeTruthy();
  });
});
