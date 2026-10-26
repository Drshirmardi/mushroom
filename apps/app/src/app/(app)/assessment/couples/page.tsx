"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Clock3, HeartHandshake, Mail, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { PatientPagination } from "@/components/shared/patient-pagination";
import { CoupleInviteFlow, CoupleAcceptFlow, CopyValue } from "@/components/assessments/couple-invitation-flow";
import { listCoupleSessions, listCoupleAssessments } from "@/lib/couples-api";
import { loadSelfProfile } from "@/lib/onboarding/patient-onboarding";
import { usePatientResource } from "@/lib/use-patient-resource";
import { toP } from "@/lib/format";
import styles from "@/components/assessments/couples.module.css";

const linkStates: Record<string, { title: string; description: string; action: string }> = {
  AWAITING_PARTNER: { title: "در انتظار همراه", description: "دعوت را تکمیل کن یا اگر کد را فرستاده‌ای، پذیرش همراهت را پیگیری کن.", action: "تکمیل و پیگیری دعوت" },
  LINKED: { title: "همراهی متصل است", description: "هر دو نفر اتصال را پذیرفته‌اید. حالا می‌توانید آزمون مشترکتان را انتخاب کنید.", action: "انتخاب آزمون زوجی" },
  CONSENT_REVOKED: { title: "همراهی متوقف شده", description: "رضایت اتصال پس گرفته شده است؛ وضعیت و سوابق را از اینجا بررسی کن.", action: "بررسی همراهی" },
};

