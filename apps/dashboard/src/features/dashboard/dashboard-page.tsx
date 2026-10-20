"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AlertCircle, ArrowUpLeft, CalendarDays, CheckCircle2, ChevronLeft, ClipboardList, Clock3, RefreshCw, ShieldAlert, TrendingUp, UserPlus, Users } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { KpiCard } from "@/components/shared/kpi-card";
import { apiClient } from "@/lib/api";
import { loadDashboardHomeReporting, type DashboardHomeReporting, type DashboardHomeReportingState } from "@/lib/dashboard-home-reporting";
import { p } from "@/lib/utils";
import { RevenuePanel, useRevenueReport } from "./revenue-panel";

type HomeViewState = DashboardHomeReportingState | { status: "loading" };
const toman = (amount: string) => BigInt(amount).toLocaleString("fa-IR");
const localDate = (value: string, timeZone: string) => new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric", timeZone }).format(new Date(value));
const localTime = (value: string, timeZone: string) => new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(value));
const appointmentLabels = { PENDING: "در انتظار تأیید", CONFIRMED: "تأییدشده", CHECKED_IN: "پذیرش‌شده", QUEUED: "در صف", IN_PROGRESS: "در حال ویزیت", COMPLETED: "تکمیل‌شده", NO_SHOW: "عدم مراجعه", CANCELLED: "لغوشده" };
const activityLabels: Record<string, string> = {
  APPOINTMENT_CREATED: "نوبت جدید ثبت شد", APPOINTMENT_CANCELLED: "نوبت لغو شد", APPOINTMENT_RESCHEDULED: "زمان نوبت تغییر کرد",
  APPOINTMENT_CONFIRMED: "نوبت تأیید شد", APPOINTMENT_CHECKED_IN: "پذیرش بیمار ثبت شد", APPOINTMENT_QUEUED: "بیمار به صف اضافه شد",
  APPOINTMENT_STARTED: "ویزیت آغاز شد", APPOINTMENT_COMPLETED: "ویزیت تکمیل شد", APPOINTMENT_NO_SHOW: "عدم مراجعه ثبت شد",
};

function AppointmentOverview({ report }: { report: DashboardHomeReporting }) {
  const { appointments } = report;
  const rows = [
    { label: "زمان‌بندی‌شده", value: appointments.scheduled, color: "var(--chart-1)" },
    { label: "تکمیل‌شده", value: appointments.completed, color: "var(--accent)" },
    { label: "لغوشده", value: appointments.cancelled, color: "var(--chart-3)" },
    { label: "عدم مراجعه", value: appointments.noShow, color: "var(--chart-4)" },
  ];
  const maximum = Math.max(...rows.map(row => row.value), 1);
  return <section className="dashboard-card flex flex-col" aria-labelledby="appointments-overview-title">
    <div className="dashboard-card-head"><div><h2 id="appointments-overview-title">وضعیت نوبت‌های امروز</h2><p>نمای روزانهٔ فعالیت کلینیک</p></div><CalendarDays size={20} className="text-muted-foreground" aria-hidden="true" /></div>
    <dl className="flex flex-1 flex-col justify-center gap-6 px-6 pb-7 pt-3">{rows.map(row => <div key={row.label}>
      <div className="mb-2.5 flex items-center justify-between text-xs"><dt className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full" style={{ background: row.color }} />{row.label}</dt><dd className="font-semibold tabular-nums">{p(row.value)}</dd></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="dashboard-progress h-full rounded-full" style={{ width: `${row.value / maximum * 100}%`, background: row.color }} /></div>
    </div>)}</dl>
    <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 size={16} aria-hidden="true" />میانگین انتظار</div><p className="text-sm font-semibold">{typeof appointments.averageWaitMinutes === "number" ? `${p(appointments.averageWaitMinutes)} دقیقه` : "قابل محاسبه نیست"}</p></div>
    <Link href="/queue" className="flex min-h-12 items-center justify-between gap-2 border-t border-border px-6 py-3 text-xs font-medium hover:bg-muted">مشاهدهٔ صف انتظار<ArrowUpLeft size={16} aria-hidden="true" /></Link>
  </section>;
}

