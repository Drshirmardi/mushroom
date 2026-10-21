import type { PatientJourney } from "./patient-journey-api";
import { billingPurposeLabel, billingStatusLabel } from "./wallet-labels";
import { formatRial } from "./wallet-money";
import { toP } from "./format";

export type HomeActivity = { key: string; title: string; detail: string; href: string; action: string };
const id = encodeURIComponent;
const date = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

/** Explain the exact intent chosen by Journey, without choosing a different next action. */
export function homePaymentSummary(journey: PatientJourney) {
  if (journey.nextAction.code !== "CONTINUE_PAYMENT") return null;
  const payment = journey.pendingPayments.items.find(item => item.id === journey.nextAction.resourceId);
  if (!payment) return null;
  const isTopup = payment.purpose === "TOPUP";
  const count = journey.pendingPayments.items.length;
  const otherRequests = count > 1 || journey.pendingPayments.hasMore
    ? ` ${journey.pendingPayments.hasMore ? "بیش از " : ""}${toP(count)} درخواست در انتظار دارید؛ لغو هرکدام فقط همان درخواست را می‌بندد.`
    : "";
  return {
    title: billingPurposeLabel(payment.purpose),
    label: isTopup ? "پیگیری شارژ" : "پیگیری پرداخت",
    description: `${formatRial(BigInt(payment.amountRial))} تومان در انتظار ${isTopup ? "شارژ کیف پول؛ افزایش موجودی از درگاه بانکی انجام می‌شود" : "پرداخت؛ روش‌های در دسترس را در مرحلهٔ بعد ببینید"}.${otherRequests}`,
  };
}

/** Bounded journey previews; section links still expose each complete resource list. */
export function homeActivities(journey: PatientJourney): HomeActivity[] {
  return [
    ...journey.pendingPayments.items.map(item => ({ key: `payment:${item.id}`, title: billingPurposeLabel(item.purpose), detail: formatRial(BigInt(item.amountRial)), href: `/profile/wallet/pay?intentId=${id(item.id)}`, action: "پیگیری پرداخت" })),
    ...journey.appointments.items.map(item => ({ key: `appointment:${item.id}`, title: item.visitMode === "ONLINE" ? "نوبت آنلاین شما" : "نوبت حضوری شما", detail: date(item.startsAt), href: `/appointments/${id(item.id)}`, action: "جزئیات و ورود" })),
    ...journey.assessments.items.map(item => ({ key: `assessment:${item.id}`, title: item.title, detail: item.state === "COMPLETE" ? "پاسخ‌گویی تکمیل شده است" : item.resumeAvailable ? "پاسخ‌های قبلی شما ذخیره شده‌اند" : "ادامهٔ پاسخ‌گویی فعلاً در دسترس نیست", href: item.state === "COMPLETE" ? `/assessment/result?submissionId=${id(item.id)}` : item.resumeAvailable ? `/assessment/resume?submissionId=${id(item.id)}` : "/assessment", action: item.state === "COMPLETE" ? "مشاهدهٔ نتیجه" : item.resumeAvailable ? "ادامهٔ آزمون" : "بررسی وضعیت" })),
    ...journey.assessmentPurchases.items.filter(item => !item.submissionId || !journey.assessments.items.some(assessment => assessment.id === item.submissionId)).map(item => ({ key: `purchase:${item.id}`, title: item.title, detail: billingStatusLabel(item.paymentState), href: `/assessment/purchases/${id(item.id)}`, action: item.startAvailable ? "شروع آزمون" : "پیگیری خرید" })),
    ...journey.coupleAssessments.items.map(item => ({ key: `couple:${item.id}`, title: item.title, detail: item.jointResultState === "AVAILABLE" ? "نتیجهٔ مشترک آماده است" : "رضایت، پرداخت و پاسخ‌گویی هر دو نفر را اینجا پیگیری کنید", href: `/assessment/couples/${id(item.id)}`, action: "پیگیری ارزیابی زوجین" })),
    ...journey.coupleLinks.items.filter(item => item.state !== "CONSENT_REVOKED").map(item => ({ key: `link:${item.id}`, title: "اتصال حساب همراه", detail: item.state === "LINKED" ? "حساب‌ها متصل‌اند؛ هر آزمون رضایت جداگانه دارد" : "در انتظار تکمیل اتصال همراه", href: `/assessment/couples/links/${id(item.id)}`, action: "بررسی اتصال" })),
    ...journey.treatmentPlans.items.map(item => ({ key: `treatment:${item.id}`, title: "برنامهٔ درمان شما", detail: item.state === "ACTIVE" ? "برنامهٔ فعال و فعالیت‌های ثبت‌شده" : "برنامهٔ تکمیل‌شده", href: `/treatment?planId=${id(item.id)}`, action: "مشاهدهٔ برنامه" })),
    ...journey.programPurchases.items.map(item => ({ key: `program:${item.id}`, title: item.title, detail: item.accessAvailable ? "محتوای برنامه در دسترس است" : billingStatusLabel(item.paymentState), href: item.accessAvailable && item.accessGrantId ? `/programs/content/${id(item.accessGrantId)}` : `/programs/purchases/${id(item.id)}`, action: item.accessAvailable ? "مشاهدهٔ محتوا" : "بررسی دسترسی" })),
    ...journey.customPrograms.items.map(item => ({ key: `custom:${item.requestId}`, title: item.title, detail: item.bodyAvailable ? "نسخهٔ برنامهٔ اختصاصی در دسترس است" : "وضعیت درخواست و مراحل بعدی", href: `/programs/custom/${id(item.requestId)}`, action: "پیگیری درخواست" })),
    ...journey.pendingOrders.items.map(item => ({ key: `order:${item.id}`, title: "سفارش فروشگاه", detail: "سفارش شما نیاز به پیگیری دارد", href: `/store/order-tracking?orderId=${id(item.id)}`, action: "پیگیری سفارش" })),
  ];
}

