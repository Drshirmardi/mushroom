"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardList, RefreshCw, ShieldAlert, TrendingUp, UserPlus } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { KpiCard } from "@/components/shared/kpi-card";
import { apiClient } from "@/lib/api";
import { loadDashboardHomeReporting, type DashboardHomeReportingState } from "@/lib/dashboard-home-reporting";
import { p } from "@/lib/utils";

type HomeViewState = DashboardHomeReportingState | { status: "loading" };

const formatAsOf = (asOf: string, timeZone: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(asOf));
const toman = (value: string) => `${BigInt(value).toLocaleString("fa-IR")} تومان`;

export function DashboardPage() {
  const { authentication } = useDashboardSession();
  const [state, setState] = useState<HomeViewState>({ status: "loading" });
  const refresh = useCallback(async () => { setState({ status: "loading" }); setState(await loadDashboardHomeReporting(apiClient, authentication.accessToken)); }, [authentication.accessToken]);

  useEffect(() => {
    let cancelled = false;
    void loadDashboardHomeReporting(apiClient, authentication.accessToken).then((next) => { if (!cancelled) setState(next); });
    return () => { cancelled = true; };
  }, [authentication.accessToken]);

  if (state.status === "loading") return <div className="flex-1 p-7 text-sm text-muted-foreground" role="status">در حال دریافت شاخص‌های عملیاتی…</div>;
  if (state.status === "unauthorized") return <div className="flex-1 p-7"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert"><div className="flex items-center gap-2 font-bold"><ShieldAlert size={18} /> دسترسی به گزارش‌های داشبورد مجاز نیست.</div><p className="mt-2 text-sm">بدون مجوز ADMIN هیچ مقدار یا فهرست جایگزینی نمایش داده نمی‌شود.</p></div></div>;
  if (state.status === "error") return <div className="flex-1 p-7"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900" role="alert"><div className="flex items-center gap-2 font-bold"><AlertCircle size={18} /> گزارش‌های داشبورد دریافت نشد.</div><button onClick={() => void refresh()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold shadow-sm hover:bg-red-100"><RefreshCw size={15} /> تلاش دوباره</button></div></div>;

  const { appointments, assessments, patients, recentActivity, revenue, sourceStatus, treatments } = state.report;
  const averageWait = typeof appointments.averageWaitMinutes === "number" ? `${p(appointments.averageWaitMinutes)} دقیقه` : "قابل محاسبه نیست";
  const sourceMessage = sourceStatus === "current" ? "منبع داده در زمان پاسخ جاری است." : sourceStatus === "partial" ? "بخشی از منبع داده در دسترس نیست؛ هیچ مقدار تخمینی نمایش داده نمی‌شود." : "منبع داده stale است؛ زمان آخرین پاسخ پایین‌تر نمایش داده شده است.";
  const sourceClass = sourceStatus === "current" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : sourceStatus === "partial" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900";

  return <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6"><div><h1 className="text-xl font-bold text-foreground">داشبورد عملیاتی کلینیک</h1><p className="mt-1 text-sm text-muted-foreground">فقط KPIهای inventory تأییدشده از APIهای مجاز و دادهٔ ثبت‌شده نمایش داده می‌شوند.</p><p className="mt-2 text-xs text-muted-foreground">آخرین پاسخ: {formatAsOf(appointments.asOf, appointments.timeZone)} · بازهٔ محلی: {appointments.from} تا {appointments.to}</p></div><div className={`rounded-2xl border p-4 text-sm ${sourceClass}`} role="status">{sourceMessage}</div><section className="space-y-4"><h2 className="text-lg font-bold text-foreground">بیماران</h2><div className="grid gap-4 md:grid-cols-3"><KpiCard title="بیماران جدید" value={p(patients.newPatients)} icon={UserPlus} iconBg="bg-blue-100 text-blue-600" /><KpiCard title="پرونده‌های تکمیل‌شده" value={p(patients.onboardingComplete)} icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-700" /><KpiCard title="پرونده‌های نیازمند تکمیل" value={p(patients.onboardingIncomplete)} icon={ClipboardList} iconBg="bg-amber-100 text-amber-700" /></div></section><section className="space-y-4"><h2 className="text-lg font-bold text-foreground">نوبت‌ها</h2><div className="grid gap-4 md:grid-cols-3"><KpiCard title="نوبت‌های زمان‌بندی‌شده" value={p(appointments.scheduled)} icon={CalendarDays} iconBg="bg-blue-100 text-blue-700" /><KpiCard title="نوبت‌های تکمیل‌شده" value={p(appointments.completed)} icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-700" /><KpiCard title="میانگین انتظار" value={averageWait} icon={RefreshCw} iconBg="bg-slate-100 text-slate-700" /></div><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-5"><h3 className="font-bold">برنامهٔ امروز</h3>{appointments.items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">برای امروز نوبتی ثبت نشده است.</p> : <ul className="mt-3 space-y-2 text-sm">{appointments.items.map((item) => <li key={item.id} className="flex justify-between border-b border-border pb-2"><span>{formatAsOf(item.startsAt, appointments.timeZone)}</span><span>{item.status}</span></li>)}</ul>}</div><div className="rounded-2xl border border-border bg-card p-5"><h3 className="font-bold">فعالیت عملیاتی اخیر</h3>{recentActivity.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">فعالیت عملیاتی ثبت نشده است.</p> : <ul className="mt-3 space-y-2 text-sm">{recentActivity.map((item) => <li key={item.id} className="border-b border-border pb-2"><p>{item.type.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{formatAsOf(item.createdAt, appointments.timeZone)}</p></li>)}</ul>}</div></div></section><section className="space-y-4"><h2 className="text-lg font-bold text-foreground">ارزیابی و درمان</h2><div className="grid gap-4 md:grid-cols-3"><KpiCard title="ارزیابی‌های تکمیل‌شده" value={p(assessments.completed)} icon={CheckCircle2} iconBg="bg-violet-100 text-violet-700" /><KpiCard title="وظایف درمانی موعددار" value={p(treatments.dueTasks)} icon={ClipboardList} iconBg="bg-blue-100 text-blue-700" /><KpiCard title="وظایف درمانی تکمیل‌شده" value={p(treatments.completedTasks)} icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-700" /></div></section><section className="space-y-4"><div><h2 className="text-lg font-bold text-foreground">تجارت</h2><p className="mt-1 text-sm text-muted-foreground">{revenue.revenueLabel}؛ فقط Payment تأییدشده و Refund تکمیل‌شده در TOMAN محاسبه می‌شوند و settlement تأییدشدهٔ Sadad نیست.</p></div><div className="grid gap-4 md:grid-cols-2"><KpiCard title="درآمد عملیاتی خالص" value={toman(revenue.netRevenueToman)} icon={TrendingUp} iconBg="bg-emerald-100 text-emerald-700" /><KpiCard title="بازپرداخت‌های در انتظار" value={p(revenue.refundPending)} icon={AlertCircle} iconBg="bg-amber-100 text-amber-700" /></div></section><button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><RefreshCw size={15} /> تازه‌سازی</button></div>;
}
