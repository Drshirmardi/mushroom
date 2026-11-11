'use client';
import { LoadingState } from '@/components/shared/skeletons';

import Link from 'next/link';
import { EducationalCoupleHistory } from '@/components/assessments/educational-couples';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Clock3,
  HeartHandshake,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { CoupleAcceptFlow, CopyValue } from '@/components/assessments/couple-invitation-flow';
import { listCoupleSessions, listCoupleAssessments } from '@/lib/couples-api';
import { loadSelfProfile } from '@/lib/onboarding/patient-onboarding';
import { usePatientResource } from '@/lib/use-patient-resource';
import { toP } from '@/lib/format';

const primaryBtnClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryBtnClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50';
const quietBtnClass =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5 disabled:opacity-50';

const linkStates: Record<string, { title: string; description: string; action: string }> = {
  AWAITING_PARTNER: {
    title: 'در انتظار همراه',
    description: 'دعوت را تکمیل کن یا اگر کد را فرستاده‌ای، پذیرش همراهت را پیگیری کن.',
    action: 'تکمیل و پیگیری دعوت',
  },
  LINKED: {
    title: 'همراهی متصل است',
    description: 'هر دو نفر اتصال را پذیرفته‌اید. حالا می‌توانید آزمون مشترکتان را انتخاب کنید.',
    action: 'انتخاب آزمون زوجی',
  },
  CONSENT_REVOKED: {
    title: 'همراهی متوقف شده',
    description: 'رضایت اتصال پس گرفته شده است؛ وضعیت و سوابق را از اینجا بررسی کن.',
    action: 'بررسی همراهی',
  },
};

