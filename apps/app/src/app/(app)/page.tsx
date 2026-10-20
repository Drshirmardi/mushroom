"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { NotificationSheet } from "@/components/notifications/notification-sheet";
import { useCallback, useState } from "react";
import { ArrowLeft, Bell, BookOpen, CalendarDays, ClipboardList, FileHeart, HeartPulse, MessageCircle, ShoppingBag, Users, Wallet } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { getPatientJourney, journeyActionLink, type PatientJourney } from "@/lib/patient-journey-api";
import { homePaymentSummary, journeyActionDescription } from "@/lib/home-journey";
import { listPatientArticles, listNotifications } from "@/lib/follow-up-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { toP } from "@/lib/format";

const services = [
  { href: "/assessment", title: "ارزیابی فردی", description: "شروع آزمون، ادامه و نتایج", icon: ClipboardList },
  { href: "/assessment/couples", title: "ارزیابی زوجین", description: "اتصال همراه و مراحل مشترک", icon: Users },
  { href: "/appointments/book", title: "رزرو مشاوره", description: "انتخاب پزشک، خدمت و زمان", icon: CalendarDays },
  { href: "/programs", title: "برنامه‌های سلامت", description: "آموزشی و اختصاصی", icon: BookOpen },
];
const followUps = [
  { href: "/appointments", title: "نوبت‌های من", icon: CalendarDays },
  { href: "/treatment", title: "درمان من", icon: HeartPulse },
  { href: "/chat", title: "گفتگو با پزشک", icon: MessageCircle },
  { href: "/profile/health-record", title: "پروندهٔ سلامت", icon: FileHeart },
  { href: "/profile/wallet", title: "کیف پول", icon: Wallet },
  { href: "/store/orders", title: "سفارش‌های من", icon: ShoppingBag },
];

// Presentation only: Journey still selects the action and its exact resource URL.
const shortActions: Record<PatientJourney["nextAction"]["code"], string> = {
  OPEN_APPOINTMENT: "مشاهده نوبت", COMPLETE_PROFILE: "تکمیل پرونده",
  CONSENT_UNAVAILABLE: "بررسی وضعیت", REVIEW_CONSENT: "بررسی رضایت",
  START_MEDICAL_INTAKE: "شروع پرونده", CONTINUE_MEDICAL_INTAKE: "ادامه پرونده",
  COMPLETE_ONBOARDING: "تکمیل پرونده", REVIEW_BOOKING_REQUIREMENTS: "پیش‌نیاز رزرو",
  RESUME_ASSESSMENT: "ادامه ارزیابی", START_PAID_ASSESSMENT: "شروع ارزیابی",
  VIEW_ASSESSMENT_RESULT: "مشاهده نتیجه", CONTINUE_PAYMENT: "پیگیری پرداخت",
  VIEW_TREATMENT_PLAN: "مشاهده برنامه", OPEN_COUPLE_ASSESSMENT: "ادامه ارزیابی",
  OPEN_PROGRAM: "مشاهده برنامه", OPEN_CUSTOM_PROGRAM_REQUEST: "پیگیری درخواست",
  BOOK_CONSULTATION: "رزرو مشاوره",
};

