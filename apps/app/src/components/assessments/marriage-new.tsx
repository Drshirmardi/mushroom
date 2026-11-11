"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { marriageError, marriagePhoneError } from '@/lib/marriage-errors';
import { marriageHref } from '@/lib/marriage-context';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { PolicyAcceptance } from '@/components/shared/policy-acceptance';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { usePatientResource } from '@/lib/use-patient-resource';
import { acceptAssessmentConsent } from '@/lib/digital-services-api';
import { formatRial, normalizeDigits } from '@/lib/wallet-money';
import { coupleStartHref } from '@/lib/couples-flow';
import { getMarriageSettings, replaceMarriageRequest, createMarriageRequest, createMarriagePrepaidIntent, refundMarriagePrepayment } from '@/lib/marriage-api';

const button = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const secondary = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const dangerButton = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600';



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
