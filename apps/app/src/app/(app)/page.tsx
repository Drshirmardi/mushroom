"use client";
import { AsyncButton } from "@/components/shared/async-button";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { NotificationSheet } from "@/components/notifications/notification-sheet";
import { useCallback, useState } from "react";
import { ArrowLeft, Bell, BookOpen, CalendarDays, ClipboardList, FileHeart, HeartPulse, MessageCircle, ShoppingBag, Users, Wallet } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { getPatientJourney } from "@/lib/patient-journey-api";
import { HomeJourney } from "@/components/home/home-journey";
import { useOptionalPatientEntry } from "@/components/auth/patient-entry-gate";
import { listPatientArticles, listNotifications } from "@/lib/follow-up-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { resumeEntry } from '@/lib/patient-entry-api';
import { OwnedServices } from '@/components/programs/owned-services';

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
  const entry = useOptionalPatientEntry();
  const token = authentication.accessToken;
  const journey = usePatientResource(useCallback(() => getPatientJourney(token), [token]));
  const articles = usePatientResource(useCallback(() => listPatientArticles(token), [token]));
  const notifications = usePatientResource(useCallback(() => listNotifications(token), [token]));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [entryBusy,setEntryBusy]=useState(false),[entryError,setEntryError]=useState('');
  const unread = notifications.data?.items.some(item => !item.readAt);

  return <div className="home-page" dir="rtl">
    <header className="home-header">
      <div><p>دکتر شیرمردی</p><h1>{entry?.status?.firstName ? `سلام، ${entry.status.firstName}` : 'سلام، خوش آمدید'}</h1></div>
      <button type="button" onClick={() => setNotificationsOpen(true)} aria-haspopup="dialog" aria-expanded={notificationsOpen} aria-label={unread ? "اعلان‌ها؛ پیام خوانده‌نشده دارید" : "اعلان‌ها"} className="home-icon-link"><Bell size={21} aria-hidden="true" />{unread && <span className="home-unread" />}</button>
    </header>

    {entry?.status?.reminder&&<section className="home-panel"><h2>آزمون ورود اولیهٔ شما هنوز کامل نشده است</h2><p>{entry.status.assessmentTitle}</p><AsyncButton className="entry-primary" disabled={entryBusy} onClick={async()=>{setEntryBusy(true);setEntryError('');try{await resumeEntry(token);window.location.assign('/welcome');}catch{setEntryError('بازگشت به آزمون انجام نشد؛ دوباره تلاش کنید.');setEntryBusy(false);}}}>ادامهٔ آزمون من</AsyncButton>{entryError&&<p role="alert">{entryError}</p>}</section>}
    <HomeJourney key={authentication.user.id} journey={journey} token={token} />
    <OwnedServices key={`services:${authentication.user.id}`} />

    <section className="home-access" aria-labelledby="home-access-title"><div className="home-section-heading"><div><h2 id="home-access-title">دسترسی‌های من</h2><p>نوبت، مراقبت و حساب شما</p></div><span className="home-section-detail" aria-hidden="true"><FileHeart size={21} strokeWidth={1.5} /></span></div><nav aria-label="دسترسی‌های شخصی" className="home-followups">{followUps.map(({ href, title, icon: Icon }) => <Link href={href} key={href}><span className="home-access-icon"><Icon size={24} strokeWidth={1.5} aria-hidden="true" /></span><span>{title}</span></Link>)}</nav></section>

    <section aria-labelledby="home-services-title">
      <div className="home-section-heading"><div><h2 id="home-services-title">خدمات سلامت</h2><p>خدمت مورد نیازتان را انتخاب کنید</p></div></div>
      <div className="home-services">{services.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="home-service"><span className="home-service-icon"><Icon size={23} strokeWidth={1.5} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p><ArrowLeft className="home-service-arrow" size={16} strokeWidth={1.5} aria-hidden="true" /></Link>)}</div>
    </section>


    <Link href="/store" className="home-store"><span className="home-store-icon"><ShoppingBag size={26} aria-hidden="true" /></span><div><h2>فروشگاه محصولات سلامت</h2><p>بررسی محصولات، موجودی و قیمت</p></div><ArrowLeft size={19} aria-hidden="true" /></Link>

      <section className="home-panel" aria-labelledby="home-articles-title"><div className="home-section-heading"><h2 id="home-articles-title">برای آگاهی بیشتر</h2><Link href="/articles">همهٔ مقاله‌ها</Link></div><PatientResourceState {...articles} retry={() => void articles.reload()} />{articles.data?.items.slice(0, 2).map(item => <Link key={item.id} href={`/articles/${encodeURIComponent(item.slug)}`} className="home-content-link"><BookOpen size={20} aria-hidden="true" /><h3>{item.title}</h3><ArrowLeft size={17} aria-hidden="true" /></Link>)}{articles.data?.items.length === 0 && <p className="home-caption">پس از انتشار محتوای آموزشی، مقاله‌ها در این بخش نمایش داده می‌شوند.</p>}</section>
    <AnimatePresence>{notificationsOpen && <NotificationSheet onClose={() => setNotificationsOpen(false)} onUpdated={() => void notifications.reload()} />}</AnimatePresence>
  </div>;
}
