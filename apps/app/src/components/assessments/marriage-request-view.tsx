"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { marriageAccountRecovery, marriageError } from '@/lib/marriage-errors';
import { marriageHref } from '@/lib/marriage-context';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Check, CheckCircle2, ChevronDown, Copy, HeartHandshake, Share2 } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { PolicyAcceptance } from '@/components/shared/policy-acceptance';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { usePatientResource } from '@/lib/use-patient-resource';
import { marriageRequestLoader } from '@/lib/marriage-request-loader';
import { marriageLoginUrl } from '@/lib/api';
import { formatRial } from '@/lib/wallet-money';
import { describeMarriageRequest } from '@/lib/marriage-request-guidance';
import { coupleStartHref } from '@/lib/couples-flow';
import { EducationalCoupleWorkspace } from './educational-couples';
import { reviewMarriageRequest, getMarriageRequest, acceptMarriageRequest, cancelMarriageRequest, sendMarriageSms, declineMarriageRequest } from '@/lib/marriage-api';

const button = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const secondary = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const dangerButton = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600';
const statuses: Record<string,string> = { PENDING: 'منتظر پاسخ نفر دوم', ACCEPTED: 'دعوت پذیرفته شد', CANCELLED: 'دعوت لغو شده', REPLACED: 'دعوت جایگزین شده' };
const ineligibility: Record<string,string> = { PROFILE_INCOMPLETE: 'مشخصات خودت برای بررسی شرایط کامل نیست.', GENDER_NOT_ALLOWED: 'جنسیت ثبت‌شدهٔ شما با شرایط این نقش سازگار نیست.', AGE_BELOW_MINIMUM: 'سن ثبت‌شدهٔ شما کمتر از حداقل سن این نقش است.' };
const smsStatuses: Record<string,string> = { QUEUED: 'پیامک در صف ارسال است.', SENDING: 'در حال بررسی ارسال پیامک…', ACCEPTED: 'ارسال پیامک توسط سرویس‌دهنده پذیرفته شد؛ تحویل قطعی تأیید نشده است.', FAILED: 'ارسال پیامک انجام نشد؛ لینک دعوت همچنان قابل استفاده است.', UNKNOWN: 'وضعیت ارسال مشخص نیست. پیش از ارسال دوباره، از نفر دوم بپرس.' };
const emptySubscribe = () => () => {};
const clientOrigin = () => window.location.origin;
const serverOrigin = () => '';
const clientCanShare = () => typeof navigator.share === 'function';
const serverCanShare = () => false;



