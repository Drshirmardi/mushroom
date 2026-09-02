"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardList, RefreshCw, ShieldAlert, UserPlus } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { KpiCard } from "@/components/shared/kpi-card";
import { apiClient } from "@/lib/api";
import {
  loadDashboardOnboardingSummary,
  type DashboardOnboardingSummaryState,
} from "@/lib/dashboard-onboarding-summary";
import {
  loadDashboardAssessmentSummary,
  type DashboardAssessmentSummaryState,
} from "@/lib/dashboard-assessment-summary";
import { loadDirectorySettings, type DirectorySettingsState } from "@/lib/directory-settings-api";
import { projectDashboardScheduleReadiness } from "@/lib/dashboard-schedule-readiness";
import { dashboardAppointmentError, loadDashboardAppointmentSummary, type DashboardAppointmentSummary } from "@/lib/appointment-api";
import { p } from "@/lib/utils";

type SummaryViewState = DashboardOnboardingSummaryState | { status: "loading" };
type AssessmentViewState = DashboardAssessmentSummaryState | { status: "loading" };
type ScheduleViewState = DirectorySettingsState | { status: "loading" };
type AppointmentViewState = { status: "loading" } | { status: "ready"; summary: DashboardAppointmentSummary } | { status: "error"; message: string };

function formatAsOf(asOf: string, timeZone: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(asOf));
}

