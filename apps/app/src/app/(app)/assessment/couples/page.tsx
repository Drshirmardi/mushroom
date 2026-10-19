"use client";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { components } from "@sabz-zendegi/api-client";
import { useAuthSession } from "@/components/auth/session-gate";
import { Users, ArrowLeft, ShieldCheck } from "lucide-react";
import { ServicePage, ServiceSection, ServiceEmpty, ServiceSteps } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { PatientPagination } from "@/components/shared/patient-pagination";
import { PolicyAcceptance } from "@/components/shared/policy-acceptance";
import { listCoupleSessions, listCoupleAssessments, getCoupleLinkPolicy, createCoupleSession, previewCoupleInvitation, acceptCoupleInvitation } from "@/lib/couples-api";
import { loadSelfProfile } from "@/lib/onboarding/patient-onboarding";
import { usePatientResource } from "@/lib/use-patient-resource";
import { useOperationKey } from "@/lib/use-operation-key";
import { patientErrorMessage } from "@/lib/patient-request";
const states: Record<string, string> = { AWAITING_PARTNER: "در انتظار پذیرش همراه", LINKED: "حساب‌ها متصل‌اند", CONSENT_REVOKED: "رضایت اتصال پس گرفته شده است" };
function CouplesHub() {
  const { authentication } = useAuthSession(); const token = authentication.accessToken; const publicationId = useSearchParams().get("publicationId");
  const [page, setPage] = useState(1); const [assessmentPage, setAssessmentPage] = useState(1);
  const sessions = usePatientResource(useCallback(() => listCoupleSessions(token, page), [token, page]));
  const assessments = usePatientResource(useCallback(() => listCoupleAssessments(token, assessmentPage), [token, assessmentPage]));
  const policy = usePatientResource(useCallback(() => getCoupleLinkPolicy(token), [token]));
  const profile = usePatientResource(useCallback(() => loadSelfProfile(token), [token]));
  return <ServicePage title="ارزیابی زوجین" description="با حساب‌های مستقل، همراه یکدیگر ارزیابی شوید و مراحل مشترک را با رضایت هر دو نفر پیش ببرید." icon={Users}>
    <ServiceSteps steps={["اتصال حساب‌ها", "رضایت مستقل", "آزمون و نتیجه"]} />
    <div className="service-callout"><ShieldCheck size={26} aria-hidden="true" /><div><h2>پاسخ‌های فردی شما خصوصی می‌مانند</h2><p>اتصال حساب‌ها، اجازهٔ دیدن پاسخ‌ها و نتیجهٔ فردی را نمی‌دهد. هر ارزیابی به رضایت جداگانهٔ هر دو نفر نیاز دارد.</p></div></div>
    {publicationId && <p className="service-note mt-4">برای ارزیابی انتخاب‌شده، یک اتصال موجود را باز کنید یا همراهی تازه‌ای بسازید.</p>}
    <ServiceSection title="همراهی تازه" description="اگر دعوت دارید، کد همراه را وارد کنید. در غیر این صورت، ابتدا اتصال بسازید و همراه را دعوت کنید.">
      <details className="service-card service-disclosure"><summary>دعوت دریافت کرده‌ام</summary><InvitationAcceptance key={authentication.user.id} token={token} /></details>
      <details className="service-card service-disclosure"><summary>می‌خواهم همراه را دعوت کنم</summary><p>برای شروع، رضایت اتصال حساب‌ها را بررسی کنید. پس از ایجاد اتصال، اطلاعات دعوت همراه را ثبت می‌کنید.</p><PatientResourceState {...policy} retry={() => void policy.reload()} />{policy.data && <CreateLink key={`${authentication.user.id}:${policy.data.contentHash}`} policy={policy.data} token={token} userId={authentication.user.id} publicationId={publicationId} />}</details>
      <details className="service-card service-disclosure"><summary>شناسهٔ من برای دریافت دعوت</summary><PatientResourceState {...profile} retry={() => void profile.reload()} />{profile.data && <><label className="block text-sm">شناسهٔ بیمار<input readOnly aria-label="شناسهٔ بیمار برای دریافت دعوت" dir="ltr" value={profile.data.patientId} className="mt-2 w-full rounded-xl border border-border p-3 text-sm" /></label><p>این شناسه و شمارهٔ ثبت‌شدهٔ خودتان را فقط مستقیماً در اختیار همراه موردنظرتان قرار دهید.</p></>}</details>
    </ServiceSection>
    <ServiceSection title="اتصال‌های من" description="دعوت‌ها، وضعیت اتصال و انتخاب ارزیابی مشترک."><PatientResourceState {...sessions} retry={() => void sessions.reload()} />{sessions.data?.items.map(item => <Link key={item.id} href={`/assessment/couples/links/${item.id}${publicationId ? `?publicationId=${encodeURIComponent(publicationId)}` : ""}`} className="service-card"><h3>{states[item.state] ?? "بررسی اتصال"}</h3><span className="service-text-action">مدیریت دعوت و انتخاب ارزیابی<ArrowLeft size={17} aria-hidden="true" /></span></Link>)}{sessions.data?.items.length === 0 && <ServiceEmpty icon={Users} title="هنوز همراهی متصل نشده" description="از بخش «همراهی تازه» دعوت همراه را بپذیرید یا خودتان یک اتصال ایجاد کنید." />}{sessions.data && <PatientPagination page={page} total={sessions.data.total} onChange={setPage} />}</ServiceSection>
    <ServiceSection title="ارزیابی‌های مشترک من" description="مراحل رضایت، پرداخت، پاسخ‌گویی و نتیجهٔ مشترک هر ارزیابی."><PatientResourceState {...assessments} retry={() => void assessments.reload()} />{assessments.data?.items.map(item => <Link key={item.id} href={`/assessment/couples/${item.id}`} className="service-card"><h3>{item.title}</h3><span className="service-text-action">پیگیری مراحل و نتیجه<ArrowLeft size={17} aria-hidden="true" /></span></Link>)}{assessments.data?.items.length === 0 && <ServiceEmpty title="ارزیابی مشترکی شروع نشده" description="پس از اتصال حساب‌ها، ارزیابی موردنظرتان را از صفحهٔ همان اتصال انتخاب کنید." />}{assessments.data && <PatientPagination page={assessmentPage} total={assessments.data.total} onChange={setAssessmentPage} />}</ServiceSection>
  </ServicePage>;
}
function CreateLink({ policy, token, userId, publicationId }: { policy: components["schemas"]["CoupleLinkPolicyDto"]; token: string; userId: string; publicationId: string | null }) {
  const router = useRouter(); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [epoch] = useState(() => crypto.randomUUID()); const key = useOperationKey(`${userId}:couple-link`);
  const create = async () => {
    if (!accepted || busy) return; setBusy(true); setError(null);
    try { const body = { consentPolicyVersionId: policy.id, consentAccepted: true as const }; const session = await createCoupleSession(token, body, await key({ ...body, epoch })); router.push(`/assessment/couples/links/${session.id}${publicationId ? `?publicationId=${encodeURIComponent(publicationId)}` : ""}`); }
    catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  return <div className="space-y-3"><PolicyAcceptance policy={policy} accepted={accepted} onChange={setAccepted} disabled={busy} />{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy || !accepted} onClick={() => void create()} className="w-full rounded-xl bg-primary p-4 font-bold text-white disabled:opacity-40">ثبت رضایت من و ایجاد اتصال</button></div>;
}
function InvitationAcceptance({ token }: { token: string }) {
  const router = useRouter(); const [secret, setSecret] = useState(""); const [preview, setPreview] = useState<components["schemas"]["CoupleInvitationPreviewDto"] | null>(null); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const review = async () => { if (busy) return; setBusy(true); setError(null); setPreview(null); setAccepted(false); try { setPreview(await previewCoupleInvitation(token, secret.trim())); } catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); } };
  const accept = async () => { if (!preview || !accepted || busy) return; setBusy(true); setError(null); try { const session = await acceptCoupleInvitation(token, { invitationToken: secret.trim(), consentPolicyVersionId: preview.policy.id, consentAccepted: true }); setSecret(""); setPreview(null); router.push(`/assessment/couples/links/${session.id}`); } catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); } };
  return <section className="mt-4 space-y-3"><p className="text-sm text-muted-foreground">کد دعوتی را که مستقیماً از همراه گرفته‌اید، وارد کنید.</p><label className="block text-sm">کد دعوت<input value={secret} disabled={busy} onChange={event => { setSecret(event.target.value); setPreview(null); setAccepted(false); setError(null); }} autoComplete="off" spellCheck={false} dir="ltr" className="mt-2 w-full rounded-xl border border-border p-3" /></label><button disabled={busy || secret.trim().length !== 43} onClick={() => void review()} className="service-primary w-full disabled:opacity-40">بررسی دعوت و شرایط</button>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{preview && <><PolicyAcceptance policy={preview.policy} accepted={accepted} onChange={setAccepted} disabled={busy} /><button disabled={busy || !accepted} onClick={() => void accept()} className="w-full rounded-xl bg-primary p-4 text-white disabled:opacity-40">پذیرش دعوت با حساب خودم</button></>}</section>;
}
export default function CouplesPage() { return <Suspense fallback={<p role="status" className="p-4">در حال دریافت اطلاعات زوجین…</p>}><CouplesHub /></Suspense>; }
