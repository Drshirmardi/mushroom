import { describe, expect, it } from "vitest";

import { bookingBlocker } from "./booking-eligibility";

describe("booking eligibility navigation", () => {
  it("allows only the server ELIGIBLE decision", () => {
    expect(bookingBlocker({ eligible: true, reason: "ELIGIBLE", nextAction: null })).toBeNull();
  });

  it("maps every stable blocker to its contract action", () => {
    expect(bookingBlocker({ eligible: false, reason: "PROFILE_INCOMPLETE", nextAction: "COMPLETE_ONBOARDING" })?.href).toBe("/onboarding");
    expect(bookingBlocker({ eligible: false, reason: "MAIN_ASSESSMENT_REQUIRED", nextAction: "COMPLETE_ASSESSMENT" })?.href).toBe("/assessment");
    expect(bookingBlocker({ eligible: false, reason: "ASSESSMENT_EXPIRED", nextAction: "RETAKE_ASSESSMENT" })).toMatchObject({ href: "/assessment", action: "تکرار ارزیابی" });
    expect(bookingBlocker({ eligible: false, reason: "LATEST_VERSION_REQUIRED", nextAction: "COMPLETE_ASSESSMENT" })?.message).toContain("نسخهٔ جدید");
  });
});