export function journeyActionDescription(code: PatientJourney["nextAction"]["code"]): string {
  switch (code) {
    case "CONSENT_UNAVAILABLE": return "رضایت‌نامهٔ لازم هنوز در دسترس نیست. وضعیت پرونده را ببینید؛ ادامه پس از فعال‌شدن آن توسط کلینیک ممکن می‌شود.";
    case "REVIEW_CONSENT": return "برای ثبت اطلاعات سلامت، ابتدا متن رضایت‌نامه را بخوانید و انتخاب خود را ثبت کنید.";
    case "CONTINUE_PAYMENT": return "یک پرداخت در انتظار دارید. مبلغ و وضعیت آن را پیش از ادامه بررسی کنید.";
    case "RESUME_ASSESSMENT": return "پاسخ‌های ذخیره‌شدهٔ شما آماده‌اند؛ از همان مرحله ادامه دهید.";
    case "START_PAID_ASSESSMENT": return "دسترسی آزمون خریداری‌شده آماده است. پیش از شروع، شرایط آن دوباره بررسی می‌شود.";
    case "VIEW_ASSESSMENT_RESULT": return "نتیجهٔ ثبت‌شده و محتوای آموزشی مرتبط با ارزیابی خود را ببینید.";
    case "OPEN_APPOINTMENT": return "زمان، شیوهٔ برگزاری و راه ورود به مشاوره را از جزئیات نوبت ببینید.";
    case "OPEN_COUPLE_ASSESSMENT": return "مراحل رضایت مستقل، پرداخت و پاسخ‌گویی خودتان را در ارزیابی مشترک پیگیری کنید.";
    case "VIEW_TREATMENT_PLAN": return "برنامهٔ منتشرشده و فعالیت‌های مرتبط با درمان خود را دنبال کنید.";
    case "OPEN_PROGRAM": return "به محتوای برنامهٔ آموزشی که برای شما فعال شده دسترسی دارید.";
    case "OPEN_CUSTOM_PROGRAM_REQUEST": return "وضعیت درخواست، ارتباط با پزشک و نسخه‌های منتشرشدهٔ برنامه را ببینید.";
    case "BOOK_CONSULTATION": return "پزشک، خدمت و زمان مناسب را انتخاب کنید؛ مبلغ پیش از پرداخت نمایش داده می‌شود.";
    case "REVIEW_BOOKING_REQUIREMENTS": return "پیش‌نیازهای رزرو را ببینید و موارد باقی‌مانده را تکمیل کنید.";
    default: return "اطلاعات ضروری پرونده را کامل کنید تا شرایط دریافت خدمات شما مشخص شود.";
  }
}