export function MarriageRequestView({ id }: { id: string }) {
  const { authentication, logout } = useAuthSession();
  const token = authentication.accessToken;
  const scope = id + ':' + authentication.user.id;
  const loader = useMemo(() => {
    const requestId = scope.split(':')[0];
    return marriageRequestLoader(
      accessToken => getMarriageRequest(accessToken!, requestId),
      accessToken => reviewMarriageRequest(accessToken!, requestId),
    );
  }, [scope]);
  const resource = usePatientResource(useCallback(() => loader.load(token), [loader, token]));
  const refresh = resource.refresh;
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(emptySubscribe, clientOrigin, serverOrigin);
  const canShare = useSyncExternalStore(emptySubscribe, clientCanShare, serverCanShare);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const lock = useRef(false);
  const smsKey = useRef<string | null>(null);
  const copyTimer = useRef<number | null>(null);
  const data = resource.data;

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (data?.status !== 'PENDING') return;
    const timer = window.setInterval(() => {
      if (!lock.current && document.visibilityState === 'visible' && navigator.onLine) {
        void refresh();
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [data?.status, refresh]);

  const retry = () => {
    loader.reviewAgain();
    void resource.refresh();
  };

  const run = async (action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (loader.pending) await loader.pending.catch(() => null);
      await action();
      loader.mutationSucceeded();
      await resource.refresh();
    } catch (cause) {
      setError(marriageError(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const guidance = data
    ? describeMarriageRequest({
        status: data.status,
        isInitiator: data.isInitiator,
        ownEligible: data.ownEligible,
        profileRequired: Boolean(data.continuation?.profileRequired),
        hasEducationalId: Boolean(data.educationalId),
      })
    : null;

  const copyInvitation = () => {
    if (!data) return;
    const url = new URL(data.invitationPath, window.location.origin).toString();
    void navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        setNotice('لینک دعوت کپی شد؛ اون رو برای نفر دوم بفرست.');
        if (copyTimer.current) window.clearTimeout(copyTimer.current);
        copyTimer.current = window.setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        setCopied(false);
        setNotice('لینک را از کادر بالا انتخاب و کپی کن.');
      });
  };

  const shareInvitation = () => {
    if (!data || typeof navigator.share !== 'function') return;
    const url = new URL(data.invitationPath, window.location.origin).toString();
    void navigator.share({
      title: data.service.title,
      text: `دعوت به شرکت در «${data.service.title}» در سبز زندگی:`,
      url,
    }).catch(() => null);
  };

  return (
    <ServicePage
      title={data?.service.title ?? 'پیگیری دعوت'}
      description="وضعیت دعوت و کار بعدی را همین‌جا ببین."
      icon={HeartHandshake}
      backHref="/assessment/couples"
      backLabel="تست‌های دو نفره"
    >
      <div className="service-detail mx-auto w-full max-w-2xl space-y-4">
        <PatientResourceState
          variant="detail"
          {...resource}
          error={resource.error ? marriageError(loader.failure) : null}
          retry={retry}
        />

        {resource.error && !data && marriageAccountRecovery(loader.failure) && (
          <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
            <p className="text-sm leading-7 text-muted-foreground">
              برای پذیرش دعوت باید با همان شمارهٔ موبایلی وارد شوی که دعوت برایش ارسال شده است.
            </p>
            <button
              type="button"
              className={secondary + ' mt-3'}
              onClick={() => void (async () => {
                if (await logout()) window.location.assign(marriageLoginUrl());
              })()}
            >
              ورود با شمارهٔ دعوت‌شده
            </button>
          </div>
        )}

        {data && (
          <>
            {data.status !== 'CANCELLED' && data.status !== 'REPLACED' && (
              <ol
                aria-label="مراحل انجام تست دو نفره"
                className="grid grid-cols-2 gap-2 rounded-2xl border border-border/80 bg-white p-2.5 text-xs shadow-2xs sm:grid-cols-4"
              >
                {[
                  { label: '۱. ارسال دعوت', done: true, current: false },
                  {
                    label: '۲. پذیرش همراه',
                    done: data.status === 'ACCEPTED',
                    current: data.status === 'PENDING',
                  },
                  {
                    label: '۳. پاسخ‌گویی دو نفر',
                    done: false,
                    current: data.status === 'ACCEPTED',
                  },
                  { label: '۴. نتیجه مشترک', done: false, current: false },
                ].map(step => (
                  <li
                    key={step.label}
                    aria-current={step.current ? 'step' : undefined}
                    className={[
                      'flex items-center gap-2 rounded-xl px-2.5 py-2 font-semibold leading-5',
                      step.current
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                        : step.done
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-muted/40 text-muted-foreground',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        step.current
                          ? 'bg-primary text-white'
                          : step.done
                            ? 'bg-emerald-600 text-white'
                            : 'bg-border text-muted-foreground',
                      ].join(' ')}
                    >
                      {step.done ? <Check size={12} aria-hidden="true" /> : '•'}
                    </span>
                    <span className="min-w-0">{step.label}</span>
                  </li>
                ))}
              </ol>
            )}

            <section aria-live="polite" className="rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={[
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                    data.status === 'ACCEPTED'
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
                      : data.status === 'PENDING'
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                        : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {statuses[data.status] ?? 'وضعیت دعوت'}
                </span>
                <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {data.isInitiator ? 'دعوت ارسالی' : 'دعوت دریافتی'}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold leading-8 text-foreground">{guidance?.title}</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">{guidance?.description}</p>
              {data.status === 'CANCELLED' && (
                <p className="mt-3 rounded-xl bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
                  در صورت پرداخت قبلی، هزینهٔ این دعوت به کیف پول دعوت‌کننده بازگردانده شده است.
                </p>
              )}

              <dl className="mt-4 grid gap-2.5 border-t border-border/70 pt-4 text-sm sm:grid-cols-2">
                {data.isInitiator && data.recipientPhoneMasked && (
                  <div className="min-w-0 rounded-xl bg-muted/25 px-3.5 py-2.5">
                    <dt className="text-xs text-muted-foreground">شماره نفر دوم</dt>
                    <dd className="mt-1 font-bold text-foreground"><bdi dir="ltr">{data.recipientPhoneMasked}</bdi></dd>
                  </div>
                )}
                {!data.isInitiator && data.initiatorName && (
                  <div className="min-w-0 rounded-xl bg-muted/25 px-3.5 py-2.5">
                    <dt className="text-xs text-muted-foreground">دعوت‌کننده</dt>
                    <dd className="mt-1 font-bold text-foreground">{data.initiatorName}</dd>
                  </div>
                )}
                <div className="rounded-xl bg-muted/25 px-3.5 py-2.5">
                  <dt className="text-xs text-muted-foreground">نقش شما</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {data.service.definition.roles.find(role => role.id === data.ownRole)?.title ?? 'در حال بررسی'}
                  </dd>
                </div>
                <div className="rounded-xl bg-muted/25 px-3.5 py-2.5">
                  <dt className="text-xs text-muted-foreground">هزینهٔ کل دو نفر</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatRial(BigInt(data.service.amountRial))} تومان
                    {data.status !== 'CANCELLED' && (
                      <span className="mr-1.5 text-xs font-semibold text-emerald-700">(پرداخت‌شده)</span>
                    )}
                  </dd>
                </div>
              </dl>

              <details className="group mt-3.5 border-t border-border/60 pt-2">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted-foreground sm:text-sm [&::-webkit-details-marker]:hidden">
                  شرایط و جزئیات دعوت
                  <ChevronDown aria-hidden="true" size={16} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-1.5 pb-1 pt-1 text-xs leading-6 text-muted-foreground">
                  <p>
                    زمان دعوت: {new Date(data.createdAt).toLocaleString('fa-IR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Asia/Tehran',
                    })}
                  </p>
                  {data.service.definition.roles.map(role => (
                    <p key={role.id}>
                      {role.title}: حداقل {role.minimumAgeYears.toLocaleString('fa-IR')} سال؛
                      {' '}{role.genders.map(gender => gender === 'MALE' ? 'آقا' : 'خانم').join(' یا ')}
                    </p>
                  ))}
                </div>
              </details>
            </section>

            {data.eligibilityNotConfirmed && (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                شرایط شرکت در این تست هنوز تأیید نشده است.
              </p>
            )}

            {(!data.ownEligible || data.continuation?.profileRequired) && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
                <p className="text-sm font-medium leading-7 text-amber-950">
                  {ineligibility[data.ownIneligibilityReason ?? ''] ??
                    'برای ادامه، مشخصات و شرایط نقش خودت را بررسی کن.'}
                </p>
                {(data.ownIneligibilityReason !== 'AGE_BELOW_MINIMUM' ||
                  data.continuation?.profileRequired) && (
                  <Link
                    href={marriageHref(
                      data.continuation?.profileRequired
                        ? '/welcome?returnTo=' + encodeURIComponent(data.invitationPath)
                        : '/profile/edit?returnTo=' + encodeURIComponent(data.invitationPath),
                    )}
                    className={button + ' mt-4'}
                  >
                    {data.continuation?.profileRequired
                      ? 'تکمیل مشخصات و ادامه'
                      : 'ویرایش مشخصات من'}
                  </Link>
                )}
              </section>
            )}

            {data.status === 'PENDING' && data.isInitiator && (
              <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5">
                <label className="block space-y-2 text-sm">
                  <span className="font-bold text-foreground">لینک اختصاصی دعوت نفر دوم</span>
                  <input
                    dir="ltr"
                    readOnly
                    value={origin ? new URL(data.invitationPath, origin).toString() : data.invitationPath}
                    onFocus={event => event.currentTarget.select()}
                    className="block min-h-12 w-full rounded-xl border border-border bg-muted/30 px-3.5 text-left text-xs font-medium text-foreground sm:text-sm"
                  />
                </label>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  <button type="button" className={button} disabled={busy} onClick={copyInvitation}>
                    {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                    {copied ? 'لینک دعوت کپی شد' : 'کپی لینک دعوت'}
                  </button>
                  {canShare ? (
                    <button type="button" className={secondary} disabled={busy} onClick={shareInvitation}>
                      <Share2 size={17} aria-hidden="true" />
                      اشتراک‌گذاری لینک
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={secondary}
                      disabled={busy || data.smsStatus === 'QUEUED' || data.smsStatus === 'SENDING'}
                      onClick={() => void run(async () => {
                        const key = smsKey.current ??= crypto.randomUUID();
                        await sendMarriageSms(token, id, key);
                        smsKey.current = null;
                      })}
                      aria-busy={Boolean(busy)}
                    >
                      {busy ? <><HeartbeatLoader />در حال ثبت درخواست…</> : 'ارسال پیامک دعوت'}
                    </button>
                  )}
                </div>
                {canShare && (
                  <button
                    type="button"
                    className={secondary + ' mt-2.5'}
                    disabled={busy || data.smsStatus === 'QUEUED' || data.smsStatus === 'SENDING'}
                    onClick={() => void run(async () => {
                      const key = smsKey.current ??= crypto.randomUUID();
                      await sendMarriageSms(token, id, key);
                      smsKey.current = null;
                    })}
                    aria-busy={Boolean(busy)}
                  >
                    {busy ? <><HeartbeatLoader />در حال ثبت درخواست…</> : 'ارسال پیامک دعوت'}
                  </button>
                )}
                {notice && (
                  <p role="status" className="mt-3 rounded-xl bg-primary/8 px-3.5 py-2.5 text-xs font-semibold leading-6 text-primary">
                    {notice}
                  </p>
                )}
                {data.smsStatus && (
                  <p role="status" className="mt-3 rounded-xl bg-muted/40 px-3.5 py-2 text-xs leading-6 text-muted-foreground">
                    {smsStatuses[data.smsStatus] ?? 'وضعیت ارسال پیامک مشخص نیست.'}
                  </p>
                )}
                <details className="group mt-4 border-t border-border/70 pt-2">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted-foreground sm:text-sm [&::-webkit-details-marker]:hidden">
                    تغییر شماره یا لغو دعوت
                    <ChevronDown aria-hidden="true" size={16} className="transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-2.5 pb-1 pt-2.5">
                    <Link
                      aria-disabled={busy}
                      onClick={event => { if (lock.current) event.preventDefault(); }}
                      className={secondary}
                      href={marriageHref(
                        '/assessment/marriage/new/' + data.service.publicationId +
                        '?replaceRequestId=' + encodeURIComponent(id),
                      )}
                    >
                      تغییر شماره نفر دوم (لینک قبلی غیرفعال می‌شود)
                    </Link>
                    <button type="button" className={secondary + ' text-red-700 hover:bg-red-50/60'} disabled={busy} onClick={() => setConfirmCancel(true)}>
                      لغو این دعوت و بازگشت وجه به کیف پول
                    </button>
                  </div>
                </details>
              </section>
            )}

            {data.status === 'PENDING' && !data.isInitiator &&
              data.ownEligible && !data.continuation?.profileRequired && (
                <section className="space-y-4 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5">
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-medium leading-6 text-emerald-900 sm:text-sm">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>هزینه این تست توسط دعوت‌کننده پرداخت شده است و شما نیازی به پرداخت ندارید.</span>
                  </div>
                  <PolicyAcceptance
                    variant="compact"
                    policy={{ title: 'پذیرش نقش و دعوت', body: data.service.linkingPolicy.body }}
                    accepted={accepted}
                    onChange={setAccepted}
                    disabled={busy}
                    label="نقش خودم و شرایط اتصال برای همین خدمت را می‌پذیرم."
                  />
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      className={button}
                      disabled={busy || !accepted}
                      onClick={() => void run(() => acceptMarriageRequest(token, id, {
                        consentPolicyVersionId: data.service.linkingPolicy.id,
                        consentAccepted: true,
                      }))}
                      aria-busy={Boolean(busy)}
                    >
                      {busy ? <><HeartbeatLoader />در حال ثبت پذیرش…</> : 'پذیرش دعوت و ادامه'}
                    </button>
                    <button
                      type="button"
                      className={secondary}
                      disabled={busy}
                      onClick={() => setConfirmDecline(true)}
                    >
                      رد دعوت
                    </button>
                  </div>
                </section>
              )}

            {data.status === 'ACCEPTED' && data.educationalId &&
              !data.continuation?.profileRequired && (
                <section aria-label="ادامه تست دو نفره" className="space-y-3">
                  <EducationalCoupleWorkspace
                    token={token}
                    userId={authentication.user.id}
                    id={data.educationalId}
                    embedded
                    prepaidMarriage
                  />
                </section>
              )}

            {data.status === 'ACCEPTED' && !data.educationalId && (
              <button type="button" className={secondary} onClick={retry}>
                به‌روزرسانی وضعیت
              </button>
            )}

            {(data.status === 'CANCELLED' || data.status === 'REPLACED') &&
              data.isInitiator && (
                <Link
                  className={secondary}
                  href={coupleStartHref(data.service.publicationId)}
                >
                  ساخت دعوت جدید
                </Link>
              )}
          </>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-7 text-red-700">
            {error}
          </p>
        )}
      </div>

      {confirmCancel && (
        <BottomSheet
          title="لغو دعوت"
          onClose={() => { if (!lock.current) setConfirmCancel(false); }}
          onBeforeClose={() => !lock.current}
        >
          <div className="space-y-3">
            <p className="text-sm leading-8 text-foreground">
              با لغو دعوت، این لینک غیرفعال شده و هزینهٔ پرداختی به کیف پول شما بازگردانده می‌شود. دعوت لغو شود؟
            </p>
            <button
              type="button"
              className={dangerButton}
              disabled={busy}
              onClick={() => void run(async () => {
                await cancelMarriageRequest(token, id);
                setConfirmCancel(false);
              })}
              aria-busy={Boolean(busy)}
            >
              {busy ? <><HeartbeatLoader />در حال لغو…</> : 'تأیید لغو دعوت و استرداد وجه'}
            </button>
            <button type="button" className={secondary} disabled={busy} onClick={() => setConfirmCancel(false)}>
              انصراف
            </button>
          </div>
        </BottomSheet>
      )}

      {confirmDecline && (
        <BottomSheet
          title="رد دعوت"
          onClose={() => { if (!lock.current) setConfirmDecline(false); }}
          onBeforeClose={() => !lock.current}
        >
          <div className="space-y-3">
            <p className="text-sm leading-8 text-foreground">
              با رد دعوت، فرایند تست متوقف شده و مبلغ پرداختی به کیف پول دعوت‌کننده بازگردانده می‌شود. آیا از رد این دعوت اطمینان دارید؟
            </p>
            <button
              type="button"
              className={dangerButton}
              disabled={busy}
              onClick={() => void run(async () => {
                await declineMarriageRequest(token, id);
                setConfirmDecline(false);
              })}
              aria-busy={Boolean(busy)}
            >
              {busy ? <><HeartbeatLoader />در حال ثبت…</> : 'تأیید و رد دعوت'}
            </button>
            <button type="button" className={secondary} disabled={busy} onClick={() => setConfirmDecline(false)}>
              انصراف
            </button>
          </div>
        </BottomSheet>
      )}
    </ServicePage>
  );
}