function PatientOverview({ report }: { report: DashboardHomeReporting }) {
  const { patients } = report;
  const total = patients.onboardingComplete + patients.onboardingIncomplete;
  const completed = total ? patients.onboardingComplete / total * 100 : 0;
  return <section className="dashboard-card" aria-labelledby="patients-overview-title">
    <div className="dashboard-card-head"><div><h2 id="patients-overview-title">وضعیت پرونده‌ها</h2><p>تکمیل اطلاعات اولیهٔ بیماران</p></div><Link href="/patients" className="dashboard-icon" aria-label="مشاهدهٔ بیماران"><ArrowUpLeft size={18} /></Link></div>
    <div className="flex flex-wrap items-center justify-center gap-7 px-6 pb-7">
      {total > 0 ? <div className="relative size-40 shrink-0" role="img" aria-label={`${p(patients.onboardingComplete)} پرونده تکمیل‌شده و ${p(patients.onboardingIncomplete)} پرونده نیازمند تکمیل`}>
        <svg viewBox="0 0 160 160" className="size-full -rotate-90" aria-hidden="true"><circle cx="80" cy="80" r="65" fill="none" stroke="var(--muted)" strokeWidth="13" /><circle cx="80" cy="80" r="65" fill="none" stroke="var(--accent)" strokeWidth="13" pathLength="100" strokeDasharray={`${completed} 100`} strokeLinecap={completed > 0 ? "round" : "butt"} /></svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl font-extrabold tabular-nums">{p(total)}</strong><span className="mt-1 text-[11px] text-muted-foreground">پرونده</span></div>
      </div> : <p className="py-9 text-sm text-muted-foreground">پرونده‌ای برای نمایش وجود ندارد.</p>}
      <dl className="min-w-36 flex-1 space-y-4 text-xs"><div className="flex justify-between gap-3"><dt className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-accent" />تکمیل‌شده</dt><dd className="font-semibold">{p(patients.onboardingComplete)}</dd></div><div className="flex justify-between gap-3"><dt className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-chart-3" />نیازمند تکمیل</dt><dd className="font-semibold">{p(patients.onboardingIncomplete)}</dd></div><div className="flex justify-between gap-3 border-t border-border pt-4"><dt className="text-muted-foreground">بیماران جدید امروز</dt><dd className="font-semibold">{p(patients.newPatients)}</dd></div></dl>
    </div>
  </section>;
}

function TodayPlan({ report }: { report: DashboardHomeReporting }) {
  const { appointments } = report;
  return <section className="dashboard-card overflow-hidden" aria-labelledby="today-plan-title">
    <div className="dashboard-card-head"><div><h2 id="today-plan-title">برنامهٔ امروز</h2><p>حداکثر ۱۰ نوبت از برنامهٔ ثبت‌شده</p></div><Link href="/appointments" className="flex min-h-11 items-center gap-1 text-xs font-medium">همهٔ نوبت‌ها<ChevronLeft size={15} aria-hidden="true" /></Link></div>
    {appointments.items.length ? <div className="overflow-x-auto"><table className="dashboard-table"><caption className="sr-only">نوبت‌های امروز کلینیک</caption><thead><tr><th scope="col">زمان مراجعه</th><th scope="col">شناسهٔ نوبت</th><th scope="col">وضعیت</th></tr></thead><tbody>{appointments.items.map(item => <tr key={item.id}><td className="whitespace-nowrap font-semibold tabular-nums">{localTime(item.startsAt, appointments.timeZone)}</td><td className="text-xs text-muted-foreground"><bdi title={item.id}>{item.id.slice(0, 8)}</bdi></td><td><span className={`dashboard-badge whitespace-nowrap ${item.status === "IN_PROGRESS" || item.status === "QUEUED" ? "dashboard-badge-accent" : ""}`}>{appointmentLabels[item.status]}</span></td></tr>)}</tbody></table></div> : <div className="dashboard-empty"><CalendarDays className="mx-auto mb-3" size={28} strokeWidth={1.3} aria-hidden="true" /><p>برای امروز نوبتی ثبت نشده است.</p><Link href="/appointments" className="dashboard-button mt-4">مدیریت نوبت‌ها</Link></div>}
  </section>;
}

