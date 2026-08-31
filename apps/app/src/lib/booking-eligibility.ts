import type { BookingEligibility } from "./assessment-api";

export type BookingBlocker = { href: "/onboarding" | "/assessment"; action: string; message: string };

export function bookingBlocker(decision: BookingEligibility): BookingBlocker | null {
  if (decision.eligible || decision.reason === "ELIGIBLE") return null;
  if (decision.nextAction === "COMPLETE_ONBOARDING" || decision.reason === "PROFILE_INCOMPLETE") {
    return { href: "/onboarding", action: "تکمیل پرونده اولیه", message: "برای رزرو نوبت ابتدا پروندهٔ اولیه را کامل کنید." };
  }
  const message = decision.reason === "ASSESSMENT_EXPIRED" ? "اعتبار ارزیابی قبلی پایان یافته است؛ ارزیابی را دوباره انجام دهید." : decision.reason === "LATEST_VERSION_REQUIRED" ? "برای رزرو باید نسخهٔ جدید ارزیابی اصلی را تکمیل کنید." : "برای رزرو ابتدا ارزیابی اصلی را تکمیل کنید.";
  return { href: "/assessment", action: decision.nextAction === "RETAKE_ASSESSMENT" ? "تکرار ارزیابی" : "تکمیل ارزیابی", message };
}