function CouplesHub() {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const publicationId = useSearchParams().get('publicationId');
  const [page, setPage] = useState(1);
  const [assessmentPage, setAssessmentPage] = useState(1);
  const [startOpen, setStartOpen] = useState(false);
  const [mode, setMode] = useState<'invite' | 'accept'>('accept');
  const [historyView, setHistoryView] = useState<'assessments' | 'connections' | null>(null);
  const [busy, setBusy] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const startHeading = useRef<HTMLHeadingElement>(null);
  const sessions = usePatientResource(
    useCallback(() => listCoupleSessions(token, page), [token, page]),
  );
  const assessments = usePatientResource(
    useCallback(() => listCoupleAssessments(token, assessmentPage), [token, assessmentPage]),
  );
  const loading = sessions.loading || assessments.loading;
  const hasHistory = (sessions.data?.total ?? 0) > 0 || (assessments.data?.total ?? 0) > 0;
  const linked = sessions.data?.items.find((item) => item.state === 'LINKED');
  const pending = sessions.data?.items.find((item) => item.state === 'AWAITING_PARTNER');
  const view =
    historyView ?? (publicationId || !assessments.data?.total ? 'connections' : 'assessments');
  const toLink = (id: string) =>
    `/assessment/couples/links/${encodeURIComponent(id)}${publicationId ? `?publicationId=${encodeURIComponent(publicationId)}` : ''}`;

  useEffect(() => {
    if (sessions.data?.total === 0 && assessments.data?.total === 0) setStartOpen(true);
  }, [sessions.data?.total, assessments.data?.total]);
  const openStart = (next: typeof mode) => {
    setMode(next);
    setStartOpen(true);
    requestAnimationFrame(() => {
      startHeading.current?.focus();
      startHeading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  };
  const refresh = () => {
    void sessions.reload();
    void assessments.reload();
  };
  const hasLoadError = Boolean(sessions.error || assessments.error);
  const hasAssessments = (assessments.data?.total ?? 0) > 0;
  const nextTitle = loading
    ? 'در حال پیدا کردن مسیر شما…'
    : hasLoadError
      ? 'وضعیت قبلی‌ات کامل دریافت نشد'
      : publicationId && linked
        ? 'آزمونت انتخاب شده؛ همراه را مشخص کن'
        : hasAssessments
          ? 'ارزیابی‌تان را از همین‌جا ادامه بده'
          : linked
            ? 'همراهت متصل است؛ آزمون را انتخاب کنید'
            : pending
              ? 'یک دعوت منتظر تکمیل است'
              : 'اول همراه شو، بعد آزمون را شروع کن';
  const nextDescription = loading
    ? 'دعوت‌ها و ارزیابی‌های قبلی‌ات را بررسی می‌کنیم.'
    : hasLoadError
      ? 'از بخش پیگیری، دریافت اطلاعات را دوباره امتحان کن. اگر کد دعوت داری، همچنان می‌توانی آن را بررسی کنی.'
      : publicationId
        ? 'از همراهی‌های موجود انتخاب کن؛ اگر همراه جدیدی داری، دعوتش کن.'
        : hasAssessments
          ? 'شرایط، پرداخت، پاسخ‌گویی و نتیجه هر ارزیابی، در صفحه همان ارزیابی در دسترس است.'
          : linked
            ? 'نیازی به دعوت دوباره نیست. از همراهی موجود، آزمون موردنظرت را انتخاب کن.'
            : pending
              ? 'دعوت را باز کن؛ می‌توانی کد بسازی یا وضعیت پذیرش همراهت را ببینی.'
              : 'فقط یکی از شما دعوت را می‌سازد. نفر دوم کد را با حساب خودش می‌پذیرد؛ بعد آزمون را انتخاب می‌کنید.';
  const focusConnections = Boolean(publicationId || (!hasAssessments && (linked || pending)));

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pb-24" dir="rtl">
      <Link
        href="/assessment"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
      >
        <ArrowRight size={16} aria-hidden="true" />
        همه آزمون‌ها
      </Link>
      <header className="flex items-center gap-3.5 rounded-3xl border border-border/80 bg-white p-5 shadow-xs">
        <span
          aria-hidden="true"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          <HeartHandshake size={26} strokeWidth={1.8} />
        </span>
        <div>
          <h1 className="text-lg font-bold text-foreground sm:text-xl">آزمون زوجی</h1>
          <p className="mt-1 text-xs leading-6 text-muted-foreground sm:text-sm">
            یک مسیر مشترک، با حساب‌ها و پاسخ‌های مستقل
          </p>
        </div>
      </header>

      <section
        className="space-y-4 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-xs sm:p-6"
        aria-label={loading ? 'وضعیت همراهی' : undefined}
        aria-labelledby={loading ? undefined : 'couples-next-title'}
        aria-busy={loading}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <Users size={15} aria-hidden="true" />
          {hasHistory ? 'قدم بعدی شما' : 'شروع همراهی'}
        </span>
        {loading ? (
          <LoadingState variant="card" />
        ) : (
          <div className="space-y-1.5">
            <h2 id="couples-next-title" className="text-base font-bold text-foreground sm:text-lg">
              {nextTitle}
            </h2>
            <p className="text-xs leading-7 text-muted-foreground sm:text-sm">{nextDescription}</p>
          </div>
        )}
        <div
          className="flex flex-wrap items-center gap-2.5"
          hidden={startOpen && !hasHistory && !hasLoadError}
        >
          {!loading && (hasHistory || hasLoadError) ? (
            <Link
              href="#couples-history"
              className={startOpen ? secondaryBtnClass : primaryBtnClass}
              onClick={() =>
                setHistoryView(
                  hasLoadError
                    ? sessions.error
                      ? 'connections'
                      : 'assessments'
                    : focusConnections
                      ? 'connections'
                      : 'assessments',
                )
              }
            >
              {hasLoadError
                ? 'بررسی وضعیت و تلاش دوباره'
                : focusConnections
                  ? linked
                    ? 'انتخاب همراه و آزمون'
                    : 'پیگیری دعوت همراه'
                  : 'دیدن ارزیابی‌های من'}
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              className={primaryBtnClass}
              onClick={() => openStart('invite')}
              disabled={busy}
            >
              دعوت همراهم
              <UserPlus size={18} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className={secondaryBtnClass}
            onClick={() => openStart('accept')}
            disabled={busy}
          >
            <Mail size={18} aria-hidden="true" />
            کد دعوت دارم
          </button>
          {!loading && hasHistory && (
            <button
              type="button"
              className={quietBtnClass}
              onClick={() => openStart('invite')}
              disabled={busy}
            >
              دعوت همراه جدید
            </button>
          )}
        </div>
        <ol
          className="grid gap-2.5 pt-2 sm:grid-cols-3"
          aria-label="مسیر کلی ارزیابی زوجی"
        >
          <li className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-white p-3.5">
            <Users size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="text-xs font-bold text-foreground">
              دعوت و اتصال
              <span className="mt-0.5 block font-normal text-muted-foreground">
                هر نفر با حساب خودش
              </span>
            </div>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-white p-3.5">
            <ClipboardList size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="text-xs font-bold text-foreground">
              انتخاب و پاسخ‌گویی
              <span className="mt-0.5 block font-normal text-muted-foreground">
                با رضایت جداگانه هر دو نفر
              </span>
            </div>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-white p-3.5">
            <HeartHandshake
              size={18}
              className="mt-0.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="text-xs font-bold text-foreground">
              نتیجه مشترک
              <span className="mt-0.5 block font-normal text-muted-foreground">
                پس از تکمیل شرایط هر دو نفر
              </span>
            </div>
          </li>
        </ol>
      </section>

      {startOpen && (
        <section
          className="space-y-4 rounded-3xl border border-border/80 bg-white p-5 shadow-xs sm:p-6"
          aria-labelledby="couples-start-title"
        >
          <div>
            <h2
              id="couples-start-title"
              ref={startHeading}
              tabIndex={-1}
              className="text-base font-bold text-foreground"
            >
              {mode === 'invite' ? 'دعوت همراهم' : 'پذیرش دعوت همراه'}
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              هر دو نفر باید حساب کاربری مستقل داشته باشید.
            </p>
          </div>
          <div
            className="grid grid-cols-2 gap-1.5 rounded-2xl bg-muted/60 p-1.5"
            role="group"
            aria-label="انتخاب روش همراهی"
          >
            <button
              type="button"
              aria-pressed={mode === 'invite'}
              aria-controls="couples-invite-panel"
              disabled={busy}
              onClick={() => setMode('invite')}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition aria-pressed:bg-white aria-pressed:text-foreground aria-pressed:shadow-2xs"
            >
              <UserPlus size={16} aria-hidden="true" />
              دعوت می‌سازم
            </button>
            <button
              type="button"
              aria-pressed={mode === 'accept'}
              aria-controls="couples-accept-panel"
              disabled={busy}
              onClick={() => setMode('accept')}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition aria-pressed:bg-white aria-pressed:text-foreground aria-pressed:shadow-2xs"
            >
              <Mail size={16} aria-hidden="true" />
              کد دعوت دارم
            </button>
          </div>
          <div id="couples-invite-panel" hidden={mode !== 'invite'}>
            <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="text-sm leading-7 text-muted-foreground">
                دعوت‌های جدید با انتخاب خدمت و شماره همراه ساخته می‌شوند.
              </p>
              <Link href="/assessment/couples" className={primaryBtnClass}>
                انتخاب خدمت و دعوت تلفنی
              </Link>
            </div>
          </div>
          <div id="couples-accept-panel" hidden={mode !== 'accept'}>
            <CoupleAcceptFlow
              key={authentication.user.id}
              token={token}
              publicationId={publicationId}
              onBusyChange={setBusy}
            />
          </div>
        </section>
      )}

      {(hasHistory || loading || sessions.error || assessments.error) && (
        <section
          id="couples-history"
          className="space-y-4 rounded-3xl border border-border/80 bg-white p-5 shadow-xs sm:p-6"
          aria-labelledby="couples-history-title"
          tabIndex={-1}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="couples-history-title" className="text-base font-bold text-foreground">
                پیگیری شما
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                برای ادامه، دعوت یا ارزیابی موردنظرت را باز کن.
              </p>
            </div>
            <button
              type="button"
              className={quietBtnClass}
              disabled={loading || busy}
              onClick={refresh}
            >
              <RefreshCw size={15} aria-hidden="true" />
              به‌روزرسانی
            </button>
          </div>
          <div
            className="grid grid-cols-2 gap-1.5 rounded-2xl bg-muted/60 p-1.5"
            role="group"
            aria-label="نوع سوابق زوجی"
          >
            <button
              type="button"
              aria-pressed={view === 'connections'}
              aria-controls="couples-history-panel"
              onClick={() => setHistoryView('connections')}
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition aria-pressed:bg-white aria-pressed:text-foreground aria-pressed:shadow-2xs"
            >
              همراهی‌ها {sessions.data ? `(${toP(sessions.data.total)})` : ''}
            </button>
            <button
              type="button"
              aria-pressed={view === 'assessments'}
              aria-controls="couples-history-panel"
              onClick={() => setHistoryView('assessments')}
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition aria-pressed:bg-white aria-pressed:text-foreground aria-pressed:shadow-2xs"
            >
              ارزیابی‌ها {assessments.data ? `(${toP(assessments.data.total)})` : ''}
            </button>
          </div>
          <div id="couples-history-panel" className="space-y-3">
            {view === 'connections' ? (
              <>
                <PatientResourceState {...sessions} retry={() => void sessions.reload()} />
                <div className="grid gap-3">
                  {sessions.data?.items.map((item, index) => {
                    const state = linkStates[item.state] ?? {
                      title: 'بررسی همراهی',
                      description: 'وضعیت دعوت و اتصال را بررسی کن.',
                      action: 'مشاهده جزئیات',
                    };
                    const Icon =
                      item.state === 'LINKED'
                        ? Check
                        : item.state === 'AWAITING_PARTNER'
                          ? Clock3
                          : Users;
                    return (
                      <Link
                        key={item.id}
                        href={toLink(item.id)}
                        className="group flex items-start gap-3.5 rounded-2xl border border-border/80 bg-background/50 p-4 transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon size={20} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="font-bold text-foreground">
                              همراهی {toP((page - 1) * (sessions.data?.pageSize ?? 20) + index + 1)}
                            </span>
                            <span>
                              {new Date(item.createdAt).toLocaleDateString('fa-IR', {
                                timeZone: 'Asia/Tehran',
                              })}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-foreground">{state.title}</h3>
                          <p className="text-xs leading-6 text-muted-foreground">
                            {state.description}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                            {state.action}
                            <ArrowLeft size={15} aria-hidden="true" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {sessions.data?.total === 0 && (
                  <div className="space-y-2 rounded-2xl border border-dashed border-border p-5 text-center">
                    <h3 className="text-sm font-bold text-foreground">هنوز همراهی ثبت نشده</h3>
                    <p className="text-xs leading-6 text-muted-foreground">
                      دعوت بساز یا کدی را که از همراهت گرفته‌ای وارد کن. برای شروع، یک دعوت کافی
                      است.
                    </p>
                    <button
                      type="button"
                      className={quietBtnClass}
                      onClick={() => openStart('invite')}
                      disabled={busy}
                    >
                      شروع همراهی
                      <ArrowLeft size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
                {sessions.data && (
                  <PatientPagination page={page} total={sessions.data.total} onChange={setPage} />
                )}
              </>
            ) : (
              <>
                <PatientResourceState {...assessments} retry={() => void assessments.reload()} />
                <div className="grid gap-3">
                  {assessments.data?.items.map((item) => {
                    const withdrawn = Boolean(item.ownConsent.withdrawnAt);
                    const ownAccepted = Boolean(item.ownConsent.acceptedAt && !withdrawn);
                    const title = withdrawn
                      ? 'رضایت پس گرفته شده'
                      : !ownAccepted
                        ? 'نیاز به رضایت شما'
                        : !item.mutualConsentComplete
                          ? 'در انتظار رضایت همراه'
                          : 'رضایت‌ها تکمیل شده';
                    const description = withdrawn
                      ? 'وضعیت ارزیابی و دسترسی‌ها را بررسی کن.'
                      : !ownAccepted
                        ? 'قبل از پاسخ‌گویی، شرایط این ارزیابی را بخوان و تصمیم بگیر.'
                        : !item.mutualConsentComplete
                          ? 'رضایت تو ثبت شده؛ برای ادامه، همراهت هم باید شرایط را بپذیرد.'
                          : 'وضعیت پرداخت، آزمون خودت و نتیجه مشترک را از اینجا ببین.';
                    return (
                      <Link
                        key={item.id}
                        href={`/assessment/couples/${encodeURIComponent(item.id)}`}
                        className="group flex items-start gap-3.5 rounded-2xl border border-border/80 bg-background/50 p-4 transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ClipboardList size={20} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div>
                            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                              {title}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                          <p className="text-xs leading-6 text-muted-foreground">{description}</p>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                            {!ownAccepted && !withdrawn
                              ? 'بررسی شرایط ارزیابی'
                              : 'باز کردن ارزیابی'}
                            <ArrowLeft size={15} aria-hidden="true" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {assessments.data?.total === 0 && (
                  <div className="space-y-2 rounded-2xl border border-dashed border-border p-5 text-center">
                    <h3 className="text-sm font-bold text-foreground">
                      هنوز آزمون مشترکی انتخاب نشده
                    </h3>
                    <p className="text-xs leading-6 text-muted-foreground">
                      پس از پذیرفته‌شدن دعوت، از بخش همراهی‌ها آزمونتان را انتخاب کنید.
                    </p>
                    <button
                      type="button"
                      className={quietBtnClass}
                      onClick={() => setHistoryView('connections')}
                    >
                      دیدن همراهی‌ها
                      <ArrowLeft size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
                {assessments.data && (
                  <PatientPagination
                    page={assessmentPage}
                    total={assessments.data.total}
                    onChange={setAssessmentPage}
                  />
                )}
              </>
            )}
          </div>
        </section>
      )}

      <EducationalCoupleHistory token={token} />
      <details
        className="rounded-3xl border border-border/80 bg-white p-5 shadow-xs"
        onToggle={(event) => setIdentityOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-bold text-foreground">
          شناسه من برای دعوت کجاست؟
        </summary>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          اگر همراهت می‌خواهد دعوتت کند، شناسه بیمار خودت و شماره موبایلی که با آن ثبت‌نام کرده‌ای
          را فقط برای او بفرست.
        </p>
        {identityOpen && <InvitationIdentity token={token} />}
      </details>
      <aside className="flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <p>
          پاسخ‌ها و نتیجه فردی‌ات خصوصی می‌مانند. اتصال حساب‌ها اجازه دیدن آن‌ها را به همراه
          نمی‌دهد؛ نتیجه مشترک به رضایت جداگانه هر دو نفر نیاز دارد.
        </p>
      </aside>
    </main>
  );
}

function InvitationIdentity({ token }: { token: string }) {
  const profile = usePatientResource(useCallback(() => loadSelfProfile(token), [token]));
  return (
    <div className="mt-3 space-y-3">
      <PatientResourceState {...profile} retry={() => void profile.reload()} />
      {profile.data && (
        <CopyValue value={profile.data.patientId} label="شناسه بیمار من" id="couples-own-id" />
      )}
    </div>
  );
}
export default function CouplesPage() {
  return (
    <Suspense fallback={<LoadingState variant="list" className="p-4" />}>
      <CouplesHub />
    </Suspense>
  );
}
