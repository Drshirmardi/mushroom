"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { Avatar, SectionCard, StatusBadge } from "@/components/shared";
import { getAdminPatient, getAdminPatientAssessmentSubmissions, getAssessmentResultBandTitle, PatientApiError, type AdminAssessmentSubmissionList, type AdminPatientDetail } from "@/lib/patient-api";
import { ClinicalWorkspaceApiError, createClinicalNote, getClinicalWorkspace, publishClinicalNote, reconcileClinicalRecord, saveClinicalNote, saveClinicalRecord, signClinicalNote, signClinicalRecord, type ClinicalRecordKind, type ClinicalWorkspace } from "@/lib/clinical-workspace-api";
import { listAdminAppointments, type AdminAppointment, type AppointmentApiError } from "@/lib/appointment-api";
import { getTreatmentProgress, listPrescriptions, listTreatmentPlans, PrescriptionTreatmentApiError, type Prescription, type TreatmentPlanSummary, type TreatmentProgress } from "@/lib/prescription-treatment-api";

const TABS = [{ id: "overview", label: "اطلاعات کلی" }, { id: "medical", label: "اطلاعات پزشکی" }, { id: "history", label: "تاریخچه بالینی" }, { id: "treatment", label: "نسخه و درمان" }, { id: "appointments", label: "نوبت‌ها" }, { id: "assessments", label: "ارزیابی‌ها" }, { id: "traditional", label: "طب سنتی" }, { id: "timeline", label: "خط زمانی" }] as const;
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
  const [clinical, setClinical] = useState<ClinicalWorkspace | null>(null);
  const [clinicalError, setClinicalError] = useState<ClinicalWorkspaceApiError | null>(null);
  const [appointments, setAppointments] = useState<AdminAppointment[] | null>(null);
  const [appointmentError, setAppointmentError] = useState<AppointmentApiError | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null);
  const [plans, setPlans] = useState<TreatmentPlanSummary[] | null>(null);
  const [treatmentError, setTreatmentError] = useState<PrescriptionTreatmentApiError | null>(null);
  const [progress, setProgress] = useState<Record<string, TreatmentProgress>>({});

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
    void (async () => {
      try {
        const [prescriptionData, planData] = await Promise.all([listPrescriptions(authentication.accessToken, patientId), listTreatmentPlans(authentication.accessToken, patientId)]);
        const values = await Promise.all(planData.items.map(async (plan) => [plan.id, await getTreatmentProgress(authentication.accessToken, patientId, plan.id)] as const));
        if (!cancelled) { setPrescriptions(prescriptionData.items); setPlans(planData.items); setProgress(Object.fromEntries(values)); }
      } catch (reason) { if (!cancelled) setTreatmentError(reason instanceof PrescriptionTreatmentApiError ? reason : new PrescriptionTreatmentApiError(0)); }
    })();
    return () => { cancelled = true; };
  }, [authentication.accessToken, patientId]);

  useEffect(() => {
    let cancelled = false;
    void getClinicalWorkspace(authentication.accessToken, patientId).then(
      (data) => { if (!cancelled) setClinical(data); },
      (reason: unknown) => { if (!cancelled) setClinicalError(reason instanceof ClinicalWorkspaceApiError ? reason : new ClinicalWorkspaceApiError(0)); },
    );
    return () => { cancelled = true; };
  }, [authentication.accessToken, patientId]);

  useEffect(() => {
    let cancelled = false;
    void listAdminAppointments(authentication.accessToken, { patientId }).then(
      (data) => { if (!cancelled) setAppointments(data.items); },
      (reason: unknown) => { if (!cancelled) setAppointmentError(reason as AppointmentApiError); },
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
      {tab === "medical" && <ClinicalRecords clinical={clinical} error={clinicalError} accessToken={authentication.accessToken} patientId={patientId} onChanged={setClinical} />}
      {tab === "history" && <ClinicalNotes clinical={clinical} error={clinicalError} accessToken={authentication.accessToken} patientId={patientId} onChanged={setClinical} />}
      {tab === "treatment" && <TreatmentSummary prescriptions={prescriptions} plans={plans} progress={progress} error={treatmentError} onOpenBuilder={() => router.push(`/prescriptions?patientId=${encodeURIComponent(patientId)}`)} />}
      {tab === "appointments" && <PatientAppointments appointments={appointments} error={appointmentError} />}
      {tab === "assessments" && <PatientAssessments assessments={assessments} error={assessmentError} />}
      {tab === "traditional" && <TraditionalMedicine />}
      {tab === "timeline" && <ClinicalTimeline clinical={clinical} error={clinicalError} />}
    </div>
  </div>;
}

function Rows({ rows }: { rows: string[][] }) { return <div className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex gap-3 text-sm"><span className="w-32 flex-shrink-0 text-muted-foreground">{label}:</span><span className="font-medium">{value}</span></div>)}</div>; }
function TreatmentSummary({ prescriptions, plans, progress, error, onOpenBuilder }: { prescriptions: Prescription[] | null; plans: TreatmentPlanSummary[] | null; progress: Record<string, TreatmentProgress>; error: PrescriptionTreatmentApiError | null; onOpenBuilder: () => void }) {
  if (error?.status === 401 || error?.status === 403) return <Notice tone="amber">اجازهٔ مشاهدهٔ نسخه یا درمان این بیمار را ندارید.</Notice>;
  if (error) return <Notice tone="red">دریافت اطلاعات درمان ممکن نشد. دادهٔ ساختگی نمایش داده نمی‌شود.</Notice>;
  if (!prescriptions || !plans) return <p className="text-sm text-muted-foreground">در حال دریافت نسخه و برنامهٔ درمان…</p>;
  return <div className="max-w-4xl space-y-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">نسخه و برنامهٔ درمان</h3><p className="mt-1 text-xs text-muted-foreground">این داده‌ها از پروندهٔ درمان واقعی بیمار خوانده می‌شوند.</p></div><button onClick={onOpenBuilder} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">باز کردن نسخه‌ساز</button></div><SectionCard title="نسخه‌ها">{prescriptions.length === 0 ? <p className="text-sm text-muted-foreground">هنوز نسخه‌ای برای این بیمار ثبت نشده است.</p> : <div className="space-y-3">{prescriptions.map((prescription) => <div key={prescription.id} className="rounded-lg border border-border p-3 text-sm"><div className="flex justify-between"><strong>نسخه {prescription.currentRevision}</strong><span className="text-muted-foreground">{prescription.revision?.state === "ISSUED" ? "صادرشده" : "پیش‌نویس"}</span></div><p className="mt-2 text-xs text-muted-foreground">{prescription.revision?.items.map((item) => item.medicationName).join("، ") || "بدون قلم دارو"}</p></div>)}</div>}</SectionCard><SectionCard title="برنامه‌های درمان">{plans.length === 0 ? <p className="text-sm text-muted-foreground">هنوز برنامهٔ درمانی ثبت نشده است.</p> : <div className="space-y-3">{plans.map((plan) => <div key={plan.id} className="rounded-lg border border-border p-3"><div className="flex justify-between text-sm"><strong>{plan.title ?? "برنامهٔ درمان"}</strong><span className="text-muted-foreground">{progress[plan.id]?.percentage ?? 0}٪</span></div><p className="mt-2 text-xs text-muted-foreground">{progress[plan.id] ? `${progress[plan.id].completedTasks} از ${progress[plan.id].totalTasks} فعالیت انجام شده` : "پیشرفت قابل دریافت نیست"}</p></div>)}</div>}</SectionCard></div>;
}
function Notice({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "amber" | "red" }) { const color = tone === "red" ? "border-red-200 bg-red-50 text-red-700" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-border bg-card text-muted-foreground"; return <div className={`m-7 rounded-xl border p-4 text-sm ${color}`}>{children}</div>; }
function EmptyMedical({ status }: { status: AdminPatientDetail["intake"]["status"] }) { const message = status === "CONSENT_REQUIRED" ? "برای مشاهدهٔ دادهٔ خوداظهاری، رضایت فعال بیمار لازم است." : "هنوز دادهٔ پزشکی اولیه برای این بیمار ثبت نشده است."; return <div className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center"><FileText size={36} className="mx-auto mb-3 text-muted-foreground/40" /><p className="text-sm font-medium">{message}</p><p className="mt-2 text-xs text-muted-foreground">در این بخش هیچ دادهٔ ساختگی یا ادعای بالینی نمایش داده نمی‌شود.</p></div>; }
function PatientAssessments({ assessments, error }: { assessments: AdminAssessmentSubmissionList | null; error: PatientApiError | null }) {
  if (!assessments && !error) return <p className="text-sm text-muted-foreground">در حال دریافت ارزیابی‌های بیمار…</p>;
  if (error?.status === 401 || error?.status === 403) return <Notice tone="amber">اجازهٔ مشاهدهٔ ارزیابی‌های این بیمار را ندارید.</Notice>;
  if (error) return <Notice tone="red">دریافت ارزیابی‌های بیمار ممکن نشد. صفحه را دوباره بارگذاری کنید.</Notice>;
  if (!assessments || assessments.items.length === 0) return <div className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center"><FileText size={36} className="mx-auto mb-3 text-muted-foreground/40" /><p className="text-sm font-medium">هنوز هیچ ارزیابی‌ای برای این بیمار ارسال نشده است.</p></div>;
  return <div className="max-w-3xl space-y-4">{assessments.items.map((assessment) => { const band = getAssessmentResultBandTitle(assessment.resultSnapshot); return <SectionCard key={assessment.id} title={assessment.assessmentTitle}><Rows rows={[["وضعیت", assessmentState(assessment.state)], ["تلاش", String(assessment.attemptNumber)], ["امتیاز", assessment.score ?? "ثبت نشده"], ["نتیجه", band ?? "ثبت نشده"], ["تاریخ تکمیل", assessment.completedAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(assessment.completedAt)) : "ثبت نشده"]]} /></SectionCard>; })}</div>;
}
function assessmentState(state: "IN_PROGRESS" | "COMPLETE" | "INVALIDATED") { return state === "COMPLETE" ? "تکمیل‌شده" : state === "IN_PROGRESS" ? "در حال تکمیل" : "نامعتبر"; }

function ClinicalNotice({ error }: { error: ClinicalWorkspaceApiError | null }) {
  if (!error) return null;
  if (error.status === 401 || error.status === 403) return <Notice tone="amber">اجازهٔ دسترسی بالینی این بیمار را ندارید.</Notice>;
  return <Notice tone="red">دریافت یا ذخیرهٔ پروندهٔ بالینی ممکن نشد. دادهٔ ساختگی نمایش داده نمی‌شود.</Notice>;
}

function ClinicalRecords({ clinical, error, accessToken, patientId, onChanged }: { clinical: ClinicalWorkspace | null; error: ClinicalWorkspaceApiError | null; accessToken: string; patientId: string; onChanged: (value: ClinicalWorkspace) => void }) {
  const [kind, setKind] = useState<ClinicalRecordKind>("DIAGNOSIS");
  const [content, setContent] = useState('{\n  "label": ""\n}');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const refresh = async () => onChanged(await getClinicalWorkspace(accessToken, patientId));
  const create = async () => {
    if (!clinical?.intakeSource) return;
    try {
      const reviewedContent = JSON.parse(content) as Record<string, unknown>;
      setBusy(true); setMessage(null);
      await reconcileClinicalRecord(accessToken, patientId, { kind, encounterId: clinical.encounters[0]?.id, sourceIntakeId: clinical.intakeSource.intakeId, sourceIntakeRevisionId: clinical.intakeSource.revisionId, sourceIntakeRevisionNumber: clinical.intakeSource.revisionNumber, reviewedContent });
      await refresh(); setMessage("رکورد بالینی بازبینی‌شده ذخیره شد.");
    } catch { setMessage("ذخیره نشد؛ ساختار JSON و دسترسی بالینی را بررسی کنید."); } finally { setBusy(false); }
  };
  if (!clinical && !error) return <p className="text-sm text-muted-foreground">در حال دریافت اطلاعات بالینی…</p>;
  if (error) return <ClinicalNotice error={error} />;
  if (!clinical) return null;
  return <div className="mt-5 max-w-4xl space-y-4"><SectionCard title="رکوردهای بالینی بازبینی‌شده"><p className="mb-4 text-xs leading-6 text-muted-foreground">اطلاعات خوداظهاری پایین‌تر از این خط، واقعیت بالینی نیستند. ایجاد هر رکورد از نسخهٔ intake مشخص و با مجوز بالینی انجام می‌شود.</p>{clinical.records.length === 0 ? <p className="text-sm text-muted-foreground">هنوز رکورد بالینی بازبینی‌شده‌ای ثبت نشده است.</p> : <div className="space-y-3">{clinical.records.map((record) => <ClinicalRecordEditor key={record.id} record={record} accessToken={accessToken} patientId={patientId} onChanged={refresh} />)}</div>}</SectionCard>{clinical.intakeSource && <SectionCard title="افزودن رکورد بازبینی‌شده"><div className="grid gap-3"><select value={kind} onChange={(event) => setKind(event.target.value as ClinicalRecordKind)} className="rounded-lg border border-border bg-card p-2 text-sm"><option value="DIAGNOSIS">تشخیص</option><option value="ALLERGY">آلرژی</option><option value="CONDITION">بیماری/وضعیت</option><option value="MEDICATION_STATEMENT">داروی جاری</option></select><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} aria-label="محتوای بازبینی‌شده" className="rounded-lg border border-border bg-card p-3 font-mono text-xs" /><button onClick={() => void create()} disabled={busy} className="w-fit rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{busy ? "در حال ذخیره…" : "ایجاد رکورد بازبینی‌شده"}</button>{message && <p className="text-xs text-muted-foreground">{message}</p>}</div></SectionCard>}</div>;
}

function ClinicalRecordEditor({ record, accessToken, patientId, onChanged }: { record: ClinicalWorkspace["records"][number]; accessToken: string; patientId: string; onChanged: () => Promise<void> }) {
  const [content, setContent] = useState(JSON.stringify(record.revision?.content ?? {}, null, 2));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const current = record.revision;
  const save = async () => { if (!current) return; try { setBusy(true); await saveClinicalRecord(accessToken, patientId, record.kind, record.id, { expectedRevision: record.currentRevision, reviewedContent: JSON.parse(content), amendmentReasonCategory: reason || null }); await onChanged(); } finally { setBusy(false); } };
  const sign = async () => { if (!current) return; try { setBusy(true); await signClinicalRecord(accessToken, patientId, record.kind, record.id, record.currentRevision, record.currentRevision); await onChanged(); } finally { setBusy(false); } };
  return <div className="rounded-xl border border-border p-4"><div className="mb-2 flex items-center justify-between"><strong className="text-sm">{record.kind}</strong><span className="text-xs text-muted-foreground">نسخه {record.currentRevision} · {current?.state ?? "نامشخص"}</span></div><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} className="w-full rounded-lg border border-border bg-card p-2 font-mono text-xs" />{current?.state === "SIGNED" && <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="دسته‌بندی دلیل اصلاح" className="mt-2 w-full rounded-lg border border-border bg-card p-2 text-xs" />}<div className="mt-3 flex gap-2"><button onClick={() => void save()} disabled={busy} className="rounded-lg border border-primary px-3 py-1.5 text-xs text-primary disabled:opacity-50">ذخیره نسخه جدید</button>{current?.state === "DRAFT" && <button onClick={() => void sign()} disabled={busy} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">امضا</button>}</div></div>;
}

function ClinicalNotes({ clinical, error, accessToken, patientId, onChanged }: { clinical: ClinicalWorkspace | null; error: ClinicalWorkspaceApiError | null; accessToken: string; patientId: string; onChanged: (value: ClinicalWorkspace) => void }) {
  const [content, setContent] = useState(""); const [summary, setSummary] = useState(""); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const refresh = async () => onChanged(await getClinicalWorkspace(accessToken, patientId));
  const create = async () => { const encounter = clinical?.encounters[0]; if (!encounter || !content.trim()) return; try { setBusy(true); await createClinicalNote(accessToken, patientId, encounter.id, { expectedRevision: 0, content, isPrivate: true, patientSummary: summary || null }); await refresh(); setContent(""); setSummary(""); } catch { setMessage("ایجاد یادداشت ممکن نشد."); } finally { setBusy(false); } };
  if (!clinical && !error) return <p className="text-sm text-muted-foreground">در حال دریافت تاریخچه بالینی…</p>;
  if (error) return <ClinicalNotice error={error} />;
  if (!clinical) return null;
  return <div className="max-w-4xl space-y-4"><SectionCard title="یادداشت‌های بالینی کنترل‌شده">{clinical.notes.length === 0 ? <p className="text-sm text-muted-foreground">یادداشتی ثبت نشده است.</p> : <div className="space-y-3">{clinical.notes.map((note) => <ClinicalNoteEditor key={note.id} note={note} accessToken={accessToken} patientId={patientId} onChanged={refresh} />)}</div>}</SectionCard>{clinical.encounters.length > 0 && <SectionCard title="ایجاد یادداشت برای آخرین ویزیت"><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} placeholder="یادداشت خصوصی پزشک" className="w-full rounded-lg border border-border bg-card p-3 text-sm" /><textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} placeholder="خلاصهٔ قابل انتشار برای بیمار (اختیاری)" className="mt-3 w-full rounded-lg border border-border bg-card p-3 text-sm" /><button onClick={() => void create()} disabled={busy || !content.trim()} className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{busy ? "در حال ذخیره…" : "ایجاد یادداشت"}</button>{message && <p className="mt-2 text-xs text-red-600">{message}</p>}</SectionCard>}</div>;
}

function ClinicalNoteEditor({ note, accessToken, patientId, onChanged }: { note: ClinicalWorkspace["notes"][number]; accessToken: string; patientId: string; onChanged: () => Promise<void> }) {
  const current = note.revision; const [content, setContent] = useState(current?.content ?? ""); const [summary, setSummary] = useState(current?.patientSummary ?? ""); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
  if (!current) return null;
  const save = async () => { try { setBusy(true); await saveClinicalNote(accessToken, patientId, note.id, { expectedRevision: note.currentRevision, content, isPrivate: true, patientSummary: summary || null, amendmentReasonCategory: reason || null }); await onChanged(); } finally { setBusy(false); } };
  const sign = async () => { try { setBusy(true); await signClinicalNote(accessToken, patientId, note.id, note.currentRevision, note.currentRevision); await onChanged(); } finally { setBusy(false); } };
  const publish = async () => { try { setBusy(true); await publishClinicalNote(accessToken, patientId, note.id, note.currentRevision, note.currentRevision); await onChanged(); } finally { setBusy(false); } };
  return <div className="rounded-xl border border-border p-4"><div className="mb-2 flex items-center justify-between"><strong className="text-sm">یادداشت ویزیت</strong><span className="text-xs text-muted-foreground">نسخه {note.currentRevision} · {current.state}</span></div><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} className="w-full rounded-lg border border-border bg-card p-2 text-sm" /><textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} placeholder="خلاصهٔ بیمار" className="mt-2 w-full rounded-lg border border-border bg-card p-2 text-sm" />{current.state === "SIGNED" && <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="دسته‌بندی دلیل اصلاح" className="mt-2 w-full rounded-lg border border-border bg-card p-2 text-xs" />}<div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void save()} disabled={busy} className="rounded-lg border border-primary px-3 py-1.5 text-xs text-primary disabled:opacity-50">ذخیره نسخه جدید</button>{current.state === "DRAFT" && <button onClick={() => void sign()} disabled={busy} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">امضا</button>}{current.state === "SIGNED" && current.patientSummary && <button onClick={() => void publish()} disabled={busy} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">انتشار خلاصه بیمار</button>}</div></div>;
}

