"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { Avatar, SectionCard, StatusBadge } from "@/components/shared";
import { getAdminPatient, getAdminPatientAssessmentSubmissions, PatientApiError, type AdminAssessmentSubmissionList, type AdminPatientDetail } from "@/lib/patient-api";

const TABS = [{ id: "overview", label: "اطلاعات کلی" }, { id: "medical", label: "اطلاعات خوداظهاری" }, { id: "assessments", label: "ارزیابی‌ها" }] as const;
const BLOOD_TYPES: Record<string, string> = { A_POSITIVE: "A+", A_NEGATIVE: "A-", B_POSITIVE: "B+", B_NEGATIVE: "B-", AB_POSITIVE: "AB+", AB_NEGATIVE: "AB-", O_POSITIVE: "O+", O_NEGATIVE: "O-", UNKNOWN: "نامشخص" };
const SEXES: Record<string, string> = { FEMALE: "زن", MALE: "مرد", INTERSEX: "اینترسکس", UNKNOWN: "نامشخص", PREFER_NOT_TO_SAY: "ترجیح می‌دهم نگویم" };

function display(value: unknown, fallback = "ثبت نشده") { return value == null || value === "" ? fallback : String(value); }
function initial(name: unknown) { const value = typeof name === "string" ? name.trim() : ""; return value ? value.slice(0, 1) : "ب"; }
function declaration(report: { status: "NONE" | "UNKNOWN" | "PRESENT"; items: string[] } | null | undefined) {
  if (!report) return "ثبت نشده";
  if (report.status === "NONE") return "ندارد";
  if (report.status === "UNKNOWN") return "نمی‌دانم";
  return report.items.length ? report.items.join("، ") : "گزارش شده";
}

