import { describe, expect, it } from "vitest";
import { describeMarriageRequest } from "./marriage-request-guidance";

const base = {
  ownEligible: true,
  profileRequired: false,
  hasEducationalId: false,
};

describe("marriage invitation next action guidance", () => {
  it("tells the sender to share a pending invitation instead of paying", () => {
    expect(describeMarriageRequest({ ...base, status: "PENDING", isInitiator: true })).toEqual({
      title: "منتظر پذیرش همراه",
      description: "لینک دعوت را برای همراهت بفرست. بعد از پذیرش او، مرحلهٔ بعد باز می‌شود.",
    });
  });

  it("tells the recipient to review and accept the invitation", () => {
    expect(describeMarriageRequest({ ...base, status: "PENDING", isInitiator: false })).toEqual({
      title: "دعوت جدید برای شما",
      description: "پیش از پذیرش، مشخصات دعوت و شرایط اتصال را بررسی کن.",
    });
  });

  it("prioritizes an incomplete profile over invitation actions", () => {
    expect(describeMarriageRequest({ ...base, status: "PENDING", isInitiator: false, profileRequired: true }).title).toBe("ابتدا مشخصاتت را تکمیل کن");
    expect(describeMarriageRequest({ ...base, status: "PENDING", isInitiator: false, ownEligible: false }).title).toBe("شرایط شرکت را بررسی کن");
  });

  it("shows continuation only after an accepted invitation has an educational workspace", () => {
    expect(describeMarriageRequest({ ...base, status: "ACCEPTED", isInitiator: true, hasEducationalId: true }).title).toBe("دعوت پذیرفته شد");
    expect(describeMarriageRequest({ ...base, status: "ACCEPTED", isInitiator: true }).title).toBe("دعوت پذیرفته شد؛ در حال آماده‌سازی ادامه");
  });

  it("does not suggest proceeding with an invalidated invitation", () => {
    expect(describeMarriageRequest({ ...base, status: "CANCELLED", isInitiator: true }).title).toBe("این دعوت لغو شده است");
    expect(describeMarriageRequest({ ...base, status: "REPLACED", isInitiator: false }).title).toBe("لینک دعوت تغییر کرده است");
  });
});
