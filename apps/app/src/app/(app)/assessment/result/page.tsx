"use client";
import { LoadingState } from "@/components/shared/skeletons";
import { currentInvitationContext } from '@/lib/marriage-context';
import Link from "next/link";
import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage } from "@/components/shared/service-page";
import { ClipboardList } from "lucide-react";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { GuidanceSafety } from "@/components/shared/policy-acceptance";
import { getAssessmentResult, getAssessmentQuestionnaire, getAssessmentGuidance, getAssessmentProvenance } from "@/lib/assessment-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { MizajChart } from "@/components/assessments/mizaj-chart";
import { MizajResult } from "@/components/assessments/mizaj-result";
import { toP } from "@/lib/format";
import { ResultRecommendations } from '@/components/programs/result-recommendations';

function Result({ id }: { id: string }) {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const result = usePatientResource(useCallback(() => getAssessmentResult(token, id), [token, id]));
  const questionnaire = usePatientResource(useCallback(() => getAssessmentQuestionnaire(token, id), [token, id]));
  const guidance = usePatientResource(useCallback(() => getAssessmentGuidance(token, id), [token, id]));
  const provenance = usePatientResource(useCallback(() => getAssessmentProvenance(token, id), [token, id]));
  const snapshot = result.data?.resultSnapshot;
  const band = snapshot?.resultBand && typeof snapshot.resultBand === "object" ? snapshot.resultBand as Record<string, unknown> : null;
  return <ServicePage title="نتیجهٔ ارزیابی" description="نتیجهٔ ثبت‌شده و راهنمای آموزشی منتشرشدهٔ مربوط به ارزیابی خود را ببینید." icon={ClipboardList} backHref={currentInvitationContext() ? `/assessment/marriage/requests/${currentInvitationContext()}` : "/assessment?view=history"} backLabel="ارزیابی‌ها"><div className="service-detail space-y-4">{result.loading ? <MizajChart isLoading /> : <PatientResourceState variant="detail" {...result} retry={() => void result.reload()} />}{result.data && <>
    {snapshot?.algorithmId === "DIMENSION_TIEBREAK" ? <MizajResult snapshot={snapshot} /> : <section className="rounded-3xl bg-primary p-6 text-white"><h2 className="text-lg font-bold">{questionnaire.data?.title ?? "ارزیابی ثبت‌شده"}</h2><p className="mt-4 text-3xl font-bold">{result.data.score == null ? "امتیازی برای نمایش ثبت نشده است." : toP(result.data.score)}</p>{typeof band?.title === "string" && <p className="mt-3">{band.title}</p>}<p className="mt-3 text-xs leading-6 text-white/80">نتیجهٔ آموزشی ثبت‌شده؛ تفسیر و پیشنهادهای قابل نمایش فقط از محتوای تأییدشدهٔ کلینیک دریافت می‌شوند.</p></section>}
    {result.data.completedAt && <p className="text-xs text-muted-foreground">تاریخ تکمیل: {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.data.completedAt))}</p>}
    {band?.requiresReview === true && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">این نتیجه نیاز به بررسی درمانگر دارد.</p>}
    <section className="space-y-3"><h2 className="font-bold">راهنمای نتیجه</h2><PatientResourceState variant="detail" {...guidance} retry={() => void guidance.reload()} />{guidance.data?.status === "READY" ? <>{guidance.data.content.map(item => <article key={item.id} className="space-y-3 rounded-2xl border border-border bg-white p-4"><h3 className="font-bold">{item.title}</h3>{item.summary && <p className="text-sm text-muted-foreground">{item.summary}</p>}<p className="whitespace-pre-wrap text-sm leading-7">{item.body}</p><GuidanceSafety safety={item.safety} /></article>)}{guidance.data.services.map(service => <Link key={service.id} href="/appointments/book" className="block rounded-xl border border-border p-3 text-sm text-primary">{service.name}</Link>)}</> : guidance.data && <p className="text-sm leading-7 text-muted-foreground">{guidance.data.status === "CLINICAL_REVIEW_REQUIRED" ? "پیش از ارائهٔ راهنما، نتیجه باید توسط درمانگر بررسی شود." : "در حال حاضر راهنمای تأییدشده‌ای برای این نتیجه در دسترس نیست."}</p>}</section>
    {!currentInvitationContext() && questionnaire.data && ['MEZAJ', 'MIZAJ'].includes(questionnaire.data.assessmentKey) && <ResultRecommendations token={token} submissionId={id} />}
    <details className="rounded-xl border border-border p-4 text-sm"><summary className="cursor-pointer font-bold">اطلاعات نسخهٔ نتیجه</summary><PatientResourceState variant="detail" {...provenance} retry={() => void provenance.reload()} />{questionnaire.data && <p className="mt-3">نسخهٔ پرسش‌نامه: {toP(questionnaire.data.versionNumber)}</p>}{provenance.data && <p className="mt-2 text-xs text-muted-foreground">{provenance.data.provenanceStatus === "RECORDED" ? "مشخصات نسخهٔ محاسبه برای این نتیجه ثبت شده است." : "مشخصات کامل محاسبه در نتیجهٔ قدیمی ثبت نشده است."}</p>}</details>
    <Link href="/appointments/book" className="block rounded-2xl bg-primary p-4 text-center font-bold text-white">بررسی شرایط و رزرو مشاوره</Link>
  </>}</div></ServicePage>;
}
function ResultRoute() {
  const id = useSearchParams().get("submissionId");
  return id ? <Result key={id} id={id} /> : <div className="p-4"><p role="alert">شناسهٔ نتیجه مشخص نیست.</p><Link href="/assessment" className="mt-4 block text-primary">بازگشت به ارزیابی‌ها</Link></div>;
}
export default function AssessmentResultPage() { return <Suspense fallback={<LoadingState variant="detail" className="p-4" />}><ResultRoute /></Suspense>; }
