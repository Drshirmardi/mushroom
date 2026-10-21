import { describe, expect, it } from "vitest";

import { msToMidnight, pad2 } from "./incredible-offers";

describe("incredible offers countdown", () => {
  it("counts down to the next local midnight", () => {
    const noon = new Date(2026, 5, 15, 12, 0, 0).getTime();
    expect(msToMidnight(noon)).toBe(12 * 3_600_000);
  });

  it("rolls over to the next day at midnight", () => {
    const midnight = new Date(2026, 5, 15, 0, 0, 0).getTime();
    expect(msToMidnight(midnight)).toBe(24 * 3_600_000);
  });

  it("pads timer units with Persian digits", () => {
    expect(pad2(5)).toBe("۰۵");
    expect(pad2(21)).toBe("۲۱");
  });
});
