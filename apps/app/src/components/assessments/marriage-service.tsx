"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { marriageAccountRecovery, marriageError, marriagePhoneError } from '@/lib/marriage-errors';
import { marriageHref } from '@/lib/marriage-context';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Copy, HeartHandshake, Share2 } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { PolicyAcceptance } from '@/components/shared/policy-acceptance';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { usePatientResource } from '@/lib/use-patient-resource';
import { listEducationalAssessmentOfferings, acceptAssessmentConsent } from '@/lib/digital-services-api';
import { marriageRequestLoader } from '@/lib/marriage-request-loader';
import { marriageLoginUrl } from '@/lib/api';
import { formatRial, normalizeDigits } from '@/lib/wallet-money';
import { describeMarriageRequest } from '@/lib/marriage-request-guidance';
import { canStartCoupleTest, coupleStartHref } from '@/lib/couples-flow';
import { EducationalCoupleWorkspace } from './educational-couples';
import { reviewMarriageRequest, getMarriageSettings, replaceMarriageRequest, createMarriageRequest, getMarriageRequest, acceptMarriageRequest, cancelMarriageRequest, sendMarriageSms, createMarriagePrepaidIntent, refundMarriagePrepayment, declineMarriageRequest } from '@/lib/marriage-api';

const button = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const secondary = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const dangerButton = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600';
const statuses: Record<string,string> = { PENDING: 'منتظر پاسخ نفر دوم', ACCEPTED: 'دعوت پذیرفته شد', CANCELLED: 'دعوت لغو شده', REPLACED: 'دعوت جایگزین شده' };
const ineligibility: Record<string,string> = { PROFILE_INCOMPLETE: 'مشخصات خودت برای بررسی شرایط کامل نیست.', GENDER_NOT_ALLOWED: 'جنسیت ثبت‌شدهٔ شما با شرایط این نقش سازگار نیست.', AGE_BELOW_MINIMUM: 'سن ثبت‌شدهٔ شما کمتر از حداقل سن این نقش است.' };
const smsStatuses: Record<string,string> = { QUEUED: 'پیامک در صف ارسال است.', SENDING: 'در حال بررسی ارسال پیامک…', ACCEPTED: 'ارسال پیامک توسط سرویس‌دهنده پذیرفته شد؛ تحویل قطعی تأیید نشده است.', FAILED: 'ارسال پیامک انجام نشد؛ لینک دعوت همچنان قابل استفاده است.', UNKNOWN: 'وضعیت ارسال مشخص نیست. پیش از ارسال دوباره، از نفر دوم بپرس.' };