function CouplesHub() {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const publicationId = useSearchParams().get("publicationId");
  const [page, setPage] = useState(1);
  const [assessmentPage, setAssessmentPage] = useState(1);
  const [startOpen, setStartOpen] = useState(false);
  const [mode, setMode] = useState<"invite" | "accept">("invite");
  const [historyView, setHistoryView] = useState<"assessments" | "connections" | null>(null);
  const [busy, setBusy] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const startHeading = useRef<HTMLHeadingElement>(null);
  const sessions = usePatientResource(useCallback(() => listCoupleSessions(token, page), [token, page]));
  const assessments = usePatientResource(useCallback(() => listCoupleAssessments(token, assessmentPage), [token, assessmentPage]));
  const loading = sessions.loading || assessments.loading;
  const hasHistory = (sessions.data?.total ?? 0) > 0 || (assessments.data?.total ?? 0) > 0;
  const linked = sessions.data?.items.find(item => item.state === "LINKED");
  const pending = sessions.data?.items.find(item => item.state === "AWAITING_PARTNER");
  const view = historyView ?? (publicationId || !(assessments.data?.total) ? "connections" : "assessments");
  const toLink = (id: string) => `/assessment/couples/links/${encodeURIComponent(id)}${publicationId ? `?publicationId=${encodeURIComponent(publicationId)}` : ""}`;

  useEffect(() => {
    if (sessions.data?.total === 0 && assessments.data?.total === 0) setStartOpen(true);
  }, [sessions.data?.total, assessments.data?.total]);
  const openStart = (next: typeof mode) => {
    setMode(next); setStartOpen(true);
    requestAnimationFrame(() => { startHeading.current?.focus(); startHeading.current?.scrollIntoView({ block: "start", behavior: "auto" }); });
  };
  const refresh = () => { void sessions.reload(); void assessments.reload(); };
  const hasLoadError = Boolean(sessions.error || assessments.error);
  const hasAssessments = (assessments.data?.total ?? 0) > 0;
  const nextTitle = loading ? "در حال پیدا کردن مسیر شما…" : hasLoadError ? "وضعیت قبلی‌ات کامل دریافت نشد" : publicationId && linked ? "آزمونت انتخاب شده؛ همراه را مشخص کن" : hasAssessments ? "ارزیابی‌تان را از همین‌جا ادامه بده" : linked ? "همراهت متصل است؛ آزمون را انتخاب کنید" : pending ? "یک دعوت منتظر تکمیل است" : "اول همراه شو، بعد آزمون را شروع کن";
  const nextDescription = loading ? "دعوت‌ها و ارزیابی‌های قبلی‌ات را بررسی می‌کنیم." : hasLoadError ? "از بخش پیگیری، دریافت اطلاعات را دوباره امتحان کن. اگر کد دعوت داری، همچنان می‌توانی آن را بررسی کنی." : publicationId ? "از همراهی‌های موجود انتخاب کن؛ اگر همراه جدیدی داری، دعوتش کن." : hasAssessments ? "شرایط، پرداخت، پاسخ‌گویی و نتیجه هر ارزیابی، در صفحه همان ارزیابی در دسترس است." : linked ? "نیازی به دعوت دوباره نیست. از همراهی موجود، آزمون موردنظرت را انتخاب کن." : pending ? "دعوت را باز کن؛ می‌توانی کد بسازی یا وضعیت پذیرش همراهت را ببینی." : "فقط یکی از شما دعوت را می‌سازد. نفر دوم کد را با حساب خودش می‌پذیرد؛ بعد آزمون را انتخاب می‌کنید.";
  const focusConnections = Boolean(publicationId || (!hasAssessments && (linked || pending)));

  return <main className={styles.page} dir="rtl">
    <Link href="/assessment" className={styles.back}><ArrowRight size={16} aria-hidden="true" />همه آزمون‌ها</Link>
    <header className={styles.heading}><span aria-hidden="true"><HeartHandshake size={28} strokeWidth={1.6} /></span><div><h1>آزمون زوجی</h1><p>یک مسیر مشترک، با حساب‌ها و پاسخ‌های مستقل</p></div></header>

    <section className={styles.overview} aria-labelledby="couples-next-title" aria-busy={loading}>
      <span className={styles.eyebrow}><Users size={16} aria-hidden="true" />{hasHistory ? "قدم بعدی شما" : "شروع همراهی"}</span>
      <h2 id="couples-next-title">{nextTitle}</h2><p>{nextDescription}</p>
      <div className={styles.overviewActions} hidden={startOpen && !hasHistory && !hasLoadError}>
        {!loading && (hasHistory || hasLoadError) ? <Link href="#couples-history" className={startOpen ? styles.secondary : styles.primary} onClick={() => setHistoryView(hasLoadError ? sessions.error ? "connections" : "assessments" : focusConnections ? "connections" : "assessments")}>{hasLoadError ? "بررسی وضعیت و تلاش دوباره" : focusConnections ? linked ? "انتخاب همراه و آزمون" : "پیگیری دعوت همراه" : "دیدن ارزیابی‌های من"}<ArrowLeft size={18} aria-hidden="true" /></Link> : <button type="button" className={styles.primary} onClick={() => openStart("invite")} disabled={busy}>دعوت همراهم<UserPlus size={18} aria-hidden="true" /></button>}
        <button type="button" className={styles.secondary} onClick={() => openStart("accept")} disabled={busy}><Mail size={18} aria-hidden="true" />کد دعوت دارم</button>
        {!loading && hasHistory && <button type="button" className={styles.quiet} onClick={() => openStart("invite")} disabled={busy}>دعوت همراه جدید</button>}
      </div>
      <ol className={styles.steps} aria-label="مسیر کلی ارزیابی زوجی">
        <li><Users size={18} aria-hidden="true" /><div>دعوت و اتصال<span>هر نفر با حساب خودش</span></div></li>
        <li><ClipboardList size={18} aria-hidden="true" /><div>انتخاب و پاسخ‌گویی<span>با رضایت جداگانه هر دو نفر</span></div></li>
        <li><HeartHandshake size={18} aria-hidden="true" /><div>نتیجه مشترک<span>پس از تکمیل شرایط هر دو نفر</span></div></li>
      </ol>
    </section>

    {startOpen && <section className={styles.workspace} aria-labelledby="couples-start-title">
      <div className={styles.sectionHeading}><div><h2 id="couples-start-title" ref={startHeading} tabIndex={-1}>{mode === "invite" ? "دعوت همراهم" : "پذیرش دعوت همراه"}</h2><p>هر دو نفر باید حساب کاربری مستقل داشته باشید.</p></div></div>
      <div className={styles.switch} role="group" aria-label="انتخاب روش همراهی">
        <button type="button" aria-pressed={mode === "invite"} aria-controls="couples-invite-panel" disabled={busy} onClick={() => setMode("invite")}><UserPlus size={18} aria-hidden="true" />دعوت می‌سازم</button>
        <button type="button" aria-pressed={mode === "accept"} aria-controls="couples-accept-panel" disabled={busy} onClick={() => setMode("accept")}><Mail size={18} aria-hidden="true" />کد دعوت دارم</button>
      </div>
      <div id="couples-invite-panel" hidden={mode !== "invite"}><CoupleInviteFlow key={authentication.user.id} token={token} userId={authentication.user.id} publicationId={publicationId} onBusyChange={setBusy} onInvited={() => { void sessions.reload(); }} /></div>
      <div id="couples-accept-panel" hidden={mode !== "accept"}><CoupleAcceptFlow key={authentication.user.id} token={token} publicationId={publicationId} onBusyChange={setBusy} /></div>
    </section>}

    {(hasHistory || loading || sessions.error || assessments.error) && <section id="couples-history" className={styles.history} aria-labelledby="couples-history-title" tabIndex={-1}>
      <div className={styles.sectionHeading}><div><h2 id="couples-history-title">پیگیری شما</h2><p>برای ادامه، دعوت یا ارزیابی موردنظرت را باز کن.</p></div><button type="button" className={styles.quiet} disabled={loading || busy} onClick={refresh}><RefreshCw size={16} aria-hidden="true" />به‌روزرسانی</button></div>
      <div className={styles.switch} role="group" aria-label="نوع سوابق زوجی">
        <button type="button" aria-pressed={view === "connections"} aria-controls="couples-history-panel" onClick={() => setHistoryView("connections")}>همراهی‌ها {sessions.data ? `(${toP(sessions.data.total)})` : ""}</button>
        <button type="button" aria-pressed={view === "assessments"} aria-controls="couples-history-panel" onClick={() => setHistoryView("assessments")}>ارزیابی‌ها {assessments.data ? `(${toP(assessments.data.total)})` : ""}</button>
      </div>
      <div id="couples-history-panel">
        {view === "connections" ? <><PatientResourceState {...sessions} retry={() => void sessions.reload()} />
          <div className={styles.list}>{sessions.data?.items.map((item, index) => {
            const state = linkStates[item.state] ?? { title: "بررسی همراهی", description: "وضعیت دعوت و اتصال را بررسی کن.", action: "مشاهده جزئیات" };
            const Icon = item.state === "LINKED" ? Check : item.state === "AWAITING_PARTNER" ? Clock3 : Users;
            return <Link key={item.id} href={toLink(item.id)} className={styles.item}><Icon size={22} aria-hidden="true" /><div className={styles.itemBody}><div className={styles.itemMeta}><span>همراهی {toP((page - 1) * (sessions.data?.pageSize ?? 20) + index + 1)}</span><span>{new Date(item.createdAt).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" })}</span></div><h3>{state.title}</h3><p>{state.description}</p><span className={styles.itemAction}>{state.action}<ArrowLeft size={16} aria-hidden="true" /></span></div></Link>;
          })}</div>
          {sessions.data?.total === 0 && <div className={styles.empty}><h3>هنوز همراهی ثبت نشده</h3><p>دعوت بساز یا کدی را که از همراهت گرفته‌ای وارد کن. برای شروع، یک دعوت کافی است.</p><button type="button" className={styles.quiet} onClick={() => openStart("invite")} disabled={busy}>شروع همراهی<ArrowLeft size={16} aria-hidden="true" /></button></div>}
          {sessions.data && <PatientPagination page={page} total={sessions.data.total} onChange={setPage} />}
        </> : <><PatientResourceState {...assessments} retry={() => void assessments.reload()} />
          <div className={styles.list}>{assessments.data?.items.map(item => {
            const withdrawn = Boolean(item.ownConsent.withdrawnAt);
            const ownAccepted = Boolean(item.ownConsent.acceptedAt && !withdrawn);
            const title = withdrawn ? "رضایت پس گرفته شده" : !ownAccepted ? "نیاز به رضایت شما" : !item.mutualConsentComplete ? "در انتظار رضایت همراه" : "رضایت‌ها تکمیل شده";
            const description = withdrawn ? "وضعیت ارزیابی و دسترسی‌ها را بررسی کن." : !ownAccepted ? "قبل از پاسخ‌گویی، شرایط این ارزیابی را بخوان و تصمیم بگیر." : !item.mutualConsentComplete ? "رضایت تو ثبت شده؛ برای ادامه، همراهت هم باید شرایط را بپذیرد." : "وضعیت پرداخت، آزمون خودت و نتیجه مشترک را از اینجا ببین.";
            return <Link key={item.id} href={`/assessment/couples/${encodeURIComponent(item.id)}`} className={styles.item}><ClipboardList size={22} aria-hidden="true" /><div className={styles.itemBody}><div className={styles.itemMeta}><span className={styles.badge}>{title}</span></div><h3>{item.title}</h3><p>{description}</p><span className={styles.itemAction}>{!ownAccepted && !withdrawn ? "بررسی شرایط ارزیابی" : "باز کردن ارزیابی"}<ArrowLeft size={16} aria-hidden="true" /></span></div></Link>;
          })}</div>
          {assessments.data?.total === 0 && <div className={styles.empty}><h3>هنوز آزمون مشترکی انتخاب نشده</h3><p>پس از پذیرفته‌شدن دعوت، از بخش همراهی‌ها آزمونتان را انتخاب کنید.</p><button type="button" className={styles.quiet} onClick={() => setHistoryView("connections")}>دیدن همراهی‌ها<ArrowLeft size={16} aria-hidden="true" /></button></div>}
          {assessments.data && <PatientPagination page={assessmentPage} total={assessments.data.total} onChange={setAssessmentPage} />}
        </>}
      </div>
    </section>}

    <details className={styles.help} onToggle={event => setIdentityOpen(event.currentTarget.open)}><summary>شناسه من برای دعوت کجاست؟</summary><p>اگر همراهت می‌خواهد دعوتت کند، شناسه بیمار خودت و شماره موبایلی که با آن ثبت‌نام کرده‌ای را فقط برای او بفرست.</p>{identityOpen && <InvitationIdentity token={token} />}</details>
    <aside className={styles.privacy}><ShieldCheck size={20} aria-hidden="true" /><p>پاسخ‌ها و نتیجه فردی‌ات خصوصی می‌مانند. اتصال حساب‌ها اجازه دیدن آن‌ها را به همراه نمی‌دهد؛ نتیجه مشترک به رضایت جداگانه هر دو نفر نیاز دارد.</p></aside>
  </main>;
}

function InvitationIdentity({ token }: { token: string }) {
  const profile = usePatientResource(useCallback(() => loadSelfProfile(token), [token]));
  return <div className={styles.flow}><PatientResourceState {...profile} retry={() => void profile.reload()} />{profile.data && <CopyValue value={profile.data.patientId} label="شناسه بیمار من" id="couples-own-id" />}</div>;
}
export default function CouplesPage() {
  return <Suspense fallback={<p role="status" className="p-5 text-sm text-muted-foreground">در حال آماده‌سازی صفحه زوجی…</p>}><CouplesHub /></Suspense>;
}