export function PatientWorkspace({ patientId }: { patientId: string }) {
  const router = useRouter();
  const { authentication } = useDashboardSession();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [patient, setPatient] = useState<AdminPatientDetail | null>(null);
  const [error, setError] = useState<PatientApiError | null>(null);
  const [assessments, setAssessments] = useState<AdminAssessmentSubmissionList | null>(null);
  const [assessmentError, setAssessmentError] = useState<PatientApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAdminPatient(authentication.accessToken, patientId).then(
      (data) => { if (!cancelled) setPatient(data); },
      (reason: unknown) => { if (!cancelled) setError(reason instanceof PatientApiError ? reason : new PatientApiError(0)); },
    );
    return () => { cancelled = true; };
  }, [authentication.accessToken, patientId]);

  useEffect(() => {
    let cancelled = false;
    void getAdminPatientAssessmentSubmissions(authentication.accessToken, patientId).then(
      (data) => { if (!cancelled) setAssessments(data); },
      (reason: unknown) => { if (!cancelled) setAssessmentError(reason instanceof PatientApiError ? reason : new PatientApiError(0)); },
    );
    return () => { cancelled = true; };
  }, [authentication.accessToken, patientId]);

  if (!patient && !error) return <div className="p-7 text-sm text-muted-foreground">در حال دریافت پرونده بیمار…</div>;
  if (error?.status === 401 || error?.status === 403) return <Notice tone="amber">اجازهٔ مشاهدهٔ این پرونده را ندارید.</Notice>;
  if (error?.status === 404) return <Notice>پروندهٔ بیمار پیدا نشد.</Notice>;
  if (!patient) return <Notice tone="red">دریافت پرونده بیمار ممکن نشد. صفحه را دوباره بارگذاری کنید.</Notice>;

  const intake = patient.intake.value;
  const medicalAvailable = patient.intake.status === "AVAILABLE" && intake;
  const profile = patient.profile;
  const name = display(profile.displayName, "بدون نام");
  const basicRows = [["نام کامل", name], ["شماره همراه", profile.phone], ["ایمیل", display(profile.email)], ["شهر", display(profile.cityName)], ["وضعیت حساب", profile.accountStatus === "ACTIVE" ? "فعال" : "غیرفعال"]];
  const intakeRows = medicalAvailable ? [["تاریخ تولد", display(intake.birthDate)], ["جنسیت", intake.sexAtBirth ? SEXES[intake.sexAtBirth] : "ثبت نشده"], ["قد", intake.heightCm == null ? "ثبت نشده" : `${String(intake.heightCm)} سانتی‌متر`], ["وزن", intake.weightKg == null ? "ثبت نشده" : `${String(intake.weightKg)} کیلوگرم`], ["گروه خونی", intake.bloodType ? BLOOD_TYPES[intake.bloodType] : "ثبت نشده"]] : [];
  const reportRows = medicalAvailable ? [["آلرژی‌ها", declaration(intake.allergyReport)], ["بیماری‌های مزمن", declaration(intake.chronicConditionReport)], ["داروهای جاری", declaration(intake.currentMedicationReport)]] : [];

  return <div className="flex-1 min-h-0 flex flex-col">
    <div className="px-7 pt-5 pb-4 border-b border-border bg-card flex-shrink-0">
      <button onClick={() => router.push("/patients")} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-4"><ChevronLeft size={14} />بازگشت به لیست</button>
      <div className="flex items-start gap-5"><Avatar letter={initial(profile.displayName)} size="lg" /><div className="flex-1"><div className="flex items-center gap-3 mb-1"><h2 className="text-xl font-bold">{name}</h2><StatusBadge status={profile.accountStatus === "ACTIVE" ? "فعال" : "غیرفعال"} /></div><p className="text-sm text-muted-foreground">{profile.phone}</p><p className="mt-2 text-xs text-muted-foreground">پروندهٔ پزشکی اولیه: {patient.intake.status === "AVAILABLE" ? "دادهٔ خوداظهاری ثبت شده" : patient.intake.status === "CONSENT_REQUIRED" ? "دسترسی منوط به رضایت فعال است" : "هنوز ثبت نشده"}</p></div></div>
    </div>
    <div className="border-b border-border bg-card flex-shrink-0"><div className="flex px-7">{TABS.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`px-4 py-3 text-xs font-semibold border-b-2 ${tab === item.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}</div></div>
    <div className="flex-1 overflow-y-auto p-7">
      {tab === "overview" && <div className="grid max-w-3xl grid-cols-1 gap-6 lg:grid-cols-2"><SectionCard title="اطلاعات تماس و حساب"><Rows rows={basicRows} /></SectionCard><SectionCard title="وضعیت onboarding"><div className="space-y-3 text-sm"><p>رضایت فعال: <span className="font-semibold">{patient.consent.active ? "دارد" : "ندارد"}</span></p><p>وضعیت intake: <span className="font-semibold">{patient.intake.status === "AVAILABLE" ? "قابل مشاهده" : patient.intake.status === "CONSENT_REQUIRED" ? "نیازمند رضایت" : "ثبت نشده"}</span></p><p className="text-xs leading-6 text-muted-foreground">هر اطلاعات پزشکی موجود در این صفحه توسط خود بیمار گزارش شده است و تشخیص یا واقعیت بالینی تأییدشده محسوب نمی‌شود.</p></div></SectionCard></div>}
      {tab === "medical" && (medicalAvailable ? <div className="space-y-5"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>دادهٔ خوداظهاری بیمار</strong><p className="mt-1 text-xs leading-6">این اطلاعات به‌صورت خوداظهاری ثبت شده‌اند و نباید به‌عنوان تشخیص، تأیید پزشکی یا ادعای بالینی تفسیر شوند.</p></div><div className="grid max-w-3xl grid-cols-1 gap-5 lg:grid-cols-2"><SectionCard title="اطلاعات پایه"><Rows rows={intakeRows} /></SectionCard><SectionCard title="گزارش‌های خوداظهاری"><Rows rows={reportRows} /></SectionCard></div></div> : <EmptyMedical status={patient.intake.status} />)}
      {tab === "assessments" && <PatientAssessments assessments={assessments} error={assessmentError} />}
    </div>
  </div>;
}

function Rows({ rows }: { rows: string[][] }) { return <div className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex gap-3 text-sm"><span className="w-32 flex-shrink-0 text-muted-foreground">{label}:</span><span className="font-medium">{value}</span></div>)}</div>; }
function Notice({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "amber" | "red" }) { const color = tone === "red" ? "border-red-200 bg-red-50 text-red-700" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-border bg-card text-muted-foreground"; return <div className={`m-7 rounded-xl border p-4 text-sm ${color}`}>{children}</div>; }
function EmptyMedical({ status }: { status: AdminPatientDetail["intake"]["status"] }) { const message = status === "CONSENT_REQUIRED" ? "برای مشاهدهٔ دادهٔ خوداظهاری، رضایت فعال بیمار لازم است." : "هنوز دادهٔ پزشکی اولیه برای این بیمار ثبت نشده است."; return <div className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center"><FileText size={36} className="mx-auto mb-3 text-muted-foreground/40" /><p className="text-sm font-medium">{message}</p><p className="mt-2 text-xs text-muted-foreground">در این بخش هیچ دادهٔ ساختگی یا ادعای بالینی نمایش داده نمی‌شود.</p></div>; }
function PatientAssessments({ assessments, error }: { assessments: AdminAssessmentSubmissionList | null; error: PatientApiError | null }) {
  if (!assessments && !error) return <p className="text-sm text-muted-foreground">در حال دریافت ارزیابی‌های بیمار…</p>;
  if (error?.status === 401 || error?.status === 403) return <Notice tone="amber">اجازهٔ مشاهدهٔ ارزیابی‌های این بیمار را ندارید.</Notice>;
  if (error) return <Notice tone="red">دریافت ارزیابی‌های بیمار ممکن نشد. صفحه را دوباره بارگذاری کنید.</Notice>;
  if (!assessments || assessments.items.length === 0) return <div className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center"><FileText size={36} className="mx-auto mb-3 text-muted-foreground/40" /><p className="text-sm font-medium">هنوز هیچ ارزیابی‌ای برای این بیمار ارسال نشده است.</p></div>;
  return <div className="max-w-3xl space-y-4">{assessments.items.map((assessment) => { const snapshot = assessment.resultSnapshot; const band = snapshot && typeof snapshot.resultBand === "string" ? snapshot.resultBand : null; return <SectionCard key={assessment.id} title={assessment.assessmentTitle}><Rows rows={[["وضعیت", assessmentState(assessment.state)], ["تلاش", String(assessment.attemptNumber)], ["امتیاز", assessment.score ?? "ثبت نشده"], ["نتیجه", band ?? "ثبت نشده"], ["تاریخ تکمیل", assessment.completedAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(assessment.completedAt)) : "ثبت نشده"]]} /></SectionCard>; })}</div>;
}
function assessmentState(state: "IN_PROGRESS" | "COMPLETE" | "INVALIDATED") { return state === "COMPLETE" ? "تکمیل‌شده" : state === "IN_PROGRESS" ? "در حال تکمیل" : "نامعتبر"; }
