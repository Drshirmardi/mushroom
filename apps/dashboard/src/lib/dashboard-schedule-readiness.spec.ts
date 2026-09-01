import { describe, expect, it } from "vitest";

import { projectDashboardScheduleReadiness } from "./dashboard-schedule-readiness";

describe("dashboard schedule readiness", () => {
  it("projects only active published offerings and actual next-day rules", () => {
    const result = projectDashboardScheduleReadiness({
      clinic: { id: "clinic", name: "کلینیک", timeZone: "Asia/Tehran", status: "ACTIVE", createdAt: "", updatedAt: "" },
      doctors: [], specialties: [], services: [], closures: [], exceptions: [],
      doctorServices: [
        { id: "one", doctor: { id: "doctor", name: "پزشک" }, service: { id: "service", name: "خدمت" }, visitMode: "IN_PERSON", durationMinutes: 30, bufferMinutes: 0, priceAmount: 1, currency: "IRR", isActive: true, publicationStatus: "PUBLISHED", publishedAt: null, createdAt: "", updatedAt: "" },
        { id: "two", doctor: { id: "doctor", name: "پزشک" }, service: { id: "service", name: "خدمت" }, visitMode: "IN_PERSON", durationMinutes: 30, bufferMinutes: 0, priceAmount: 1, currency: "IRR", isActive: false, publicationStatus: "PUBLISHED", publishedAt: null, createdAt: "", updatedAt: "" },
      ],
      availabilityRules: [
        { id: "rule", doctorId: "doctor", visitMode: "IN_PERSON", isoWeekday: 2, startLocalTime: "09:00", endLocalTime: "12:00", isActive: true, createdAt: "", updatedAt: "" },
        { id: "off", doctorId: "doctor", visitMode: "IN_PERSON", isoWeekday: 2, startLocalTime: "13:00", endLocalTime: "14:00", isActive: false, createdAt: "", updatedAt: "" },
      ],
    }, new Date("2026-09-06T12:00:00.000Z"));
    expect(result).toMatchObject({ activeOfferings: 1, activeRules: 1, nextDayIsoWeekday: 1, nextDayRuleCount: 0, timeZone: "Asia/Tehran" });
  });
});
