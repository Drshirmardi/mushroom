"use client";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { components } from "@sabz-zendegi/api-client";
import { useAuthSession } from "@/components/auth/session-gate";
import { Users, ArrowLeft, ShieldCheck, Mail, UserPlus, ChevronLeft, ClipboardList } from "lucide-react";
import { ServicePage, ServiceSection } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { PatientPagination } from "@/components/shared/patient-pagination";
import { PolicyAcceptance } from "@/components/shared/policy-acceptance";
import { listCoupleSessions, listCoupleAssessments, getCoupleLinkPolicy, createCoupleSession, previewCoupleInvitation, acceptCoupleInvitation } from "@/lib/couples-api";
import { loadSelfProfile } from "@/lib/onboarding/patient-onboarding";
import { usePatientResource } from "@/lib/use-patient-resource";
import { useOperationKey } from "@/lib/use-operation-key";
import { patientErrorMessage } from "@/lib/patient-request";
import { toP } from "@/lib/format";
const linkStates: Record<string, { title: string; description: string; action: string }> = {
  AWAITING_PARTNER: { title: "دعوت همراه هنوز تکمیل نشده", description: "اگر هنوز کد دعوت نساخته‌اید، از همین بخش بسازید؛ در غیر این صورت منتظر پذیرش همراه بمانید.", action: "مدیریت دعوت همراه" },
  LINKED: { title: "حساب شما و همراه متصل است", description: "حالا می‌توانید آزمون زوجی را انتخاب کنید. هر نفر شرایط آزمون را با حساب خودش تأیید می‌کند.", action: "انتخاب آزمون زوجی" },
  CONSENT_REVOKED: { title: "این همراهی متوقف شده", description: "رضایت اتصال پس گرفته شده است. برای دیدن جزئیات وارد این همراهی شوید.", action: "مشاهده وضعیت همراهی" },
};
function CouplesHub() {
  const { authentication } = useAuthSession(); const token = authentication.accessToken; const publicationId = useSearchParams().get("publicationId");
  const [page, setPage] = useState(1); const [assessmentPage, setAssessmentPage] = useState(1);
  const [mode, setMode] = useState<"invite" | "accept" | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const sessions = usePatientResource(useCallback(() => listCoupleSessions(token, page), [token, page]));
  const assessments = usePatientResource(useCallback(() => listCoupleAssessments(token, assessmentPage), [token, assessmentPage]));
  const hasHistory = (sessions.data?.total ?? 0) > 0 || (assessments.data?.total ?? 0) > 0;
  const steps = [
    { title: "همراهت را دعوت کن", description: "هر نفر با حساب خودش؛ دعوت را بساز یا کدی را که گرفته‌ای بپذیر." },
    { title: "آزمون را انتخاب کنید", description: "بعد از اتصال، شرایط و هزینه آزمون را می‌بینید و هر دو رضایت می‌دهید." },
    { title: "جداگانه پاسخ بدهید", description: "هر نفر آزمون خودش را تکمیل می‌کند؛ سپس نتیجه مشترک را پیگیری می‌کنید." },
  ];
  return <ServicePage title="آزمون زوجی" description="با همراهت در یک ارزیابی مشترک شرکت کن؛ هر کدام با حساب خودتان و پاسخ‌های جداگانه." icon={Users}>
    {publicationId && <p className="mb-4 rounded-xl bg-primary/5 p-4 text-sm leading-7 text-primary">آزمونت انتخاب شده است. برای ادامه، یک همراهی موجود را باز کن یا همراهت را دعوت کن.</p>}

    {(sessions.loading || assessments.loading) && <p role="status" className="mb-4 text-sm leading-7 text-muted-foreground">در حال بررسی دعوت‌ها و ارزیابی‌های قبلی‌ات…</p>}
    <PatientResourceState {...assessments} loading={false} retry={() => void assessments.reload()} />
    {(assessments.data?.total ?? 0) > 0 && <ServiceSection title="ادامه ارزیابی‌های شما" description="برای ادامه پاسخ‌گویی یا دیدن نتیجه، ارزیابی خودت را باز کن.">
      {assessments.data?.items.map(item => {
        const ownAccepted = Boolean(item.ownConsent.acceptedAt && !item.ownConsent.withdrawnAt);
        const action = item.ownConsent.withdrawnAt ? "بررسی وضعیت ارزیابی" : !ownAccepted ? "بررسی شرایط و اعلام رضایت" : !item.mutualConsentComplete ? "مشاهده وضعیت و رضایت همراه" : "ادامه آزمون و بررسی نتیجه";
        return <Link key={item.id} href={`/assessment/couples/${item.id}`} className="service-card transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList size={20} aria-hidden="true" /></span><div className="min-w-0"><h3>{item.title}</h3><p>{!ownAccepted ? "ابتدا وضعیت رضایت خودت را بررسی کن." : !item.mutualConsentComplete ? "رضایت هر دو نفر هنوز کامل نشده است." : "رضایت هر دو نفر ثبت شده؛ وضعیت پرداخت، پاسخ‌ها و نتیجه را اینجا ببین."}</p><span className="service-text-action">{action}<ArrowLeft size={16} aria-hidden="true" /></span></div></div>
        </Link>;
      })}
      {assessments.data && <PatientPagination page={assessmentPage} total={assessments.data.total} onChange={setAssessmentPage} />}
    </ServiceSection>}

    <PatientResourceState {...sessions} loading={false} retry={() => void sessions.reload()} />
    {(sessions.data?.total ?? 0) > 0 && <ServiceSection title="همراهی‌های شما" description={publicationId ? "همراه موردنظرت را برای آزمون انتخاب‌شده مشخص کن." : "دعوت را ادامه بده یا از همراهی متصل‌شده، آزمون جدید انتخاب کن."}>
      {sessions.data?.items.map((item, index) => {
        const state = linkStates[item.state] ?? { title: "بررسی همراهی", description: "وضعیت دعوت و اتصال را بررسی کن.", action: "مشاهده جزئیات" };
        return <Link key={item.id} href={`/assessment/couples/links/${item.id}${publicationId ? `?publicationId=${encodeURIComponent(publicationId)}` : ""}`} className="service-card transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>همراهی {toP((page - 1) * (sessions.data?.pageSize ?? 20) + index + 1)}</span><span>{new Date(item.createdAt).toLocaleDateString("fa-IR")}</span></div>
          <h3>{state.title}</h3><p>{state.description}</p><span className="service-text-action">{state.action}<ArrowLeft size={16} aria-hidden="true" /></span>
        </Link>;
      })}
      {sessions.data && <PatientPagination page={page} total={sessions.data.total} onChange={setPage} />}
    </ServiceSection>}

    <section aria-labelledby="couples-start-title" className="mt-6 rounded-2xl border border-border bg-white p-4 sm:p-6">
      <h2 id="couples-start-title" className="text-base font-semibold">{hasHistory ? "شروع با یک همراه جدید" : "برای شروع، یکی از این دو راه را انتخاب کن"}</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">هر دو نفر باید حساب کاربری داشته باشید. فقط یکی دعوت را می‌سازد و نفر دوم آن را با حساب خودش می‌پذیرد.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="group" aria-label="روش شروع ارزیابی زوجی">
        {([{ id: "invite", title: "می‌خواهم همراهم را دعوت کنم", description: "هنوز دعوتی ندارید؟ از اینجا شروع کن.", icon: UserPlus }, { id: "accept", title: "کد دعوت دارم", description: "همراهت دعوت ساخته؟ کدش را اینجا وارد کن.", icon: Mail }] as const).map(option => {
          const Icon = option.icon;
          return <button key={option.id} type="button" aria-expanded={mode === option.id} aria-controls="couples-start-panel" onClick={() => setMode(option.id)} className={`flex items-start gap-3 rounded-xl border p-4 text-right transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${mode === option.id ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"}`}>
            <span className="mt-0.5 text-primary"><Icon size={22} aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-foreground">{option.title}</span><span className="mt-1 block text-xs leading-6 text-muted-foreground">{option.description}</span></span><ChevronLeft size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
          </button>;
        })}
      </div>
      <div id="couples-start-panel" role="region" aria-label="مراحل شروع همراهی">
        {mode === "invite" && <div className="mt-5 border-t border-border pt-5"><h3 className="text-sm font-semibold">اول شرایط همراهی را تأیید کن</h3><p className="mb-4 mt-2 text-sm leading-7 text-muted-foreground">بعد از تأیید، وارد صفحه دعوت می‌شوی و شناسه بیمار و شماره موبایل همراهت را وارد می‌کنی. همراهت شناسه‌اش را از همین صفحه و بخش «شناسه من» پیدا می‌کند.</p><CreateLinkPanel key={authentication.user.id} token={token} userId={authentication.user.id} publicationId={publicationId} /></div>}
        {mode === "accept" && <div className="mt-5 border-t border-border pt-5"><h3 className="text-sm font-semibold">دعوت همراهت را بررسی کن</h3><InvitationAcceptance key={authentication.user.id} token={token} publicationId={publicationId} /></div>}
      </div>
      <details className="mt-4 border-t border-border pt-3" onToggle={event => setIdentityOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer py-2 text-sm font-medium text-primary">همراهم شناسه مرا می‌خواهد؛ شناسه من کجاست؟</summary>
        {identityOpen && <InvitationIdentity token={token} />}
      </details>
    </section>

    <details className="mt-5 rounded-2xl bg-muted/60 p-4">
      <summary className="cursor-pointer py-1 text-sm font-medium">از دعوت تا نتیجه چه مراحلی داریم؟</summary>
      <ol className="mt-4 space-y-4">{steps.map((step, index) => <li key={step.title} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">{toP(index + 1)}</span><div><h3 className="text-sm font-medium">{step.title}</h3><p className="mt-1 text-xs leading-6 text-muted-foreground">{step.description}</p></div></li>)}</ol>
    </details>
    <aside className="mt-5 flex items-start gap-3 px-1 text-xs leading-7 text-muted-foreground"><ShieldCheck size={20} className="mt-1 shrink-0 text-primary" aria-hidden="true" /><p><strong className="font-medium text-foreground">پاسخ‌های فردی‌تان خصوصی می‌ماند.</strong> اتصال حساب‌ها اجازه دیدن پاسخ‌ها و نتیجه فردی را نمی‌دهد؛ هر آزمون به رضایت جداگانه هر دو نفر نیاز دارد.</p></aside>
  </ServicePage>;
}
function CreateLinkPanel({ token, userId, publicationId }: { token: string; userId: string; publicationId: string | null }) {
  const policy = usePatientResource(useCallback(() => getCoupleLinkPolicy(token), [token]));
  return <><PatientResourceState {...policy} retry={() => void policy.reload()} />{policy.data && <CreateLink key={policy.data.contentHash} policy={policy.data} token={token} userId={userId} publicationId={publicationId} />}</>;
}
function InvitationIdentity({ token }: { token: string }) {
  const profile = usePatientResource(useCallback(() => loadSelfProfile(token), [token]));
  return <div className="mt-3 space-y-3"><PatientResourceState {...profile} retry={() => void profile.reload()} />{profile.data && <><p className="text-xs leading-6 text-muted-foreground">این شناسه را همراه با شماره موبایلی که با آن ثبت‌نام کرده‌ای، فقط برای همراه موردنظرت بفرست.</p><label className="block text-xs text-muted-foreground">شناسه بیمار من<input readOnly aria-label="شناسه بیمار من برای دریافت دعوت" dir="ltr" value={profile.data.patientId} className="mt-2 w-full select-all rounded-xl border border-border bg-muted/40 p-3 text-xs text-foreground" /></label></>}</div>;
}
function CreateLink({ policy, token, userId, publicationId }: { policy: components["schemas"]["CoupleLinkPolicyDto"]; token: string; userId: string; publicationId: string | null }) {
  const router = useRouter(); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [epoch] = useState(() => crypto.randomUUID()); const key = useOperationKey(`${userId}:couple-link`);
  const create = async () => {
    if (!accepted || busy) return; setBusy(true); setError(null);
    try { const body = { consentPolicyVersionId: policy.id, consentAccepted: true as const }; const session = await createCoupleSession(token, body, await key({ ...body, epoch })); router.push(`/assessment/couples/links/${session.id}${publicationId ? `?publicationId=${encodeURIComponent(publicationId)}` : ""}`); }
    catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  return <div className="space-y-3"><PolicyAcceptance policy={policy} accepted={accepted} onChange={setAccepted} disabled={busy} />{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy || !accepted} onClick={() => void create()} className="w-full rounded-xl bg-primary p-4 font-bold text-white disabled:opacity-40">{busy ? "در حال آماده‌سازی دعوت…" : "تأیید شرایط و رفتن به دعوت همراه"}</button></div>;
}
function InvitationAcceptance({ token, publicationId }: { token: string; publicationId: string | null }) {
  const router = useRouter(); const [secret, setSecret] = useState(""); const [preview, setPreview] = useState<components["schemas"]["CoupleInvitationPreviewDto"] | null>(null); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const review = async () => { if (busy) return; setBusy(true); setError(null); setPreview(null); setAccepted(false); try { setPreview(await previewCoupleInvitation(token, secret.trim())); } catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); } };
  const accept = async () => { if (!preview || !accepted || busy) return; setBusy(true); setError(null); try { const session = await acceptCoupleInvitation(token, { invitationToken: secret.trim(), consentPolicyVersionId: preview.policy.id, consentAccepted: true }); setSecret(""); setPreview(null); router.push(`/assessment/couples/links/${session.id}${publicationId ? `?publicationId=${encodeURIComponent(publicationId)}` : ""}`); } catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); } };
  return <section className="mt-4 space-y-3"><p className="text-sm text-muted-foreground">کد دعوتی را که همراهت فرستاده، کامل اینجا بچسبان. کد دعوت با شناسه بیمار فرق دارد.</p><label className="block text-sm">کد دعوت<input value={secret} disabled={busy} onChange={event => { setSecret(event.target.value); setPreview(null); setAccepted(false); setError(null); }} autoComplete="off" spellCheck={false} dir="ltr" aria-describedby="couple-invitation-help" className="mt-2 w-full rounded-xl border border-border p-3" /></label><p id="couple-invitation-help" className="text-xs leading-6 text-muted-foreground">{secret.trim() && secret.trim().length !== 43 ? "کد کامل نیست؛ مطمئن شو تمام کد دعوت را کپی کرده‌ای." : "ابتدا کد را بررسی کن؛ بعد از دیدن شرایط، پذیرش دعوت را تأیید می‌کنی."}</p><button disabled={busy || secret.trim().length !== 43} onClick={() => void review()} className="service-primary w-full disabled:opacity-40">{busy ? "در حال بررسی…" : "بررسی کد دعوت"}</button>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{preview && <><PolicyAcceptance policy={preview.policy} accepted={accepted} onChange={setAccepted} disabled={busy} /><button disabled={busy || !accepted} onClick={() => void accept()} className="w-full rounded-xl bg-primary p-4 text-white disabled:opacity-40">{busy ? "در حال ثبت…" : "تأیید شرایط و پذیرش دعوت"}</button></>}</section>;
}
export default function CouplesPage() { return <Suspense fallback={<p role="status" className="p-4">در حال دریافت اطلاعات زوجین…</p>}><CouplesHub /></Suspense>; }
