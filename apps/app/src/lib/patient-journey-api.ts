import type { components } from "@sabz-zendegi/api-client";
import { apiClient } from "./api";
import { patientAuthorization, patientData } from "./patient-request";

export type PatientJourney = components["schemas"]["PatientJourneyResponseDto"];
export const getPatientJourney = (token: string) => patientData(apiClient.GET("/v1/patients/me/journey", { headers: patientAuthorization(token), cache: "no-store" }));

export function journeyActionLink(action: PatientJourney["nextAction"]): { href: string; label: string } {
  const id = action.resourceId ? encodeURIComponent(action.resourceId) : null;
  switch (action.code) {
    case "OPEN_APPOINTMENT": return { href: id ? `/appointments/${id}` : "/appointments", label: "مشاهدهٔ نوبت" };
    case "RESUME_ASSESSMENT": return { href: id ? `/assessment/resume?submissionId=${id}` : "/assessment", label: "ادامهٔ ارزیابی" };
    case "START_PAID_ASSESSMENT": return { href: id ? `/assessment/resume?grantId=${id}` : "/assessment", label: "شروع ارزیابی خریداری‌شده" };
    case "VIEW_ASSESSMENT_RESULT": return { href: id ? `/assessment/result?submissionId=${id}` : "/assessment", label: "مشاهدهٔ نتیجهٔ ارزیابی" };
    case "CONTINUE_PAYMENT": return { href: id ? `/profile/wallet/pay?intentId=${id}` : "/profile/wallet", label: "پیگیری پرداخت" };
    case "VIEW_TREATMENT_PLAN": return { href: id ? `/treatment?planId=${id}` : "/treatment", label: "مشاهدهٔ برنامهٔ درمان" };
    case "OPEN_COUPLE_ASSESSMENT": return { href: id ? `/assessment/couples/${id}` : "/assessment/couples", label: "ادامهٔ ارزیابی زوجین" };
    case "OPEN_PROGRAM": return { href: id ? `/programs/content/${id}` : "/programs", label: "مشاهدهٔ برنامهٔ آموزشی" };
    case "OPEN_CUSTOM_PROGRAM_REQUEST": return { href: id ? `/programs/custom/${id}` : "/programs", label: "پیگیری برنامهٔ اختصاصی" };
    case "REVIEW_BOOKING_REQUIREMENTS": return { href: "/appointments/book", label: "بررسی پیش‌نیازهای رزرو" };
    case "BOOK_CONSULTATION": return { href: "/appointments/book", label: "رزرو مشاوره" };
    case "CONSENT_UNAVAILABLE": return { href: "/onboarding", label: "بررسی وضعیت رضایت‌نامه" };
    case "REVIEW_CONSENT": return { href: "/onboarding", label: "بررسی و ثبت رضایت" };
    default: return { href: "/onboarding", label: "تکمیل پرونده و مراحل اولیه" };
  }
}
