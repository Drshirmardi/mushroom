"use client";
import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PatientPrescriptions } from "@/components/treatment/patient-prescriptions";
import { Activity, Check, HeartPulse, Pill, Leaf, Zap, ArrowLeft } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage, ServiceSection, ServiceEmpty } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { usePatientResource } from "@/lib/use-patient-resource";
import { toP } from "@/lib/format";
import { completePatientTreatmentTask, getPatientTreatmentProgress, listPatientTreatmentPlans, listPatientTreatmentTasks, recordPatientMedicationAdherence, type TreatmentTask } from "@/lib/patient-treatment-api";

function TreatmentContent() {
  const planId = useSearchParams().get("planId"); const { authentication } = useAuthSession();
  const [busyTask, setBusyTask] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const resource = usePatientResource(useCallback(async () => {
    const [planData, taskData] = await Promise.all([listPatientTreatmentPlans(authentication.accessToken), listPatientTreatmentTasks(authentication.accessToken)]);
    const plans = planId ? planData.items.filter(plan => plan.id === planId) : planData.items;
    const tasks = planId ? taskData.items.filter(task => task.treatmentPlanId === planId) : taskData.items;
    const entries = await Promise.all(plans.map(async plan => [plan.id, await getPatientTreatmentProgress(authentication.accessToken, plan.id)] as const));
    return { plans, tasks, progress: Object.fromEntries(entries) };
  }, [authentication.accessToken, planId]));
  const complete = async (task: TreatmentTask) => { if (busyTask) return; try { setBusyTask(task.id); setNotice(null); await completePatientTreatmentTask(authentication.accessToken, task.id); await resource.reload(); setNotice("انجام فعالیت ثبت شد."); } catch { setNotice("ثبت انجام فعالیت ممکن نشد؛ دوباره تلاش کنید."); } finally { setBusyTask(null); } };
  const adhere = async (id: string) => { if (busyTask) return; try { setBusyTask(id); setNotice(null); await recordPatientMedicationAdherence(authentication.accessToken, id); await resource.reload(); setNotice("مصرف دارو ثبت شد."); } catch { setNotice("ثبت مصرف دارو ممکن نشد؛ دوباره تلاش کنید."); } finally { setBusyTask(null); } };
  return <ServicePage title="نسخه‌ها و درمان من" description="برنامهٔ منتشرشدهٔ درمانگر و فعالیت‌های روزانهٔ خود را قدم‌به‌قدم پیگیری کنید." icon={HeartPulse}>
    {planId && <Link href="/treatment" className="service-text-action">همهٔ برنامه‌های درمان<ArrowLeft size={17} aria-hidden="true" /></Link>}
    {!planId && <PatientPrescriptions token={authentication.accessToken} />}
    <PatientResourceState {...resource} retry={() => void resource.reload()} />
    {resource.data?.plans.length === 0 && <ServiceEmpty icon={HeartPulse} title={planId ? "این برنامه در دسترس شما نیست" : "برنامهٔ درمانی برای شما منتشر نشده"} description={planId ? "ممکن است دسترسی این برنامه تغییر کرده باشد. برنامه‌های دیگر خود را بررسی کنید." : "پس از بررسی درمانگر و انتشار برنامه، جزئیات داروها، تمرین‌ها و فعالیت‌ها را اینجا می‌بینید."} href={planId ? "/treatment" : "/appointments/book"} action={planId ? "همهٔ برنامه‌های درمان" : "رزرو مشاوره"} />}
    {resource.data?.plans.map(plan => { const progress = resource.data?.progress[plan.id]; return <ServiceSection key={plan.id} title={plan.title ?? "برنامهٔ درمان"}>
      <div className="service-treatment-progress"><div><span>پیشرفت فعالیت‌های برنامه</span><strong>{progress ? `${toP(progress.percentage)}٪` : "—"}</strong></div>{progress && <><progress aria-label={`پیشرفت ${plan.title ?? "برنامهٔ درمان"}`} max={100} value={progress.percentage} /><p>{toP(progress.completedTasks)} از {toP(progress.totalTasks)} فعالیت انجام شده</p></>}</div>
      {plan.medications.length > 0 && <details className="service-card service-disclosure" open><summary><Pill size={19} aria-hidden="true" />داروها و دستور مصرف</summary><div className="service-stack">{plan.medications.map(item => <div key={item.id} className="service-treatment-item"><h3>{item.name}</h3><p>{[item.dosage,item.instructions].filter(Boolean).join("، ") || "دستور مصرفی ثبت نشده است."}</p><button type="button" disabled={busyTask !== null} onClick={() => void adhere(item.id)} className="service-text-action disabled:opacity-50">{busyTask === item.id ? "در حال ثبت…" : "ثبت مصرف دارو"}</button></div>)}</div></details>}
      {plan.sessionPlans.length > 0 && <details className="service-card service-disclosure"><summary><Activity size={19} aria-hidden="true" />جلسات درمانی</summary>{plan.sessionPlans.map(item => <div key={item.id} className="service-treatment-item"><h3>{toP(item.position)}. {item.title}</h3><p>{item.goals.join("، ")}</p>{item.patientInstructions && <p>{item.patientInstructions}</p>}</div>)}</details>}
      {plan.exercisePlans.length > 0 && <details className="service-card service-disclosure"><summary><Zap size={19} aria-hidden="true" />تمرین‌ها</summary>{plan.exercisePlans.map(item => <div key={item.id} className="service-treatment-item"><h3>{item.title}</h3><p>{item.instructions ?? "توضیحی ثبت نشده است."}</p></div>)}</details>}
      {plan.nutritionPlans.length > 0 && <details className="service-card service-disclosure"><summary><Leaf size={19} aria-hidden="true" />توصیه‌های تغذیه</summary>{plan.nutritionPlans.map(item => <div key={item.id} className="service-treatment-item"><h3>{item.title}</h3><p>{item.instructions ?? "توضیحی ثبت نشده است."}</p></div>)}</details>}
      {plan.medications.length + plan.sessionPlans.length + plan.exercisePlans.length + plan.nutritionPlans.length === 0 && <p className="service-note">جزئیات دارو، تمرین یا تغذیه برای این برنامه ثبت نشده است. فعالیت‌های زمان‌بندی‌شده را در ادامه بررسی کنید.</p>}
    </ServiceSection>; })}
    {resource.data && (resource.data.plans.length > 0 || resource.data.tasks.length > 0) && <ServiceSection title="فعالیت‌های زمان‌بندی‌شده" description="پس از انجام هر فعالیت، وضعیت آن را ثبت کنید.">{resource.data.tasks.length === 0 ? <ServiceEmpty title="فعلاً فعالیت زمان‌بندی‌شده‌ای ندارید" description="فعالیت‌ها پس از تنظیم برنامه توسط درمانگر در این قسمت نمایش داده می‌شوند." /> : resource.data.tasks.map(task => <article key={task.id} className="service-card"><div className="service-card-top"><h3>{task.kind === "MEDICATION" ? "فعالیت دارویی" : "تمرین"}</h3><span className={`service-badge ${task.state === "COMPLETED" ? "service-badge--success" : ""}`}>{task.state === "COMPLETED" ? "انجام شده" : task.state === "CANCELLED" ? "لغو شده" : "در انتظار انجام"}</span></div><p>{new Intl.DateTimeFormat("fa-IR", {dateStyle:"medium",timeStyle:"short"}).format(new Date(task.scheduledFor))}</p>{task.state === "SCHEDULED" && <button type="button" disabled={busyTask !== null} onClick={() => void complete(task)} className="service-text-action disabled:opacity-50"><Check size={17} aria-hidden="true" />{busyTask === task.id ? "در حال ثبت…" : "ثبت انجام فعالیت"}</button>}</article>)}</ServiceSection>}
    {notice && <p role="status" className="service-note mt-6">{notice}</p>}
  </ServicePage>;
}
export default function TreatmentPage() { return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">در حال دریافت برنامهٔ درمان…</p>}><TreatmentContent /></Suspense>; }
