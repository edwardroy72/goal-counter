import { fireEvent, render } from "@testing-library/react-native";
import { RollingWindowFields } from "../../components/goal-detail/RollingWindowFields";

describe("RollingWindowFields", () => {
  it("shows helper text when rolling windows are unavailable", () => {
    const view = render(
      <RollingWindowFields
        available={false}
        resetUnit="day"
        value=""
        error={null}
        onChangeValue={jest.fn()}
      />
    );

    expect(
      view.getByText(
        "Add a target and choose a reset interval to enable rolling surplus tracking."
      )
    ).toBeTruthy();
    expect(view.queryByLabelText("Rolling surplus window length")).toBeNull();
  });

  it("shows the rolling-window input with the reset unit when available", () => {
    const view = render(
      <RollingWindowFields
        available
        resetUnit="week"
        value="6"
        error={null}
        onChangeValue={jest.fn()}
      />
    );

    expect(view.getByLabelText("Rolling surplus window length")).toBeTruthy();
    expect(view.getByText("Week(s)")).toBeTruthy();
    expect(
      view.getByText("Must be a whole multiple of your reset interval.")
    ).toBeTruthy();
  });

  it("renders validation errors inline and forwards changes", () => {
    const onChangeValue = jest.fn();
    const view = render(
      <RollingWindowFields
        available
        resetUnit="month"
        value=""
        error="Rolling window must be a whole multiple of the reset interval."
        onChangeValue={onChangeValue}
      />
    );

    fireEvent.changeText(view.getByLabelText("Rolling surplus window length"), "3");

    expect(onChangeValue).toHaveBeenCalledWith("3");
    expect(
      view.getByText(
        "Rolling window must be a whole multiple of the reset interval."
      )
    ).toBeTruthy();
  });
});
