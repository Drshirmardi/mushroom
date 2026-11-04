"use client";
import { LoadingState } from "@/components/shared/skeletons";

import { useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { loadMedicalIntake, onboardingErrorMessage, type MedicalIntake } from "@/lib/onboarding/patient-onboarding";

const reportText = (value: unknown) => {
  if (!value || typeof value !== "object") return "پاسخ داده نشده";
  const report = value as { status?: unknown; items?: unknown };
  if (report.status === "NONE") return "ندارم";
  if (report.status === "UNKNOWN") return "نمی‌دانم";
  return Array.isArray(report.items) && report.items.every((item) => typeof item === "string") ? report.items.join("، ") || "گزارش بدون جزئیات" : "پاسخ داده نشده";
};

export default function MedicalProfilePage() {
  const router = useRouter(); const { authentication } = useAuthSession(); const [intake, setIntake] = useState<MedicalIntake | null>(null); const [attempt, setAttempt] = useState(0); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { void (async () => { try { const next = await loadMedicalIntake(authentication.accessToken); setIntake(next); setError(null); } catch (cause) { setError(onboardingErrorMessage(cause, "load")); } finally { setLoading(false); } })(); }, [authentication.accessToken, attempt]);
  const snapshot = intake?.snapshot;
  return <div><PageHeader title="پروفایل پزشکی" onBack={() => router.back()} /><div className="space-y-4 px-4 pb-4">{loading ? <LoadingState label="در حال دریافت اطلاعات خوداظهاری…" variant="form" /> : error ? <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" className="mt-2 min-h-11 font-bold" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>دریافت دوباره</button></div> : <><section className="rounded-2xl border border-border bg-white p-5"><FileText className="mb-3 text-primary" size={24} /><h1 className="text-base font-bold text-foreground">اطلاعات خوداظهاری</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">این موارد گزارش بیمار هستند و تشخیص، هشدار یا واقعیت بالینی تأییدشده نیستند.</p>{intake?.submissionState && <p className="mt-2 text-xs text-muted-foreground">نسخه فعلی: {intake.currentRevision} · {intake.submissionState === "COMPLETE" ? "تکمیل‌شده" : "پیش‌نویس"}</p>}</section>{snapshot && <section className="space-y-3 rounded-2xl border border-border bg-white p-5 text-sm"><p><strong>آلرژی‌ها:</strong> {reportText(snapshot.allergyReport)}</p><p><strong>بیماری‌های مزمن:</strong> {reportText(snapshot.chronicConditionReport)}</p><p><strong>داروهای مصرفی:</strong> {reportText(snapshot.currentMedicationReport)}</p></section>}<button type="button" onClick={() => router.push("/onboarding")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white">{snapshot ? "ویرایش اطلاعات خوداظهاری" : "تکمیل اطلاعات خوداظهاری"} <ArrowLeft size={16} /></button></>}</div></div>;
}