function PatientAppointments({ appointments, error }: { appointments: AdminAppointment[] | null; error: AppointmentApiError | null }) { if (!appointments && !error) return <p className="text-sm text-muted-foreground">در حال دریافت نوبت‌ها…</p>; if (error) return <Notice tone={error.status === 401 || error.status === 403 ? "amber" : "red"}>دریافت نوبت‌های این بیمار ممکن نشد.</Notice>; if (!appointments?.length) return <EmptyPanel text="برای این بیمار نوبتی ثبت نشده است." />; return <div className="max-w-3xl space-y-3">{appointments.map((appointment) => <SectionCard key={appointment.id} title={appointment.status}><Rows rows={[["شروع", new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.startsAt))], ["پایان", new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.endsAt))]]} /></SectionCard>)}</div>; }
function TraditionalMedicine() { return <div className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center"><FileText size={36} className="mx-auto mb-3 text-muted-foreground/40" /><p className="text-sm font-medium">تحلیل طب سنتیِ persisted برای این بیمار در Phase 06 وجود ندارد.</p><p className="mt-2 text-xs leading-6 text-muted-foreground">این بخش عمداً تحلیل، تشخیص یا توصیهٔ ساختگی تولید نمی‌کند. مدل و workflow مستقل آن خارج از محدودهٔ فعلی هستند.</p></div>; }
function ClinicalTimeline({ clinical, error }: { clinical: ClinicalWorkspace | null; error: ClinicalWorkspaceApiError | null }) { if (!clinical && !error) return <p className="text-sm text-muted-foreground">در حال دریافت خط زمانی…</p>; if (error) return <ClinicalNotice error={error} />; if (!clinical?.timeline.length) return <EmptyPanel text="هنوز رویداد بالینی ثبت‌شده‌ای وجود ندارد." />; return <div className="max-w-3xl space-y-3">{clinical.timeline.map((event) => <SectionCard key={event.id} title={event.type}><p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurredAt))}</p></SectionCard>)}</div>; }
function EmptyPanel({ text }: { text: string }) { return <div className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{text}</div>; }
