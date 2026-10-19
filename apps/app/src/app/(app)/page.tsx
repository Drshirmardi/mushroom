"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { NotificationSheet } from "@/components/notifications/notification-sheet";
import { useCallback, useState } from "react";
import { ArrowLeft, Bell, BookOpen, CalendarDays, CircleDot, ClipboardList, FileHeart, HeartPulse, MessageCircle, RefreshCw, ShoppingBag, Users, Wallet } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { getPatientJourney, journeyActionLink } from "@/lib/patient-journey-api";
import { homeActivities, journeyActionDescription } from "@/lib/home-journey";
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

export default function HomePage() {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const journey = usePatientResource(useCallback(() => getPatientJourney(token), [token]));
  const articles = usePatientResource(useCallback(() => listPatientArticles(token), [token]));
  const notifications = usePatientResource(useCallback(() => listNotifications(token), [token]));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const data = journey.data;
  const action = data ? journeyActionLink(data.nextAction) : null;
  const activities = data ? homeActivities(data) : [];
  const unread = notifications.data?.items.some(item => !item.readAt);

  return <div className="home-page" dir="rtl">
    <header className="home-header">
      <div><p>سبز زندگی</p><h1>سلام، خوش آمدید</h1></div>
      <button type="button" onClick={() => setNotificationsOpen(true)} aria-haspopup="dialog" aria-expanded={notificationsOpen} aria-label={unread ? "اعلان‌ها؛ پیام خوانده‌نشده دارید" : "اعلان‌ها"} className="home-icon-link"><Bell size={21} aria-hidden="true" />{unread && <span className="home-unread" />}</button>
    </header>

    <section className="home-next" aria-labelledby="home-next-title">
      <div className="home-section-heading"><span>قدم بعدی شما</span><button type="button" aria-label="به‌روزرسانی وضعیت خانه" disabled={journey.loading} onClick={() => void journey.reload()} className="home-refresh"><RefreshCw size={17} aria-hidden="true" /></button></div>
      {journey.loading ? <div role="status" className="home-next-loading"><span className="skeleton" /><p>در حال دریافت وضعیت شما…</p></div> : journey.error ? <><h2 id="home-next-title">وضعیت شما دریافت نشد</h2><PatientResourceState {...journey} retry={() => void journey.reload()} /><Link href="/onboarding" className="home-next-link">بررسی پروندهٔ اولیه <ArrowLeft size={18} aria-hidden="true" /></Link></> : data && action ? <>
        <h2 id="home-next-title">{action.label}</h2>
        <p className="home-next-description">{journeyActionDescription(data.nextAction.code)}</p>
        <Link href={action.href} className="home-next-link">{action.label}<ArrowLeft size={18} aria-hidden="true" /></Link>
        <div className="home-profile-progress"><div><span>پروندهٔ اولیه</span><span>{data.onboarding.isComplete ? "تکمیل شده" : `${toP(data.onboarding.answeredRequiredCount)} از ${toP(data.onboarding.requiredCount)} مورد ضروری`}</span></div><progress aria-label="تکمیل موارد ضروری پرونده" value={data.onboarding.answeredRequiredCount} max={Math.max(1, data.onboarding.requiredCount)} /></div>
      </> : null}
    </section>

    <section aria-labelledby="home-services-title">
      <div className="home-section-heading"><div><h2 id="home-services-title">خدمات سلامت</h2><p>خدمت مورد نیازتان را انتخاب کنید</p></div></div>
      <div className="home-services">{services.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="home-service"><Icon size={24} aria-hidden="true" /><h3>{title}</h3><p>{description}</p><ArrowLeft className="home-service-arrow" size={17} aria-hidden="true" /></Link>)}</div>
      {data && !data.onboarding.isComplete && <Link href="/onboarding" className="home-setup-hint"><FileHeart size={21} aria-hidden="true" /><span><strong>تکمیل پروندهٔ اولیه</strong><small>برای بررسی شرایط دریافت خدمات</small></span><ArrowLeft size={17} aria-hidden="true" /></Link>}
    </section>

    {data && <section className="home-panel" aria-labelledby="home-activities-title">
      <div className="home-section-heading"><h2 id="home-activities-title">پیگیری‌های شما</h2><span className="home-caption">آخرین موارد هر بخش</span></div>
      {activities.length ? <><div id="home-activities" className="home-activities">{(showAll ? activities : activities.slice(0, 5)).map(item => <Link key={item.key} href={item.href} className="home-activity"><span className="home-activity-mark" aria-hidden="true"><CircleDot size={15} /></span><div><h3>{item.title}</h3><p>{item.detail}</p><span>{item.action}</span></div><ArrowLeft size={18} aria-hidden="true" /></Link>)}</div>{activities.length > 5 && <button type="button" className="home-more" aria-controls="home-activities" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? "نمایش کمتر" : `نمایش موارد بیشتر (${toP(activities.length)})`}</button>}<p className="home-caption home-list-note">برای دیدن سابقهٔ کامل، بخش مربوط را از «دسترسی‌های من» باز کنید.</p></> : <div className="home-empty"><ClipboardList size={28} aria-hidden="true" /><h3>شروع مسیر سلامت شما</h3><p>هنوز آزمون، نوبت یا برنامه‌ای برای پیگیری ندارید. با تکمیل پرونده و انتخاب یک خدمت شروع کنید.</p><Link href="/onboarding">بررسی پرونده و شروع</Link></div>}
    </section>}

    <section aria-labelledby="home-access-title"><div className="home-section-heading"><h2 id="home-access-title">دسترسی‌های من</h2></div><div className="home-followups">{followUps.map(({ href, title, icon: Icon }) => <Link href={href} key={href}><Icon size={20} aria-hidden="true" /><span>{title}</span><ArrowLeft size={15} aria-hidden="true" /></Link>)}</div></section>

    <Link href="/store" className="home-store"><span className="home-store-icon"><ShoppingBag size={26} aria-hidden="true" /></span><div><h2>فروشگاه سبز زندگی</h2><p>بررسی محصولات، موجودی و قیمت</p></div><ArrowLeft size={19} aria-hidden="true" /></Link>

    <section className="home-panel" aria-labelledby="home-notifications-title"><div className="home-section-heading"><h2 id="home-notifications-title">اعلان‌های اخیر</h2><button type="button" onClick={() => setNotificationsOpen(true)} aria-haspopup="dialog">همهٔ اعلان‌ها</button></div><PatientResourceState {...notifications} retry={() => void notifications.reload()} />{notifications.data?.items.slice(0, 3).map(item => <button type="button" key={item.id} onClick={() => setNotificationsOpen(true)} className="home-content-link"><h3>{item.title}</h3><p>{item.body}</p></button>)}{notifications.data?.items.length === 0 && <p className="home-caption">پیام تازه‌ای ندارید. اعلان‌های نوبت و خدمات را اینجا می‌بینید.</p>}</section>
    <section className="home-panel" aria-labelledby="home-articles-title"><div className="home-section-heading"><h2 id="home-articles-title">برای آگاهی بیشتر</h2><Link href="/articles">همهٔ مقاله‌ها</Link></div><PatientResourceState {...articles} retry={() => void articles.reload()} />{articles.data?.items.slice(0, 2).map(item => <Link key={item.id} href={`/articles/${encodeURIComponent(item.slug)}`} className="home-content-link"><BookOpen size={20} aria-hidden="true" /><h3>{item.title}</h3><ArrowLeft size={17} aria-hidden="true" /></Link>)}{articles.data?.items.length === 0 && <p className="home-caption">پس از انتشار محتوای آموزشی، مقاله‌ها در این بخش نمایش داده می‌شوند.</p>}</section>
    <AnimatePresence>{notificationsOpen && <NotificationSheet onClose={() => setNotificationsOpen(false)} onUpdated={() => void notifications.reload()} />}</AnimatePresence>
  </div>;
}
