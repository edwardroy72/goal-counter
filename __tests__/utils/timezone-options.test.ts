import {
  buildTimezoneOption,
  findTimezoneOption,
  formatGmtOffset,
  getTimezoneOptions,
} from "../../utils/timezone-options";

describe("timezone-options", () => {
  it("formats timezone labels from IANA names", () => {
    const option = buildTimezoneOption(
      "America/Argentina/Buenos_Aires",
      new Date("2026-04-03T00:00:00.000Z")
    );

    expect(option).not.toBeNull();
    expect(option?.label).toBe("Buenos Aires, Argentina");
    expect(option?.offsetMinutes).toBe(-180);
  });

  it("includes UTC even when supportedValuesOf does not return it", () => {
    const option = findTimezoneOption("UTC", new Date("2026-04-03T00:00:00.000Z"));

    expect(option.label).toBe("UTC");
    expect(option.offsetMinutes).toBe(0);
  });

  it("builds a full timezone list and keeps it searchable", () => {
    const options = getTimezoneOptions(new Date("2026-04-03T00:00:00.000Z"));
    const sydney = options.find((option) => option.value === "Australia/Sydney");

    expect(options.length).toBeGreaterThan(100);
    expect(sydney?.label).toBe("Sydney");
    expect(sydney?.searchText).toContain("australia sydney");
  });

  it("formats GMT offsets for whole-hour and partial-hour zones", () => {
    expect(formatGmtOffset(0)).toBe("GMT +0");
    expect(formatGmtOffset(330)).toBe("GMT +5:30");
    expect(formatGmtOffset(-210)).toBe("GMT -3:30");
  });
});
