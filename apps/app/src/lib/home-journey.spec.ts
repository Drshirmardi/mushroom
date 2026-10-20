import { describe, expect, it } from "vitest";
import type { PatientJourney } from "./patient-journey-api";
import { journeyActionLink } from "./patient-journey-api";
import { homeActivities, homePaymentSummary, journeyActionDescription } from "./home-journey";
import { PatientRequestError, patientErrorMessage } from "./patient-request";

const empty = () => Object.fromEntries(["pendingPayments", "appointments", "assessments", "assessmentPurchases", "coupleAssessments", "coupleLinks", "treatmentPlans", "programPurchases", "customPrograms", "pendingOrders"].map(key => [key, { items: [], hasMore: false }])) as unknown as PatientJourney;

describe("Home journeys", () => {
  it("describes the selected top-up and explains that cancellation closes only one request", () => {
    const journey = empty();
    journey.nextAction = { code: "CONTINUE_PAYMENT", resourceId: "topup" };
    journey.pendingPayments = { items: [
      { id: "other", purpose: "ORDER", amountRial: "990000", currency: "IRR", expiresAt: null },
      { id: "topup", purpose: "TOPUP", amountRial: "2500000", currency: "IRR", expiresAt: null },
    ], hasMore: false };
    expect(homePaymentSummary(journey)).toEqual({ title: "شارژ کیف پول", label: "پیگیری شارژ", description: "۲۵۰٬۰۰۰ تومان در انتظار شارژ کیف پول؛ افزایش موجودی از درگاه بانکی انجام می‌شود. ۲ درخواست در انتظار دارید؛ لغو هرکدام فقط همان درخواست را می‌بندد." });
    journey.pendingPayments.hasMore = true;
    expect(homePaymentSummary(journey)?.description).toContain("بیش از ۲ درخواست");
    journey.nextAction.resourceId = "other";
    expect(homePaymentSummary(journey)?.title).toBe("پرداخت سفارش");
    expect(homePaymentSummary(journey)?.description).not.toContain("در انتظار شارژ");
  });

  it("does not substitute another intent or invent payment details", () => {
    const journey = empty();
    journey.nextAction = { code: "CONTINUE_PAYMENT", resourceId: "cancelled" };
    expect(homePaymentSummary(journey)).toBeNull();
    journey.nextAction = { code: "BOOK_CONSULTATION", resourceId: null };
    expect(homePaymentSummary(journey)).toBeNull();
  });

  it("shows an honest empty state when there are no owned resources", () => {
    expect(homeActivities(empty())).toEqual([]);
  });

  it("keeps all owned service categories reachable, with payment and appointment first", () => {
    const journey = empty();
    Object.assign(journey, {
      pendingPayments: { items: [{ id: "pay", purpose: "ASSESSMENT", amountRial: "25000" }] },
      appointments: { items: [{ id: "visit", startsAt: "2026-10-19T10:00:00Z", visitMode: "ONLINE" }] },
      assessments: { items: [{ id: "draft", title: "آزمون", state: "IN_PROGRESS", resumeAvailable: true }, { id: "done", title: "نتیجه", state: "COMPLETE" }, { id: "retired", title: "قدیمی", state: "IN_PROGRESS", resumeAvailable: false }] },
      assessmentPurchases: { items: [{ id: "purchase", title: "خرید", paymentState: "PAID", startAvailable: true }, { id: "duplicate", submissionId: "draft" }] },
      coupleAssessments: { items: [{ id: "couple", title: "زوجین", jointResultState: "AVAILABLE" }] },
      coupleLinks: { items: [{ id: "link", state: "AWAITING_PARTNER" }, { id: "revoked", state: "CONSENT_REVOKED" }] },
      treatmentPlans: { items: [{ id: "plan", state: "ACTIVE" }] },
      programPurchases: { items: [{ id: "program", title: "آموزش", accessAvailable: true, accessGrantId: "grant" }, { id: "expired", title: "قدیمی", accessAvailable: false, paymentState: "PAID", accessGrantId: "old" }] },
      customPrograms: { items: [{ requestId: "custom", title: "اختصاصی", bodyAvailable: true }] },
      pendingOrders: { items: [{ id: "order" }] },
    });
    const items = homeActivities(journey);
    expect(items.map(item => item.href)).toEqual([
      "/profile/wallet/pay?intentId=pay", "/appointments/visit", "/assessment/resume?submissionId=draft", "/assessment/result?submissionId=done", "/assessment", "/assessment/purchases/purchase", "/assessment/couples/couple", "/assessment/couples/links/link", "/treatment?planId=plan", "/programs/content/grant", "/programs/purchases/expired", "/programs/custom/custom", "/store/order-tracking?orderId=order",
    ]);
    expect(new Set(items.map(item => item.key)).size).toBe(items.length);
    expect(items.some(item => item.key.endsWith("revoked") || item.key.endsWith("duplicate"))).toBe(false);
  });

  it.each([
    ["OPEN_APPOINTMENT", "/appointments/resource%2Fid"],
    ["RESUME_ASSESSMENT", "/assessment/resume?submissionId=resource%2Fid"],
    ["START_PAID_ASSESSMENT", "/assessment/resume?grantId=resource%2Fid"],
    ["VIEW_ASSESSMENT_RESULT", "/assessment/result?submissionId=resource%2Fid"],
    ["CONTINUE_PAYMENT", "/profile/wallet/pay?intentId=resource%2Fid"],
    ["VIEW_TREATMENT_PLAN", "/treatment?planId=resource%2Fid"],
    ["OPEN_COUPLE_ASSESSMENT", "/assessment/couples/resource%2Fid"],
    ["OPEN_PROGRAM", "/programs/content/resource%2Fid"],
    ["OPEN_CUSTOM_PROGRAM_REQUEST", "/programs/custom/resource%2Fid"],
  ] as const)("routes %s to its exact resource", (code, href) => {
    expect(journeyActionLink({ code, resourceId: "resource/id" }).href).toBe(href);
    expect(journeyActionDescription(code).length).toBeGreaterThan(20);
    expect(journeyActionLink({ code, resourceId: null }).href).not.toContain("null");
  });

  it("explains unavailable consent without claiming that the patient can activate it", () => {
    expect(journeyActionDescription("CONSENT_UNAVAILABLE")).toContain("کلینیک");
    expect(patientErrorMessage(new PatientRequestError(503, "COUPLE_POLICY_UNAVAILABLE"))).toContain("توسط کلینیک فعال نشده");
  });
});
