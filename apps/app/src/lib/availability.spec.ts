import { describe, expect, it } from "vitest";

import { availabilityDateRange, groupAvailability } from "./availability";

describe("patient availability helpers", () => {
  it("requests a bounded calendar-date range", () => {
    expect(availabilityDateRange(new Date("2026-09-01T12:00:00.000Z"), 7)).toEqual({ fromDate: "2026-09-01", toDate: "2026-09-07" });
  });

  it("groups only server-derived slots by their local date", () => {
    expect(groupAvailability([{ startsAt: "2026-09-01T06:00:00.000Z", endsAt: "2026-09-01T06:30:00.000Z", localDate: "2026-09-01", localStartTime: "09:30", localEndTime: "10:00" }, { startsAt: "2026-09-02T06:00:00.000Z", endsAt: "2026-09-02T06:30:00.000Z", localDate: "2026-09-02", localStartTime: "09:30", localEndTime: "10:00" }, { startsAt: "2026-09-01T07:00:00.000Z", endsAt: "2026-09-01T07:30:00.000Z", localDate: "2026-09-01", localStartTime: "10:30", localEndTime: "11:00" }])).toEqual([{ date: "2026-09-01", slots: expect.arrayContaining([expect.objectContaining({ localStartTime: "09:30" }), expect.objectContaining({ localStartTime: "10:30" })]) }, { date: "2026-09-02", slots: [expect.objectContaining({ localStartTime: "09:30" })] }]);
  });
});