export function MarriageNew({ publicationId, replacesId }: { publicationId: string; replacesId?: string }) {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const router = useRouter();
  const resource = usePatientResource(
    useCallback(() => getMarriageSettings(token, publicationId), [token, publicationId]),
  );
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [prepayBusy, setPrepayBusy] = useState(false);
  const [refundBusy, setRefundBusy] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const command = useRef<{ fingerprint: string; key: string } | null>(null);
  const prepayKeys = useRef<{ consentKey: string; intentKey: string; termsRecordId?: string } | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    if (phoneError && !busy) phoneInput.current?.focus();
  }, [phoneError, busy]);

  const data = resource.data;
  const isPrepaid = Boolean(replacesId || data?.prepayment?.status === 'PAID');
  const isPendingPayment = !replacesId && data?.prepayment?.status === 'PENDING';
  const ownRole = role || (data?.eligibleRoles.length === 1 ? data.eligibleRoles[0] : '');
  const returnTo = coupleStartHref(publicationId, replacesId);

  const handlePrepay = async () => {
    if (!data || prepayBusy || lock.current) return;
    lock.current = true;
    setPrepayBusy(true);
    setError('');
    try {
      const keys = prepayKeys.current ??= {
        consentKey: crypto.randomUUID(),
        intentKey: crypto.randomUUID(),
      };
      let termsRecordId = keys.termsRecordId ?? '';
      if (data.termsPolicy && !termsRecordId) {
        const consent = await acceptAssessmentConsent(token, {
          policyVersionId: data.termsPolicy.id,
          contentHash: data.termsPolicy.contentHash,
          accepted: true,
        }, keys.consentKey);
        termsRecordId = consent.id;
        keys.termsRecordId = termsRecordId;
      }
      const intent = await createMarriagePrepaidIntent(token, publicationId, termsRecordId, keys.intentKey);
      prepayKeys.current = null;
      router.push(`/profile/wallet/pay?intentId=${intent.id}`);
    } catch (cause) {
      setError(marriageError(cause));
      lock.current = false;
      setPrepayBusy(false);
    }
  };

  const handleRefundPrepayment = async () => {
    if (refundBusy || lock.current) return;
    lock.current = true;
    setRefundBusy(true);
    setError('');
    try {
      await refundMarriagePrepayment(token, publicationId);
      setConfirmRefund(false);
      setTermsAccepted(false);
      prepayKeys.current = null;
      await resource.reload();
    } catch (cause) {
      setError(marriageError(cause));
    } finally {
      lock.current = false;
      setRefundBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || lock.current || !accepted || !ownRole) return;

    const cleanedPhone = normalizeDigits(phone.normalize('NFKC')).replace(/[\s()\-\u200c\u200e\u200f]/g, '');
    if (!/^(?:09\d{9}|9\d{9}|(?:\+98|98|0098)9\d{9})$/.test(cleanedPhone)) {
      setPhoneError('شماره همراه معتبر وارد کنید؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.');
      return;
    }

    lock.current = true;
    setBusy(true);
    setError('');
    setPhoneError(null);

    const body = {
      publicationId,
      initiatorRole: ownRole as 'FIRST' | 'SECOND',
      recipientPhone: cleanedPhone,
      consentPolicyVersionId: data.linkingPolicy.id,
      consentAccepted: true as const,
      ...(data.prepayment?.intentId ? { paidIntentId: data.prepayment.intentId } : {}),
    };
    const fingerprint = JSON.stringify(body);
    if (command.current?.fingerprint !== fingerprint) {
      command.current = { fingerprint, key: crypto.randomUUID() };
    }

    try {
      const request = replacesId
        ? await replaceMarriageRequest(token, replacesId, body, command.current.key)
        : await createMarriageRequest(token, body, command.current.key);
      router.push(marriageHref('/assessment/marriage/requests/' + request.id));
    } catch (cause) {
      const fieldError = marriagePhoneError(cause);
      if (fieldError) setPhoneError(fieldError);
      else setError(marriageError(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="service-detail mx-auto w-full max-w-2xl space-y-4">
      <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />
      {data && <h2 className="text-lg font-semibold leading-8 text-foreground">{data.title}</h2>}

      {data && (
        <>
          {!replacesId && data.eligibleRoles.length > 0 && (
            <ol
              aria-label="مراحل شروع تست دو نفره"
              className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-white p-2 text-xs"
            >
              <li
                aria-current={!isPrepaid ? 'step' : undefined}
                className={[
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium transition-colors',
                  !isPrepaid
                    ? 'bg-primary/10 text-primary'
                    : 'bg-emerald-50 text-emerald-800',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    !isPrepaid ? 'bg-primary text-white' : 'bg-emerald-600 text-white',
                  ].join(' ')}
                >
                  {isPrepaid ? <Check size={12} aria-hidden="true" /> : '۱'}
                </span>
                <span className="truncate">۱. پرداخت هزینه تست</span>
              </li>
              <li
                aria-current={isPrepaid ? 'step' : undefined}
                className={[
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium transition-colors',
                  isPrepaid
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/30 text-muted-foreground',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    isPrepaid ? 'bg-primary text-white' : 'bg-border text-muted-foreground',
                  ].join(' ')}
                >
                  ۲
                </span>
                <span className="truncate">۲. ساخت لینک دعوت</span>
              </li>
            </ol>
          )}

          <div className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">هزینهٔ کل دو نفر</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {formatRial(BigInt(data.amountRial))} تومان
                </p>
              </div>
              {isPrepaid && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 size={15} aria-hidden="true" />
                  پرداخت‌شده
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {isPrepaid
                ? 'هزینهٔ این تست توسط شما پرداخت شده است. پس از ورود نفر دوم و تأیید شرایط، هر نفر جداگانه به سوالات پاسخ می‌دهد.'
                : 'هر نفر جداگانه پاسخ می‌دهد. پرداخت هزینه پیش از ساخت دعوت و دریافت لینک انجام می‌شود.'}
            </p>
            <details className="group mt-3 border-t border-border/60 pt-2">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
                شرایط شرکت در این تست
                <ChevronDown aria-hidden="true" size={17} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-1 pb-2 text-sm leading-7 text-muted-foreground">
                {data.definition.roles.map(item => (
                  <p key={item.id}>
                    {item.title}: حداقل {item.minimumAgeYears.toLocaleString('fa-IR')} سال؛
                    {' '}{item.genders.map(gender => gender === 'MALE' ? 'آقا' : 'خانم').join(' یا ')}
                  </p>
                ))}
              </div>
            </details>
          </div>

          {data.eligibleRoles.length === 0 ? (
            <section role="status" className="rounded-2xl border border-border bg-white p-4 sm:p-5">
              <h2 className="text-base font-semibold">ابتدا مشخصاتت را بررسی کن</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                برای انتخاب نقش در این تست، اطلاعات حساب و شرایط شرکت باید بررسی شود.
              </p>
              <Link
                href={'/profile/edit?returnTo=' + encodeURIComponent(returnTo)}
                className={secondary + ' mt-4'}
              >
                تکمیل مشخصات و بازگشت
              </Link>
            </section>
          ) : !isPrepaid ? (
            isPendingPayment ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 space-y-3">
                <p className="text-sm font-semibold text-amber-950">پرداخت در انتظار تکمیل</p>
                <p className="text-xs leading-6 text-amber-900">
                  یک درخواست پرداخت در انتظار برای این تست دارید. پس از تکمیل پرداخت، بلافاصله می‌توانید لینک دعوت نفر دوم را بسازید.
                </p>
                <button
                  type="button"
                  className={button}
                  onClick={() => router.push(`/profile/wallet/pay?intentId=${data.prepayment!.intentId}`)}
                >
                  ادامه پرداخت ({formatRial(BigInt(data.prepayment!.amountRial))} تومان)
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">مرحله اول: پرداخت هزینه تست</h2>
                  <p className="mt-1 text-sm leading-7 text-muted-foreground">
                    هزینهٔ تست دو نفره ابتدا توسط شما پرداخت می‌شود. پس از پرداخت، مشخصات نفر دوم را وارد کرده و لینک دعوت اختصاصی دریافت می‌کنید. در صورت لغو یا رد دعوت پیش از پذیرش، کل مبلغ به کیف پول شما بازگردانده می‌شود.
                  </p>
                </div>
                {data.termsPolicy && (
                  <PolicyAcceptance
                    variant="compact"
                    policy={{ title: data.termsPolicy.title, body: data.termsPolicy.body }}
                    accepted={termsAccepted}
                    onChange={setTermsAccepted}
                    disabled={busy || prepayBusy}
                    label="شرایط خرید و استفاده از خدمات ارزیابی را مطالعه کرده و می‌پذیرم."
                  />
                )}
                <button
                  type="button"
                  className={button}
                  disabled={busy || prepayBusy || (Boolean(data.termsPolicy) && !termsAccepted)}
                  onClick={() => void handlePrepay()}
                  aria-busy={Boolean(prepayBusy)}
                >
                  {prepayBusy ? (
                    <><HeartbeatLoader />در حال انتقال به صفحه پرداخت…</>
                  ) : (
                    `پرداخت و ادامه به ساخت دعوت (${formatRial(BigInt(data.amountRial))} تومان)`
                  )}
                </button>
                {error && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-7 text-red-700">
                    {error}
                  </p>
                )}
              </div>
            )
          ) : (
            <>
              {replacesId ? (
                <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 space-y-2">
                  <p className="text-sm font-semibold text-foreground">تغییر شماره موبایل نفر دوم</p>
                  <p className="text-xs leading-6 text-muted-foreground">
                    هزینهٔ این تست قبلاً پرداخت شده و نیازی به پرداخت مجدد نیست. با ثبت شمارهٔ جدید، لینک دعوت قبلی غیرفعال شده و لینک جدید ساخته می‌شود.
                  </p>
                  <Link
                    href={marriageHref('/assessment/marriage/requests/' + encodeURIComponent(replacesId))}
                    className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    بازگشت به دعوت فعلی
                    <ArrowLeft size={14} aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-emerald-950">هزینه تست پرداخت شده است</p>
                      <p className="mt-1 text-xs leading-6 text-emerald-800">
                        اکنون نقش خود را انتخاب کرده و شماره موبایل نفر دوم را وارد کنید تا لینک دعوت اختصاصی ساخته شود.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={refundBusy || busy}
                      onClick={() => setConfirmRefund(true)}
                      className="shrink-0 rounded-lg border border-emerald-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-emerald-900 transition-colors hover:bg-white disabled:opacity-50"
                    >
                      انصراف و استرداد به کیف پول
                    </button>
                  </div>
                </div>
              )}

              <form
                onSubmit={submit}
                className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5"
              >
                <h2 className="text-base font-semibold text-foreground">
                  {replacesId ? 'مشخصات دعوت جدید' : 'مرحله دوم: دعوت نفر دوم'}
                </h2>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">
                  نفر دوم می‌تونه با این لینک وارد حسابش بشه یا ثبت‌نام کنه.
                </p>

                <fieldset disabled={busy || refundBusy} className="mt-5 space-y-4">
                  <label className="block space-y-2 text-sm font-medium text-foreground">
                    <span>نقش من</span>
                    <select
                      required
                      value={ownRole}
                      onChange={event => setRole(event.target.value)}
                      className="block min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 text-base font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <option value="">انتخاب نقش</option>
                      {data.definition.roles
                        .filter(item => data.eligibleRoles.includes(item.id))
                        .map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                    </select>
                  </label>

                  <label className="block space-y-2 text-sm font-medium text-foreground">
                    <span>شماره موبایل نفر دوم</span>
                    <input
                      ref={phoneInput}
                      required
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      maxLength={32}
                      autoComplete="off"
                      placeholder="0912..."
                      value={phone}
                      aria-invalid={Boolean(phoneError)}
                      aria-describedby={phoneError ? 'marriage-phone-error' : 'marriage-phone-help'}
                      onChange={event => { setPhone(event.target.value); setPhoneError(null); }}
                      className="block min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 text-left text-base font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-[invalid=true]:border-red-500"
                    />
                  </label>

                  <p id="marriage-phone-help" className="text-xs leading-6 text-muted-foreground">
                    فقط شماره نفر دوم رو لازم داریم؛ شرایط شرکتش بعد از ورود بررسی می‌شه.
                  </p>
                  {phoneError && (
                    <p id="marriage-phone-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {phoneError}
                    </p>
                  )}

                  <PolicyAcceptance
                    variant="compact"
                    policy={{ title: 'شرایط اتصال حساب‌ها', body: data.linkingPolicy.body }}
                    accepted={accepted}
                    onChange={setAccepted}
                    disabled={busy || refundBusy}
                    label="با اتصال حسابم به نفر دوم برای این تست موافقم."
                  />

                  <button
                    type="submit"
                    className={button}
                    disabled={busy || refundBusy || !accepted || !ownRole || !phone.trim()}
                    aria-busy={Boolean(busy)}
                  >
                    {busy ? (
                      <><HeartbeatLoader />در حال ساخت دعوت…</>
                    ) : replacesId ? (
                      'جایگزینی دعوت و دریافت لینک جدید'
                    ) : (
                      'ساخت دعوت و دریافت لینک'
                    )}
                  </button>
                </fieldset>
                {error && (
                  <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-7 text-red-700">
                    {error}
                  </p>
                )}
              </form>
            </>
          )}
        </>
      )}

      {confirmRefund && (
        <BottomSheet
          title="استرداد پیش‌پرداخت"
          onClose={() => { if (!lock.current) setConfirmRefund(false); }}
          onBeforeClose={() => !lock.current}
        >
          <div className="space-y-3">
            <p className="text-sm leading-8 text-foreground">
              با لغو پیش‌پرداخت، کل مبلغ پرداختی ({data ? formatRial(BigInt(data.amountRial)) + ' تومان' : ''}) بلافاصله به کیف پول شما بازگردانده می‌شود. آیا مطمئن هستید؟
            </p>
            <button
              type="button"
              className={dangerButton}
              disabled={refundBusy}
              onClick={() => void handleRefundPrepayment()}
              aria-busy={Boolean(refundBusy)}
            >
              {refundBusy ? <><HeartbeatLoader />در حال استرداد به کیف پول…</> : 'تأیید و بازگشت وجه به کیف پول'}
            </button>
            <button
              type="button"
              className={secondary}
              disabled={refundBusy}
              onClick={() => setConfirmRefund(false)}
            >
              انصراف
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

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
  const [canShare, setCanShare] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);
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
            <section aria-live="polite" className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={[
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                    data.status === 'ACCEPTED'
                      ? 'bg-emerald-50 text-emerald-800'
                      : data.status === 'PENDING'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {statuses[data.status] ?? 'وضعیت دعوت'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {data.isInitiator ? 'دعوت ارسالی' : 'دعوت دریافتی'}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-semibold leading-8 text-foreground">{guidance?.title}</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">{guidance?.description}</p>
              {data.status === 'CANCELLED' && (
                <p className="mt-2 rounded-xl bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
                  در صورت پرداخت قبلی، هزینهٔ این دعوت به کیف پول دعوت‌کننده بازگردانده شده است.
                </p>
              )}

              <dl className="mt-4 grid gap-3 border-t border-border/70 pt-4 text-sm sm:grid-cols-2">
                {data.isInitiator && data.recipientPhoneMasked && (
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">شماره نفر دوم</dt>
                    <dd className="mt-1 font-medium"><bdi dir="ltr">{data.recipientPhoneMasked}</bdi></dd>
                  </div>
                )}
                {!data.isInitiator && data.initiatorName && (
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">دعوت‌کننده</dt>
                    <dd className="mt-1 font-medium">{data.initiatorName}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">نقش شما</dt>
                  <dd className="mt-1 font-medium">
                    {data.service.definition.roles.find(role => role.id === data.ownRole)?.title ?? 'در حال بررسی'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">هزینهٔ کل دو نفر</dt>
                  <dd className="mt-1 font-medium">
                    {formatRial(BigInt(data.service.amountRial))} تومان
                    {data.status !== 'CANCELLED' && (
                      <span className="mr-1.5 text-xs font-normal text-emerald-700">(پرداخت‌شده)</span>
                    )}
                  </dd>
                </div>
              </dl>

              <details className="group mt-3 border-t border-border/60 pt-2">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
                  شرایط و جزئیات دعوت
                  <ChevronDown aria-hidden="true" size={16} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-1 pb-1 text-xs leading-6 text-muted-foreground">
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
              <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                شرایط شرکت در این تست هنوز تأیید نشده است.
              </p>
            )}

            {(!data.ownEligible || data.continuation?.profileRequired) && (
              <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
                <p className="text-sm leading-7">
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
              <section className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">لینک اختصاصی دعوت</span>
                  <input
                    dir="ltr"
                    readOnly
                    value={origin ? new URL(data.invitationPath, origin).toString() : data.invitationPath}
                    onFocus={event => event.currentTarget.select()}
                    className="block min-h-12 w-full rounded-xl border border-border bg-muted/20 px-3 text-left text-sm text-foreground"
                  />
                </label>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
                    className={secondary + ' mt-2'}
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
                  <p role="status" className="mt-3 rounded-xl bg-primary/5 px-3 py-2 text-xs font-medium leading-6 text-primary">
                    {notice}
                  </p>
                )}
                {data.smsStatus && (
                  <p role="status" className="mt-3 text-xs leading-6 text-muted-foreground">
                    {smsStatuses[data.smsStatus] ?? 'وضعیت ارسال پیامک مشخص نیست.'}
                  </p>
                )}
                <details className="mt-4 border-t border-border/70 pt-2">
                  <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm text-muted-foreground">
                    تغییر شماره یا لغو دعوت
                    <ChevronDown aria-hidden="true" size={16} />
                  </summary>
                  <div className="space-y-2 pb-1 pt-2">
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
                    <button type="button" className={secondary} disabled={busy} onClick={() => setConfirmCancel(true)}>
                      لغو این دعوت و بازگشت وجه به کیف پول
                    </button>
                  </div>
                </details>
              </section>
            )}

            {data.status === 'PENDING' && !data.isInitiator &&
              data.ownEligible && !data.continuation?.profileRequired && (
                <section className="space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs leading-6 text-emerald-900">
                    هزینه این تست توسط دعوت‌کننده پرداخت شده است و شما نیازی به پرداخت ندارید.
                  </div>
                  <PolicyAcceptance
                    variant="compact"
                    policy={{ title: 'پذیرش نقش و دعوت', body: data.service.linkingPolicy.body }}
                    accepted={accepted}
                    onChange={setAccepted}
                    disabled={busy}
                    label="نقش خودم و شرایط اتصال برای همین خدمت را می‌پذیرم."
                  />
                  <div className="space-y-2">
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

export function MarriageOffers({ hideHistoryLink = false }: { hideHistoryLink?: boolean } = {}) {
  const { authentication } = useAuthSession();
  const [page, setPage] = useState(1);
  const resource = usePatientResource(
    useCallback(
      () => listEducationalAssessmentOfferings(authentication.accessToken, page, 'COUPLES', 'MARRIAGE'),
      [authentication.accessToken, page],
    ),
  );

  const available = resource.data?.items.filter(canStartCoupleTest) ?? [];
  return (
    <section aria-label="انتخاب تست دو نفره" className="space-y-4">
      <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />

      {resource.data && available.length === 0 && (
        <p className="rounded-2xl border border-border bg-white p-5 text-sm leading-7 text-muted-foreground">
          فعلاً تست جدیدی برای شروع در دسترس نیست.
        </p>
      )}

      {available.map(item => (
          <Link
            key={item.id}
            href={coupleStartHref(item.id)}
            className="group block min-w-0 rounded-2xl border border-border/80 bg-white p-4 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
          >
            <h2 className="text-base font-semibold leading-8 text-foreground">{item.title}</h2>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              هر نفر جداگانه پاسخ می‌دهد؛ برای دعوت فقط شماره موبایل نفر دوم رو لازم داری.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
              <span className="text-sm font-semibold text-foreground">
                {item.priceMode === 'FREE'
                  ? 'رایگان'
                  : formatRial(BigInt(item.amountRial ?? '0')) + ' تومان برای هر دو نفر'}
              </span>
              <span className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary">
                انتخاب و ادامه
                <ArrowLeft aria-hidden="true" size={18} />
              </span>
            </div>
          </Link>
        ))}

      {!hideHistoryLink && (
        <Link
          href="/assessment/couples?history=1"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          همه دعوت‌ها و سوابق
          <ArrowLeft aria-hidden="true" size={16} />
        </Link>
      )}

      {resource.data && (
        <PatientPagination page={page} total={resource.data.total} onChange={setPage} />
      )}
    </section>
  );
}