function RecentActivity({ report }: { report: DashboardHomeReporting }) {
  return <section className="dashboard-card" aria-labelledby="recent-activity-title"><div className="dashboard-card-head"><div><h2 id="recent-activity-title">فعالیت‌های اخیر</h2><p>رویدادهای ثبت‌شدهٔ نوبت‌ها</p></div><Activity size={19} className="text-muted-foreground" aria-hidden="true" /></div>
    {report.recentActivity.length ? <ol className="px-6 pb-2">{report.recentActivity.map((item, index) => <li key={item.id} className="relative flex gap-3 pb-5">
      {index < report.recentActivity.length - 1 && <span className="absolute bottom-0 start-4 top-8 w-px bg-border" aria-hidden="true" />}
      <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-muted-foreground"><Activity size={14} aria-hidden="true" /></span>
      <div className="min-w-0 pt-1"><p className="text-xs leading-6">{activityLabels[item.type] ?? "رویداد نوبت ثبت شد"}</p><p className="mt-1 text-[11px] text-muted-foreground">{localDate(item.createdAt, report.appointments.timeZone)} · {localTime(item.createdAt, report.appointments.timeZone)}</p></div>
    </li>)}</ol> : <div className="dashboard-empty"><Activity className="mx-auto mb-3" size={28} strokeWidth={1.3} aria-hidden="true" /><p>هنوز فعالیتی ثبت نشده است.</p></div>}
  </section>;
}

