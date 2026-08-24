"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardList, RefreshCw, ShieldAlert, UserPlus } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { KpiCard } from "@/components/shared/kpi-card";
import { apiClient } from "@/lib/api";
import {
  loadDashboardOnboardingSummary,
  type DashboardOnboardingSummaryState,
} from "@/lib/dashboard-onboarding-summary";
import { p } from "@/lib/utils";

type SummaryViewState = DashboardOnboardingSummaryState | { status: "loading" };

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

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    setState(await loadDashboardOnboardingSummary(apiClient, authentication.accessToken));
  }, [authentication.accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    </div>
  );
}