export function DashboardPage() {
  const { authentication } = useDashboardSession();
  const [state, setState] = useState<SummaryViewState>({ status: "loading" });
  const [assessmentState, setAssessmentState] = useState<AssessmentViewState>({ status: "loading" });
  const [scheduleState, setScheduleState] = useState<ScheduleViewState>({ status: "loading" });
  const [appointmentState, setAppointmentState] = useState<AppointmentViewState>({ status: "loading" });

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    setAssessmentState({ status: "loading" });
    setScheduleState({ status: "loading" });
    setAppointmentState({ status: "loading" });
    const [onboarding, assessment, schedule, appointments] = await Promise.all([
      loadDashboardOnboardingSummary(apiClient, authentication.accessToken),
      loadDashboardAssessmentSummary(apiClient, authentication.accessToken),
      loadDirectorySettings(apiClient, authentication.accessToken),
      loadDashboardAppointmentSummary(authentication.accessToken).then((summary) => ({ status: "ready" as const, summary })).catch((error) => ({ status: "error" as const, message: dashboardAppointmentError(error) })),
    ]);
    setState(onboarding);
    setAssessmentState(assessment);
    setScheduleState(schedule);
    setAppointmentState(appointments);
  }, [authentication.accessToken]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadDashboardOnboardingSummary(apiClient, authentication.accessToken),
      loadDashboardAssessmentSummary(apiClient, authentication.accessToken),
      loadDirectorySettings(apiClient, authentication.accessToken),
      loadDashboardAppointmentSummary(authentication.accessToken).then((summary) => ({ status: "ready" as const, summary })).catch((error) => ({ status: "error" as const, message: dashboardAppointmentError(error) })),
    ]).then(
      ([nextState, nextAssessmentState, nextScheduleState, nextAppointmentState]) => { if (!cancelled) { setState(nextState); setAssessmentState(nextAssessmentState); setScheduleState(nextScheduleState); setAppointmentState(nextAppointmentState); } },
    );
    return () => { cancelled = true; };
  }, [authentication.accessToken]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">نمای کلی بیماران</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          شاخص‌های onboarding فقط از داده‌های ثبت‌شدهٔ بیماران نمایش داده می‌شوند.
        </p>
      </div>

      {state.status === "loading" && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">
          در حال دریافت خلاصهٔ بیماران…
        </div>
      )}

      {state.status === "unauthorized" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert">
          <div className="flex items-center gap-2 font-bold"><ShieldAlert size={18} /> دسترسی به خلاصهٔ بیماران مجاز نیست.</div>
          <p className="mt-2 text-sm">برای مشاهدهٔ این اطلاعات، با یک حساب دارای مجوز مدیریت بیماران وارد شوید.</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900" role="alert">
          <div className="flex items-center gap-2 font-bold"><AlertCircle size={18} /> خلاصهٔ بیماران دریافت نشد.</div>
          <button onClick={() => void refresh()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold shadow-sm hover:bg-red-100">
            <RefreshCw size={15} /> تلاش دوباره
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard title="بیماران جدید امروز" value={p(state.summary.newPatientsToday)} icon={UserPlus} iconBg="bg-blue-100 text-blue-600" />
            <KpiCard title="پرونده‌های تکمیل‌شده" value={p(state.summary.onboardingCompletePatients)} icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-700" />
            <KpiCard title="پرونده‌های نیازمند تکمیل" value={p(state.summary.onboardingIncompletePatients)} icon={ClipboardList} iconBg="bg-amber-100 text-amber-700" />
          </div>
          <p className="text-xs text-muted-foreground">
            آخرین به‌روزرسانی: {formatAsOf(state.summary.asOf, state.summary.timeZone)}
          </p>
        </>
      )}

      <section className="space-y-4">
        <div><h2 className="text-lg font-bold text-foreground">عملیات نوبت‌های امروز</h2><p className="mt-1 text-sm text-muted-foreground">همهٔ شاخص‌ها و برنامه از زمان محلی کلینیک محاسبه می‌شوند.</p></div>
        {appointmentState.status === "loading" && <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground" role="status">در حال دریافت عملیات نوبت‌ها…</div>}
        {appointmentState.status === "error" && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900" role="alert">{appointmentState.message}<button onClick={() => void refresh()} className="mr-3 text-sm font-bold underline">تلاش دوباره</button></div>}
        {appointmentState.status === "ready" && <>
          <div className="grid gap-4 md:grid-cols-4"><KpiCard title="نوبت‌های امروز" value={p(appointmentState.summary.todayAppointments)} icon={CalendarDays} iconBg="bg-blue-100 text-blue-700" /><KpiCard title="حضوری / آنلاین" value={`${p(appointmentState.summary.inPersonAppointments)} / ${p(appointmentState.summary.onlineAppointments)}`} icon={CalendarDays} iconBg="bg-violet-100 text-violet-700" /><KpiCard title="درخواست‌های pending" value={p(appointmentState.summary.pendingRequests)} icon={ClipboardList} iconBg="bg-amber-100 text-amber-700" /><KpiCard title="تکمیل‌شده" value={p(appointmentState.summary.completed)} icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-700" /></div>
          <div className="grid gap-4 md:grid-cols-4"><KpiCard title="check-in" value={p(appointmentState.summary.checkedIn)} icon={UserPlus} iconBg="bg-blue-100 text-blue-700" /><KpiCard title="در صف" value={p(appointmentState.summary.queued)} icon={ClipboardList} iconBg="bg-amber-100 text-amber-700" /><KpiCard title="در حال ویزیت" value={p(appointmentState.summary.inProgress)} icon={CalendarDays} iconBg="bg-violet-100 text-violet-700" /><KpiCard title="میانگین انتظار" value={appointmentState.summary.averageWaitMinutes === null ? "—" : `${p(appointmentState.summary.averageWaitMinutes)} دقیقه`} icon={RefreshCw} iconBg="bg-slate-100 text-slate-700" /></div>
          <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-5"><h3 className="font-bold">برنامهٔ امروز</h3>{appointmentState.summary.todayPlan.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">برای امروز نوبتی ثبت نشده است.</p> : <ul className="mt-3 space-y-2 text-sm">{appointmentState.summary.todayPlan.map((item) => <li key={item.id} className="flex justify-between border-b border-border pb-2"><span>{formatAsOf(item.startsAt, appointmentState.summary.timeZone)}</span><span>{item.visitMode === "IN_PERSON" ? "حضوری" : "آنلاین"} · {item.status}</span></li>)}</ul>}</div><div className="rounded-2xl border border-border bg-card p-5"><h3 className="font-bold">فعالیت اخیر رزرو</h3>{appointmentState.summary.recentAppointmentActivity.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">فعالیت رزرو ثبت نشده است.</p> : <ul className="mt-3 space-y-2 text-sm">{appointmentState.summary.recentAppointmentActivity.map((item) => <li key={item.id} className="border-b border-border pb-2"><p>{item.type.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{formatAsOf(item.createdAt, appointmentState.summary.timeZone)}</p></li>)}</ul>}</div></div>
        </>}
      </section>

      {assessmentState.status === "loading" && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">
          در حال دریافت وضعیت ارزیابی‌ها…
        </div>
      )}

      {assessmentState.status === "unauthorized" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900" role="alert">
          دسترسی به وضعیت ارزیابی‌ها مجاز نیست.
        </div>
      )}

      {assessmentState.status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900" role="alert">
          <div className="flex items-center gap-2 font-bold"><AlertCircle size={18} /> وضعیت ارزیابی‌ها دریافت نشد.</div>
          <button onClick={() => void refresh()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold shadow-sm hover:bg-red-100">
            <RefreshCw size={15} /> تلاش دوباره
          </button>
        </div>
      )}

      {assessmentState.status === "ready" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">وضعیت ارزیابی‌ها</h2>
            <p className="mt-1 text-sm text-muted-foreground">مقادیر فقط از submissionهای ثبت‌شده محاسبه می‌شوند.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <KpiCard title="ارزیابی‌های تکمیل‌شده" value={p(assessmentState.summary.completed)} icon={CheckCircle2} iconBg="bg-violet-100 text-violet-700" />
            <KpiCard title="ارزیابی‌های در انتظار" value={p(assessmentState.summary.pending)} icon={ClipboardList} iconBg="bg-amber-100 text-amber-700" />
          </div>
          {assessmentState.summary.recentActivity.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-bold text-foreground">فعالیت اخیر ارزیابی‌ها</h3>
              <ul className="mt-3 space-y-3">
                {assessmentState.summary.recentActivity.map((activity) => (
                  <li key={activity.id} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-violet-600" size={17} />
                    <div>
                      <p className="text-foreground">ارزیابی «{activity.assessmentTitle}» تکمیل شد</p>
                      <p className="text-xs text-muted-foreground">{formatAsOf(activity.completedAt!, "Asia/Tehran")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div><h2 className="text-lg font-bold text-foreground">آمادگی برنامهٔ کاری</h2><p className="mt-1 text-sm text-muted-foreground">فقط offeringها و قواعد کاری ذخیره‌شده نمایش داده می‌شوند؛ ظرفیت یا نوبت ساختگی نیست.</p></div>
        {scheduleState.status === "loading" && <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground" role="status">در حال دریافت برنامهٔ کاری…</div>}
        {scheduleState.status === "unauthorized" && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900" role="alert">دسترسی به برنامهٔ کاری مجاز نیست.</div>}
        {scheduleState.status === "unavailable" && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900" role="alert">برنامهٔ کاری در دسترس نیست؛ مقداری جایگزین نمایش داده نمی‌شود.</div>}
        {scheduleState.status === "error" && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900" role="alert">دریافت برنامهٔ کاری ناموفق بود.<button onClick={() => void refresh()} className="mr-3 text-sm font-bold underline">تلاش دوباره</button></div>}
        {scheduleState.status === "ready" && (() => { const readiness = projectDashboardScheduleReadiness(scheduleState.data); return <div className="grid gap-4 md:grid-cols-3"><KpiCard title="ارائه‌های منتشرشده" value={p(readiness.activeOfferings)} icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-700" /><KpiCard title="قواعد کاری فعال" value={p(readiness.activeRules)} icon={ClipboardList} iconBg="bg-blue-100 text-blue-700" /><div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm font-bold">برنامهٔ روز بعد</p><p className="mt-2 text-2xl font-bold">{p(readiness.nextDayRuleCount)}</p><p className="mt-1 text-xs text-muted-foreground">قاعدهٔ فعال برای روز {p(readiness.nextDayIsoWeekday)} در {readiness.timeZone}</p></div></div>; })()}
      </section>
    </div>
  );
}