export function DashboardPage() {
  const { authentication } = useDashboardSession();
  const [state, setState] = useState<HomeViewState>({ status: "loading" });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const revenueReport = useRevenueReport(authentication.accessToken, refreshVersion);
  const refresh = () => setRefreshVersion(value => value + 1);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void loadDashboardHomeReporting(apiClient, authentication.accessToken).then(next => { if (active) setState(next); });
    return () => { active = false; };
  }, [authentication.accessToken, refreshVersion]);

  const report = state.status === "ready" ? state.report : null;
  return <div className="min-h-0 flex-1 overflow-y-auto"><div className="dashboard-home space-y-6">
    <section className="dashboard-enter flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={15} aria-hidden="true" />{report ? localDate(report.appointments.asOf, report.appointments.timeZone) : "مدیریت کلینیک"}</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">داشبورد</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">یک نگاه به امروز کلینیک و آنچه در سبز زندگی می‌گذرد.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={refresh} disabled={state.status === "loading"} className="dashboard-button"><RefreshCw size={16} aria-hidden="true" />تازه‌سازی</button><Link href="/appointments" className="dashboard-button dashboard-button-primary"><CalendarDays size={16} aria-hidden="true" />مدیریت نوبت‌ها</Link></div>
    </section>

    {state.status === "loading" ? <div className="dashboard-card p-6 text-sm text-muted-foreground" role="status">در حال دریافت وضعیت امروز کلینیک…</div> : !report ? <div className="dashboard-card flex flex-wrap items-center gap-3 p-6" role="alert">{state.status === "unauthorized" ? <ShieldAlert size={21} aria-hidden="true" /> : <AlertCircle size={21} aria-hidden="true" />}<div className="flex-1"><h2 className="text-sm font-semibold">{state.status === "unauthorized" ? "دسترسی به گزارش‌های داشبورد مجاز نیست." : "گزارش‌های امروز دریافت نشد."}</h2><p className="mt-1 text-xs text-muted-foreground">{state.status === "unauthorized" ? "برای بررسی مجوزها با مدیر سیستم تماس بگیرید." : "دوباره تلاش کنید؛ اطلاعات جایگزین نمایش داده نمی‌شود."}</p></div>{state.status !== "unauthorized" && <button className="dashboard-button" onClick={refresh}>تلاش دوباره</button>}</div> : <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground" role="status"><span className={`dashboard-badge ${report.sourceStatus !== "current" ? "dashboard-badge-accent" : ""}`}><span className="size-1.5 rounded-full bg-current" />{report.sourceStatus === "current" ? "گزارش امروز" : report.sourceStatus === "partial" ? "بخشی از داده‌ها در دسترس نیست" : "داده‌ها نیاز به به‌روزرسانی دارند"}</span><span>آخرین پاسخ {localTime(report.appointments.asOf, report.appointments.timeZone)}</span></div>
      <section aria-label="شاخص‌های امروز" className="dashboard-enter grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="نوبت‌های زمان‌بندی‌شده" value={p(report.appointments.scheduled)} sub="امروز" icon={CalendarDays} iconBg="" />
        <KpiCard title="بیماران جدید" value={p(report.patients.newPatients)} sub="ثبت‌شده در امروز" icon={UserPlus} iconBg="" />
        <KpiCard title="ارزیابی‌های تکمیل‌شده" value={p(report.assessments.completed)} sub="امروز" icon={ClipboardList} iconBg="" />
        <KpiCard title="درآمد عملیاتی امروز" value={toman(report.revenue.netRevenueToman)} sub="تومان، پس از بازپرداخت‌های تکمیل‌شده" icon={TrendingUp} iconBg="" />
      </section>
    </>}

    {state.status !== "unauthorized" && <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]"><RevenuePanel report={revenueReport} />{report ? <AppointmentOverview report={report} /> : <section className="dashboard-card"><div className="dashboard-card-head"><h2>وضعیت نوبت‌ها</h2></div><p className="dashboard-empty">{state.status === "loading" ? "در حال دریافت نوبت‌ها…" : "اطلاعات نوبت‌ها در دسترس نیست."}</p></section>}</div>}

    {report && <>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]"><TodayPlan report={report} /><RecentActivity report={report} /></div>
      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]"><PatientOverview report={report} /><section className="dashboard-card" aria-labelledby="clinical-overview-title"><div className="dashboard-card-head"><div><h2 id="clinical-overview-title">ارزیابی و مسیر درمان</h2><p>پیگیری ارزیابی‌ها و فعالیت‌های درمانی امروز</p></div><Link href="/prescriptions" className="dashboard-icon" aria-label="مشاهدهٔ نسخه‌ها و درمان"><ArrowUpLeft size={18} /></Link></div><dl className="grid grid-cols-2 gap-x-5 gap-y-7 px-6 pb-6 sm:grid-cols-3">
        <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><ClipboardList size={14} aria-hidden="true" />ارزیابی شروع‌شده</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{p(report.assessments.started)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">ارزیابی تکمیل‌شده</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{p(report.assessments.completed)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">برنامهٔ درمانی فعال</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{p(report.treatments.activePlans)}</dd></div>
        <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 size={14} aria-hidden="true" />فعالیت موعددار</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{p(report.treatments.dueTasks)}</dd></div>
        <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 size={14} aria-hidden="true" />فعالیت تکمیل‌شده</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{p(report.treatments.completedTasks)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">بازپرداخت در انتظار</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{p(report.revenue.refundPending)}</dd></div>
      </dl><div className="flex flex-wrap gap-2 border-t border-border px-6 py-4"><Link href="/assessments" className="dashboard-button"><ClipboardList size={15} aria-hidden="true" />ارزیابی‌ها</Link><Link href="/patients" className="dashboard-button"><Users size={15} aria-hidden="true" />پروندهٔ بیماران</Link></div></section></div>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 text-[11px] leading-6 text-muted-foreground"><p>سبز زندگی · داشبورد عملیاتی کلینیک</p><p>گزارش روزانه براساس زمان {report.appointments.timeZone}</p></footer>
    </>}
  </div></div>;
}
