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
              className="grid grid-cols-1 gap-2 rounded-2xl border border-border/80 bg-white p-2.5 text-xs shadow-2xs sm:grid-cols-2"
            >
              <li
                aria-current={!isPrepaid ? 'step' : undefined}
                className={[
                  'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-semibold leading-6 transition-colors',
                  !isPrepaid
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'bg-emerald-50 text-emerald-800',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    !isPrepaid ? 'bg-primary text-white' : 'bg-emerald-600 text-white',
                  ].join(' ')}
                >
                  {isPrepaid ? <Check size={14} aria-hidden="true" /> : '۱'}
                </span>
                <span className="min-w-0">۱. پرداخت هزینه تست</span>
              </li>
              <li
                aria-current={isPrepaid ? 'step' : undefined}
                className={[
                  'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-semibold leading-6 transition-colors',
                  isPrepaid
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'bg-muted/40 text-muted-foreground',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isPrepaid ? 'bg-primary text-white' : 'bg-border text-muted-foreground',
                  ].join(' ')}
                >
                  ۲
                </span>
                <span className="min-w-0">۲. ساخت لینک دعوت نفر دوم</span>
              </li>
            </ol>
          )}

          <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">هزینهٔ کل دو نفر</p>
                <p className="mt-1 text-lg font-bold text-foreground sm:text-xl">
                  {formatRial(BigInt(data.amountRial))} تومان
                </p>
              </div>
              {isPrepaid ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                  <CheckCircle2 size={15} aria-hidden="true" />
                  پرداخت‌شده
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  بازگشت وجه در صورت لغو دعوت
                </span>
              )}
            </div>
            <p className="mt-2.5 text-xs leading-6 text-muted-foreground sm:text-sm">
              {isPrepaid
                ? 'هزینهٔ این تست توسط شما پرداخت شده است. پس از ورود نفر دوم و تأیید شرایط، هر نفر جداگانه به سوالات پاسخ می‌دهد.'
                : 'هر نفر جداگانه پاسخ می‌دهد. پرداخت هزینه پیش از ساخت دعوت و دریافت لینک انجام می‌شود.'}
            </p>
            <details className="group mt-3.5 border-t border-border/60 pt-2.5">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-primary sm:text-sm [&::-webkit-details-marker]:hidden">
                شرایط شرکت در این تست
                <ChevronDown aria-hidden="true" size={17} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 grid gap-2 pb-1 text-xs leading-6 text-muted-foreground sm:grid-cols-2 sm:text-sm">
                {data.definition.roles.map(item => (
                  <div key={item.id} className="rounded-xl bg-muted/35 px-3 py-2">
                    <span className="font-semibold text-foreground">{item.title}:</span>{' '}
                    حداقل {item.minimumAgeYears.toLocaleString('fa-IR')} سال ·{' '}
                    {item.genders.map(gender => gender === 'MALE' ? 'آقا' : 'خانم').join(' یا ')}
                  </div>
                ))}
              </div>
            </details>
          </div>

          {data.eligibleRoles.length === 0 ? (
            <section role="status" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
              <h2 className="text-base font-bold text-amber-950">ابتدا مشخصاتت را بررسی کن</h2>
              <p className="mt-2 text-sm leading-7 text-amber-900">
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
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 space-y-3">
                <p className="text-sm font-bold text-amber-950">پرداخت در انتظار تکمیل</p>
                <p className="text-xs leading-6 text-amber-900 sm:text-sm">
                  یک درخواست پرداخت در انتظار برای این تست دارید. پس از تکمیل پرداخت، بلافاصله می‌توانید لینک دعوت نفر دوم را بسازید.
                </p>
                <button
                  type="button"
                  className={button}
                  onClick={() => router.push(`/profile/wallet/pay?intentId=${data.prepayment!.intentId}`)}
                >
                  <span>ادامه پرداخت</span>
                  <span className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-bold">
                    {formatRial(BigInt(data.prepayment!.amountRial))} تومان
                  </span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">مرحله اول: پرداخت هزینه تست</h2>
                  <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
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
                  className={button + ' flex-wrap'}
                  disabled={busy || prepayBusy || (Boolean(data.termsPolicy) && !termsAccepted)}
                  onClick={() => void handlePrepay()}
                  aria-busy={Boolean(prepayBusy)}
                >
                  {prepayBusy ? (
                    <><HeartbeatLoader />در حال انتقال به صفحه پرداخت…</>
                  ) : (
                    <>
                      <span>پرداخت و ادامه به ساخت دعوت</span>
                      <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-xs font-bold">
                        {formatRial(BigInt(data.amountRial))} تومان
                      </span>
                    </>
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
                  <p className="text-sm font-bold text-foreground">تغییر شماره موبایل نفر دوم</p>
                  <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
                    هزینهٔ این تست قبلاً پرداخت شده و نیازی به پرداخت مجدد نیست. با ثبت شمارهٔ جدید، لینک دعوت قبلی غیرفعال شده و لینک جدید ساخته می‌شود.
                  </p>
                  <Link
                    href={marriageHref('/assessment/marriage/requests/' + encodeURIComponent(replacesId))}
                    className="inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-primary hover:underline sm:text-sm"
                  >
                    بازگشت به دعوت فعلی
                    <ArrowLeft size={14} aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-emerald-950">هزینه تست پرداخت شده است</p>
                      <p className="mt-1 text-xs leading-6 text-emerald-800 sm:text-sm">
                        اکنون نقش خود را انتخاب کرده و شماره موبایل نفر دوم را وارد کنید تا لینک دعوت اختصاصی ساخته شود.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={refundBusy || busy}
                      onClick={() => setConfirmRefund(true)}
                      className="shrink-0 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-2xs transition-colors hover:bg-emerald-50 disabled:opacity-50"
                    >
                      انصراف و استرداد به کیف پول
                    </button>
                  </div>
                </div>
              )}

              <form
                onSubmit={submit}
                className="rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5"
              >
                <h2 className="text-base font-bold text-foreground">
                  {replacesId ? 'مشخصات دعوت جدید' : 'مرحله دوم: دعوت نفر دوم'}
                </h2>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">
                  نفر دوم می‌تونه با این لینک وارد حسابش بشه یا ثبت‌نام کنه.
                </p>

                <fieldset disabled={busy || refundBusy} className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <span className="block text-sm font-semibold text-foreground">نقش من</span>
                    <div
                      role="radiogroup"
                      aria-label="نقش من"
                      className="grid gap-2.5 sm:grid-cols-2"
                    >
                      {data.definition.roles
                        .filter(item => data.eligibleRoles.includes(item.id))
                        .map(item => {
                          const isSelected = ownRole === item.id;
                          return (
                            <label
                              key={item.id}
                              className={[
                                'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all',
                                isSelected
                                  ? 'border-primary bg-primary/6 ring-1 ring-primary/25'
                                  : 'border-border/80 bg-white hover:border-primary/40',
                              ].join(' ')}
                            >
                              <input
                                type="radio"
                                name="initiatorRole"
                                required
                                value={item.id}
                                checked={isSelected}
                                onChange={event => setRole(event.target.value)}
                                className="mt-1 size-4 shrink-0 accent-primary"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-foreground">
                                  {item.title}
                                </span>
                                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                  حداقل {item.minimumAgeYears.toLocaleString('fa-IR')} سال ·{' '}
                                  {item.genders
                                    .map(gender => (gender === 'MALE' ? 'آقا' : 'خانم'))
                                    .join(' یا ')}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  <label className="block space-y-2 text-sm font-semibold text-foreground">
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
                      className="block min-h-12 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-left text-base font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-[invalid=true]:border-red-500"
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
        <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-sm leading-7 text-muted-foreground">
          فعلاً تست جدیدی برای شروع در دسترس نیست.
        </p>
      )}

      <div className="grid gap-3.5">
        {available.map(item => (
          <Link
            key={item.id}
            href={coupleStartHref(item.id)}
            className="group block min-w-0 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs transition-all hover:border-primary/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
          >
            <div className="flex items-start gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <HeartHandshake aria-hidden="true" size={22} />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <span className="inline-flex items-center rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  دو نفره · دعوت با شماره موبایل
                </span>
                <h2 className="text-base font-bold leading-8 text-foreground">{item.title}</h2>
                <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
                  هر نفر جداگانه پاسخ می‌دهد؛ برای دعوت فقط شماره موبایل نفر دوم رو لازم داری.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3.5">
              <span className="text-sm font-bold text-foreground">
                {item.priceMode === 'FREE'
                  ? 'رایگان'
                  : formatRial(BigInt(item.amountRial ?? '0')) + ' تومان برای هر دو نفر'}
              </span>
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-white sm:text-sm">
                انتخاب و ادامه
                <ArrowLeft aria-hidden="true" size={16} />
              </span>
            </div>
          </Link>
        ))}
      </div>

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
