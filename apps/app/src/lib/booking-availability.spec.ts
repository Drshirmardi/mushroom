import { describe, expect, it } from "vitest";
import { availabilityDateRange, bookingDays } from "./availability";

describe("booking calendar", () => {
  it("builds seven civil dates across Nowruz without using the browser timezone", () => {
    const days = bookingDays("2026-03-19");
    expect(days).toEqual(["2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22", "2026-03-23", "2026-03-24", "2026-03-25"]);
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian", { month: "numeric", timeZone: "UTC" });
    expect(formatter.format(new Date(days[0]))).toBe("12");
    expect(formatter.format(new Date(days[6]))).toBe("1");
    expect(bookingDays(days[0], 7)[0]).toBe("2026-03-26");
  });

  it("uses the clinic date when the UTC date is still yesterday", () => {
    expect(availabilityDateRange(new Date("2026-03-20T22:00:00Z"), 7, "Asia/Tehran"))
      .toEqual({ fromDate: "2026-03-21", toDate: "2026-03-27" });
  });
});
