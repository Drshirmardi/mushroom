import { describe, expect, it } from "vitest";
import type { PatientJourney } from "./patient-journey-api";
import { journeyActionLink } from "./patient-journey-api";
import { homeActivities, journeyActionDescription } from "./home-journey";
import { PatientRequestError, patientErrorMessage } from "./patient-request";

const empty = () => Object.fromEntries(["pendingPayments", "appointments", "assessments", "assessmentPurchases", "coupleAssessments", "coupleLinks", "treatmentPlans", "programPurchases", "customPrograms", "pendingOrders"].map(key => [key, { items: [], hasMore: false }])) as unknown as PatientJourney;

describe("Home journeys", () => {
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
