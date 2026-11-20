"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  Check,
  CircleCheck,
  HeartPulse,
  Leaf,
  Pill,
  Sparkles,
  Zap,
} from "lucide-react";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { LoadingState } from "@/components/shared/skeletons";
import { PatientPrescriptions } from "@/components/treatment/patient-prescriptions";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServiceEmpty, ServicePage, ServiceSection } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { usePatientResource } from "@/lib/use-patient-resource";
import { toP } from "@/lib/format";
import {
  completePatientTreatmentTask,
  getPatientTreatmentProgress,
  listPatientTreatmentPlans,
  listPatientTreatmentTasks,
  recordPatientMedicationAdherence,
  type TreatmentTask,
} from "@/lib/patient-treatment-api";

function TreatmentContent() {
  const planId = useSearchParams().get("planId");
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resource = usePatientResource(useCallback(async () => {
    const [planData, taskData] = await Promise.all([
      listPatientTreatmentPlans(token),
      listPatientTreatmentTasks(token),
    ]);
    const plans = planId ? planData.items.filter((plan) => plan.id === planId) : planData.items;
    const tasks = planId ? taskData.items.filter((task) => task.treatmentPlanId === planId) : taskData.items;
    const entries = await Promise.all(
      plans.map(async (plan) => [plan.id, await getPatientTreatmentProgress(token, plan.id)] as const),
    );
    return { plans, tasks, progress: Object.fromEntries(entries) };
  }, [token, planId]));

  const complete = async (task: TreatmentTask) => {
    if (busyTask) return;
    try {
      setBusyTask(task.id);
      setNotice(null);
      await completePatientTreatmentTask(token, task.id);
      await resource.reload();
      setNotice("انجام فعالیت ثبت شد.");
    } catch {
      setNotice("ثبت انجام فعالیت ممکن نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusyTask(null);
    }
  };

  const adhere = async (id: string) => {
    if (busyTask) return;
    try {
      setBusyTask(id);
      setNotice(null);
      await recordPatientMedicationAdherence(token, id);
      await resource.reload();
      setNotice("مصرف دارو ثبت شد.");
    } catch {
      setNotice("ثبت مصرف دارو ممکن نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusyTask(null);
    }
  };

  return (
    <ServicePage
      title="نسخه‌های من"
      description="نسخه‌های پزشک و برنامهٔ درمانی‌تان را اینجا ببینید و پیگیری کنید."
      icon={HeartPulse}
    >
      <div className="mx-auto grid w-full max-w-2xl gap-7 pb-8">
        {planId && (
          <Link href="/treatment" className="service-text-action w-fit">
            <ArrowLeft size={17} aria-hidden="true" />همهٔ برنامه‌های درمان
          </Link>
        )}

        {!planId && <PatientPrescriptions token={token} />}
        <PatientResourceState {...resource} retry={() => void resource.reload()} />

        {resource.data?.plans.length === 0 && (
          <ServiceEmpty
            icon={HeartPulse}
            title={planId ? "این برنامه در دسترس شما نیست" : "برنامهٔ درمانی برای شما منتشر نشده"}
            description={planId
              ? "ممکن است دسترسی این برنامه تغییر کرده باشد. برنامه‌های دیگر خود را بررسی کنید."
              : "پس از بررسی درمانگر و انتشار برنامه، داروها، تمرین‌ها و فعالیت‌ها در این صفحه نمایش داده می‌شوند."}
            href={planId ? "/treatment" : "/appointments/book"}
            action={planId ? "همهٔ برنامه‌های درمان" : "رزرو مشاوره"}
          />
        )}

        {resource.data?.plans.map((plan) => {
          const progress = resource.data?.progress[plan.id];
          const sections = [
            { key: "medications", title: "داروها و دستور مصرف", icon: Pill, items: plan.medications },
            { key: "sessions", title: "جلسات درمانی", icon: Activity, items: plan.sessionPlans },
            { key: "exercises", title: "تمرین‌ها", icon: Zap, items: plan.exercisePlans },
            { key: "nutrition", title: "توصیه‌های تغذیه", icon: Leaf, items: plan.nutritionPlans },
          ].filter((section) => section.items.length > 0);

          return (
            <ServiceSection key={plan.id} title={plan.title ?? "برنامهٔ درمان"}>
              <div className="service-treatment-progress">
                <div>
                  <span className="flex items-center gap-2"><Sparkles size={16} aria-hidden="true" />پیشرفت فعالیت‌های برنامه</span>
                  <strong>{progress ? `${toP(progress.percentage)}٪` : "—"}</strong>
                </div>
                {progress ? (
                  <>
                    <progress
                      aria-label={`پیشرفت ${plan.title ?? "برنامهٔ درمان"}`}
                      max={100}
                      value={progress.percentage}
                    />
                    <p>{toP(progress.completedTasks)} از {toP(progress.totalTasks)} فعالیت انجام شده</p>
                  </>
                ) : (
                  <p>اطلاعات پیشرفت فعلاً در دسترس نیست.</p>
                )}
              </div>

              {sections.map(({ key, title, icon: Icon, items }) => (
                <details key={key} className="service-card service-disclosure treatment-disclosure">
                  <summary><Icon size={19} aria-hidden="true" />{title}<span className="treatment-section-count">{toP(items.length)}</span></summary>
                  <div className="service-stack">
                    {key === "medications" && plan.medications.map((item) => (
                      <article key={item.id} className="service-treatment-item">
                        <div className="service-card-top">
                          <h3>{item.name}</h3>
                          <span className="service-badge">دارو</span>
                        </div>
                        <p>{[item.dosage, item.instructions].filter(Boolean).join(" · ") || "دستور مصرفی ثبت نشده است."}</p>
                        <button
                          type="button"
                          disabled={busyTask !== null}
                          onClick={() => void adhere(item.id)}
                          className="service-text-action disabled:opacity-50"
                          aria-busy={busyTask === item.id}
                        >
                          {busyTask === item.id
                            ? <><HeartbeatLoader />در حال ثبت…</>
                            : <><Check size={17} aria-hidden="true" />ثبت مصرف دارو</>}
                        </button>
                      </article>
                    ))}
                    {key === "sessions" && plan.sessionPlans.map((item) => (
                      <article key={item.id} className="service-treatment-item">
                        <h3>{toP(item.position)}. {item.title}</h3>
                        <p>{item.goals.join("، ")}</p>
                        {item.patientInstructions && <p>{item.patientInstructions}</p>}
                      </article>
                    ))}
                    {key === "exercises" && plan.exercisePlans.map((item) => (
                      <article key={item.id} className="service-treatment-item">
                        <h3>{item.title}</h3><p>{item.instructions ?? "توضیحی ثبت نشده است."}</p>
                      </article>
                    ))}
                    {key === "nutrition" && plan.nutritionPlans.map((item) => (
                      <article key={item.id} className="service-treatment-item">
                        <h3>{item.title}</h3><p>{item.instructions ?? "توضیحی ثبت نشده است."}</p>
                      </article>
                    ))}
                  </div>
                </details>
              ))}

              {sections.length === 0 && (
                <p className="service-note">جزئیات دارو، جلسه یا فعالیتی برای این برنامه ثبت نشده است.</p>
              )}
            </ServiceSection>
          );
        })}

        {resource.data && (resource.data.plans.length > 0 || resource.data.tasks.length > 0) && (
          <ServiceSection
            title="فعالیت‌های زمان‌بندی‌شده"
            description="وضعیت هر فعالیت را بعد از انجام ثبت کنید."
          >
            {resource.data.tasks.length === 0 ? (
              <ServiceEmpty
                icon={CalendarClock}
                title="فعلاً فعالیت زمان‌بندی‌شده‌ای ندارید"
                description="فعالیت‌ها پس از تنظیم برنامه توسط درمانگر در این قسمت نمایش داده می‌شوند."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {resource.data.tasks.map((task) => (
                  <article key={task.id} className="service-card treatment-task-card">
                    <div className="service-card-top">
                      <div className="flex min-w-0 items-center gap-2">
                        {task.kind === "MEDICATION"
                          ? <Pill size={18} className="shrink-0 text-primary" aria-hidden="true" />
                          : <Zap size={18} className="shrink-0 text-primary" aria-hidden="true" />}
                        <h3>{task.kind === "MEDICATION" ? "فعالیت دارویی" : "تمرین"}</h3>
                      </div>
                      <span className={`service-badge ${task.state === "COMPLETED" ? "service-badge--success" : ""}`}>
                        {task.state === "COMPLETED" ? "انجام شده" : task.state === "CANCELLED" ? "لغو شده" : "در انتظار انجام"}
                      </span>
                    </div>
                    <p className="flex items-center gap-2">
                      <CalendarClock size={15} aria-hidden="true" />
                      {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(task.scheduledFor))}
                    </p>
                    {task.state === "SCHEDULED" && (
                      <button
                        type="button"
                        disabled={busyTask !== null}
                        onClick={() => void complete(task)}
                        className="service-text-action disabled:opacity-50"
                        aria-busy={busyTask === task.id}
                      >
                        {busyTask === task.id
                          ? <><HeartbeatLoader />در حال ثبت…</>
                          : <><CircleCheck size={17} aria-hidden="true" />ثبت انجام فعالیت</>}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </ServiceSection>
        )}

        {notice && <p role="status" className="service-note mt-2">{notice}</p>}
      </div>
    </ServicePage>
  );
}

export default function TreatmentPage() {
  return <Suspense fallback={<LoadingState variant="list" className="p-4" />}><TreatmentContent /></Suspense>;
}