export default function HomePage() {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const journey = usePatientResource(useCallback(() => getPatientJourney(token), [token]));
  const articles = usePatientResource(useCallback(() => listPatientArticles(token), [token]));
  const notifications = usePatientResource(useCallback(() => listNotifications(token), [token]));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const data = journey.data;
  const action = data ? journeyActionLink(data.nextAction) : null;
  const paymentSummary = data ? homePaymentSummary(data) : null;
  const unread = notifications.data?.items.some(item => !item.readAt);

  return <div className="home-page" dir="rtl">
    <header className="home-header">
      <div><p>همراه سلامت دکتر شیرمردی</p><h1>سلام، خوش آمدید</h1></div>
      <button type="button" onClick={() => setNotificationsOpen(true)} aria-haspopup="dialog" aria-expanded={notificationsOpen} aria-label={unread ? "اعلان‌ها؛ پیام خوانده‌نشده دارید" : "اعلان‌ها"} className="home-icon-link"><Bell size={21} aria-hidden="true" />{unread && <span className="home-unread" />}</button>
    </header>

    <div className="home-hero-frame">
      <section className="home-next" aria-labelledby="home-next-title" aria-busy={journey.loading}>
        <div className="home-section-heading"><span>قدم بعدی شما</span></div>
        <div className="home-next-stage">
          <div className="home-next-copy">
            {journey.loading ? <div role="status" className="home-next-loading"><h2 id="home-next-title" className="sr-only">در حال دریافت وضعیت شما</h2><span className="skeleton" aria-hidden="true" /><p>در حال دریافت وضعیت شما…</p></div> : journey.error ? <><h2 id="home-next-title">وضعیت شما دریافت نشد</h2><PatientResourceState {...journey} retry={() => void journey.reload()} /></> : data && action ? <>
              <h2 id="home-next-title">{paymentSummary?.title ?? action.label}</h2>
              <p className="home-next-description">{paymentSummary?.description ?? journeyActionDescription(data.nextAction.code)}</p>
            </> : null}
          </div>
          <div className="home-next-action">{journey.loading ? <span className="home-next-loading-action" aria-hidden="true" /> : journey.error ? <Link href="/onboarding" className="home-next-link">بررسی پرونده <ArrowLeft size={17} aria-hidden="true" /></Link> : data && action ? <Link href={action.href} className="home-next-link" aria-label={paymentSummary?.label ?? action.label}>{paymentSummary?.label ?? shortActions[data.nextAction.code]}<ArrowLeft size={17} aria-hidden="true" /></Link> : null}</div>
          <div className="home-brain" aria-hidden="true"><img src="/images/home/blue-brain-complete.png" alt="" width={1161} height={1355} fetchPriority="high" loading="eager" decoding="async" draggable={false} /></div>
        </div>
        <div className="home-profile-status">{data ? <><FileHeart size={18} aria-hidden="true" /><span>پروندهٔ اولیه</span><span>{data.onboarding.isComplete ? "تکمیل شده" : `${toP(data.onboarding.answeredRequiredCount)} از ${toP(data.onboarding.requiredCount)} مورد ضروری`}</span></> : <span className="home-profile-placeholder" aria-hidden="true" />}</div>
      </section>
    </div>

    <section className="home-access" aria-labelledby="home-access-title"><div className="home-section-heading"><div><h2 id="home-access-title">دسترسی‌های من</h2><p>نوبت، مراقبت و حساب شما</p></div><span className="home-section-detail" aria-hidden="true"><FileHeart size={21} strokeWidth={1.5} /></span></div><nav aria-label="دسترسی‌های شخصی" className="home-followups">{followUps.map(({ href, title, icon: Icon }) => <Link href={href} key={href}><span className="home-access-icon"><Icon size={24} strokeWidth={1.5} aria-hidden="true" /></span><span>{title}</span></Link>)}</nav></section>

    <section aria-labelledby="home-services-title">
      <div className="home-section-heading"><div><h2 id="home-services-title">خدمات سلامت</h2><p>خدمت مورد نیازتان را انتخاب کنید</p></div></div>
      <div className="home-services">{services.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="home-service"><span className="home-service-icon"><Icon size={23} strokeWidth={1.5} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p><ArrowLeft className="home-service-arrow" size={16} strokeWidth={1.5} aria-hidden="true" /></Link>)}</div>
      {data && !data.onboarding.isComplete && <Link href="/onboarding" className="home-setup-hint"><FileHeart size={21} aria-hidden="true" /><span><strong>تکمیل پروندهٔ اولیه</strong><small>برای بررسی شرایط دریافت خدمات</small></span><ArrowLeft size={17} aria-hidden="true" /></Link>}
    </section>


    <Link href="/store" className="home-store"><span className="home-store-icon"><ShoppingBag size={26} aria-hidden="true" /></span><div><h2>فروشگاه سبز زندگی</h2><p>بررسی محصولات، موجودی و قیمت</p></div><ArrowLeft size={19} aria-hidden="true" /></Link>

    <div className="home-content-grid">
      <section className="home-panel" aria-labelledby="home-notifications-title"><div className="home-section-heading"><h2 id="home-notifications-title">اعلان‌های اخیر</h2><button type="button" onClick={() => setNotificationsOpen(true)} aria-haspopup="dialog">همهٔ اعلان‌ها</button></div><PatientResourceState {...notifications} retry={() => void notifications.reload()} />{notifications.data?.items.slice(0, 3).map(item => <button type="button" key={item.id} onClick={() => setNotificationsOpen(true)} className="home-content-link"><h3>{item.title}</h3><p>{item.body}</p></button>)}{notifications.data?.items.length === 0 && <p className="home-caption">پیام تازه‌ای ندارید. اعلان‌های نوبت و خدمات را اینجا می‌بینید.</p>}</section>
      <section className="home-panel" aria-labelledby="home-articles-title"><div className="home-section-heading"><h2 id="home-articles-title">برای آگاهی بیشتر</h2><Link href="/articles">همهٔ مقاله‌ها</Link></div><PatientResourceState {...articles} retry={() => void articles.reload()} />{articles.data?.items.slice(0, 2).map(item => <Link key={item.id} href={`/articles/${encodeURIComponent(item.slug)}`} className="home-content-link"><BookOpen size={20} aria-hidden="true" /><h3>{item.title}</h3><ArrowLeft size={17} aria-hidden="true" /></Link>)}{articles.data?.items.length === 0 && <p className="home-caption">پس از انتشار محتوای آموزشی، مقاله‌ها در این بخش نمایش داده می‌شوند.</p>}</section>
    </div>
    <AnimatePresence>{notificationsOpen && <NotificationSheet onClose={() => setNotificationsOpen(false)} onUpdated={() => void notifications.reload()} />}</AnimatePresence>
  </div>;
}
