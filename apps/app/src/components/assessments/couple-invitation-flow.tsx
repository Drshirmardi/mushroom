'use client';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';

import Link from 'next/link';
import { PolicyAcceptance, usePolicyAcceptance } from '@/components/shared/policy-acceptance';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import type { components } from '@sabz-zendegi/api-client';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import {
  createCoupleSession,
  createCoupleInvitation,
  getCoupleLinkPolicy,
  previewCoupleInvitation,
  acceptCoupleInvitation,
} from '@/lib/couples-api';
import { PatientRequestError, patientErrorMessage } from '@/lib/patient-request';
import { usePatientResource } from '@/lib/use-patient-resource';
import { useOperationKey } from '@/lib/use-operation-key';
import { normalizeDigits } from '@/lib/wallet-money';

type Schema = components['schemas'];
type FlowProps = {
  token: string;
  userId: string;
  publicationId: string | null;
  onBusyChange: (busy: boolean) => void;
  onInvited: () => void;
};
const linkHref = (id: string, publicationId: string | null) =>
  `/assessment/couples/links/${encodeURIComponent(id)}${publicationId ? `?publicationId=${encodeURIComponent(publicationId)}` : ''}`;

const primaryBtnClass =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryBtnClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50';
const quietBtnClass =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5 disabled:opacity-50';
const inputClass =
  'w-full rounded-2xl border border-border bg-white p-3.5 text-sm text-foreground shadow-2xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-red-300 aria-[invalid=true]:bg-red-50/40';

function invitationError(cause: unknown) {
  if (cause instanceof PatientRequestError) {
    if (cause.code === 'COUPLE_INVITATION_UNAVAILABLE')
      return 'شناسه و شماره همراه را بررسی کن؛ همراهت باید حساب بیمار مستقل در همین کلینیک داشته باشد.';
    if (cause.code === 'COUPLE_INVITATION_NOT_FOUND')
      return 'این دعوت در دسترس نیست. کد را دوباره از همراهت بگیر؛ ممکن است دعوت قبلی جایگزین شده باشد.';
    if (cause.code === 'COUPLE_STATE_CONFLICT')
      return 'وضعیت این همراهی تغییر کرده است؛ از بخش همراهی‌ها، وضعیت فعلی را بررسی کن.';
  }
  return patientErrorMessage(cause);
}

export function CopyValue({ value, label, id }: { value: string; label: string; id: string }) {
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setNotice('کپی شد؛ حالا می‌توانی برای همراهت بفرستی.');
    } catch {
      input.current?.focus();
      input.current?.select();
      setCopied(false);
      setNotice('کپی خودکار ممکن نشد؛ متن انتخاب شده را دستی کپی کن.');
    }
  };
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-bold text-foreground">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={input}
          id={id}
          className={inputClass}
          value={value}
          readOnly
          dir="ltr"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          onClick={() => void copy()}
          className={secondaryBtnClass}
          aria-label={`کپی ${label}`}
        >
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          کپی
        </button>
      </div>
      {notice && (
        <div className="text-xs font-medium text-emerald-700" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}

export function CoupleInviteFlow({
  token,
  userId,
  publicationId,
  onBusyChange,
  onInvited,
}: FlowProps) {
  const [step, setStep] = useState(0);
  const [patientId, setPatientId] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ patientId?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Schema['CoupleInvitationResponseDto'] | null>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const patientInput = useRef<HTMLInputElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const working = useRef(false);
  const sessionId = useRef<string | null>(null);
  const invitationCommand = useRef<{ fingerprint: string; key: string } | null>(null);
  const [epoch] = useState(() => crypto.randomUUID());
  const operationKey = useOperationKey(`${userId}:couple-link`);
  useEffect(() => {
    if (step > 0) stepHeading.current?.focus();
  }, [step]);
  const continueToConsent = (event: FormEvent) => {
    event.preventDefault();
    const errors: typeof fieldErrors = {};
    const normalizedPhone = normalizeDigits(phone.normalize('NFKC')).replace(
      /[\s()\-\u200c\u200e\u200f]/g,
      '',
    );
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        patientId.trim(),
      )
    )
      errors.patientId = 'شناسه کامل بیمار را از همراهت بگیر و اینجا کپی کن.';
    if (
      phone.trim().length > 32 ||
      !/^(?:09\d{9}|9\d{9}|(?:\+98|98|0098)9\d{9})$/.test(normalizedPhone)
    )
      errors.phone = 'شماره موبایل معتبر همراهت را وارد کن؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.';
    setFieldErrors(errors);
    if (errors.patientId || errors.phone) {
      (errors.patientId ? patientInput : phoneInput).current?.focus();
      return;
    }
    setPatientId(patientId.trim());
    setPhone(normalizedPhone);
    setError(null);
    setStep(1);
  };
  const sendInvitation = async (policy: Schema['CoupleLinkPolicyDto']) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    try {
      if (!sessionId.current) {
        const consent = { consentPolicyVersionId: policy.id, consentAccepted: true as const };
        const session = await createCoupleSession(
          token,
          consent,
          await operationKey({ ...consent, epoch }),
        );
        sessionId.current = session.id;
      }
      const body = { recipientPatientId: patientId.trim(), recipientPhone: phone.trim() };
      const fingerprint = JSON.stringify(body);
      if (invitationCommand.current?.fingerprint !== fingerprint)
        invitationCommand.current = { fingerprint, key: crypto.randomUUID() };
      const next = await createCoupleInvitation(
        token,
        sessionId.current,
        body,
        invitationCommand.current.key,
      );
      setInvitation(next);
      setStep(2);
      onInvited();
    } catch (cause) {
      setError(invitationError(cause));
    } finally {
      working.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <div className="space-y-4">
      <ol
        className="grid grid-cols-3 gap-2 rounded-2xl border border-border/80 bg-muted/40 p-2 text-center text-xs font-bold"
        aria-label="مراحل ساخت دعوت"
      >
        {['اطلاعات همراه', 'تأیید شرایط', 'دریافت کد دعوت'].map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? 'step' : undefined}
            data-complete={index < step}
            className={`rounded-xl px-2 py-2 ${
              step === index
                ? 'bg-primary text-white shadow-2xs'
                : index < step
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-muted-foreground'
            }`}
          >
            {label}
          </li>
        ))}
      </ol>
      {step === 0 && (
        <form onSubmit={continueToConsent} noValidate className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">همراهت را مشخص کن</h3>
            <p className="text-xs leading-6 text-muted-foreground">
              همراهت باید حساب کاربری داشته باشد. شناسه و شماره ثبت‌نامش را از خودش بگیر.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="couple-partner-id" className="block text-xs font-bold text-foreground">
              شناسه بیمار همراه <span aria-hidden="true">*</span>
            </label>
            <input
              ref={patientInput}
              id="couple-partner-id"
              className={inputClass}
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              required
              aria-invalid={Boolean(fieldErrors.patientId)}
              aria-describedby="couple-partner-id-help"
            />
            <p
              id="couple-partner-id-help"
              role={fieldErrors.patientId ? 'alert' : undefined}
              className={`text-xs leading-6 ${
                fieldErrors.patientId ? 'font-medium text-red-700' : 'text-muted-foreground'
              }`}
            >
              {fieldErrors.patientId ??
                'همراهت در همین صفحه، بخش «شناسه من برای دعوت» می‌تواند شناسه‌اش را کپی کند.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="couple-partner-phone"
              className="block text-xs font-bold text-foreground"
            >
              شماره موبایل همراه <span aria-hidden="true">*</span>
            </label>
            <input
              ref={phoneInput}
              id="couple-partner-phone"
              className={inputClass}
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="off"
              dir="ltr"
              required
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby="couple-partner-phone-help"
            />
            <p
              id="couple-partner-phone-help"
              role={fieldErrors.phone ? 'alert' : undefined}
              className={`text-xs leading-6 ${
                fieldErrors.phone ? 'font-medium text-red-700' : 'text-muted-foreground'
              }`}
            >
              {fieldErrors.phone ?? 'شماره باید متعلق به همان حساب بیمار باشد؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.'}
            </p>
          </div>
          <div className="pt-1">
            <button className={primaryBtnClass} type="submit">
              ادامه و بررسی شرایط
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
          </div>
        </form>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <h3 ref={stepHeading} tabIndex={-1} className="text-sm font-bold text-foreground">
            دعوت برای همین همراه ساخته می‌شود
          </h3>
          <dl className="grid gap-2.5 rounded-2xl border border-border/80 bg-muted/30 p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">شماره همراه</dt>
              <dd className="mt-1 font-bold text-foreground">
                <bdi>{phone}</bdi>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">شناسه بیمار همراه</dt>
              <dd className="mt-1 break-all font-bold text-foreground" dir="ltr">
                {patientId}
              </dd>
            </div>
          </dl>
          <InviteConsent token={token} busy={busy} onConfirm={sendInvitation} />
          {error && (
            <p
              className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-7 text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={quietBtnClass}
              disabled={busy}
              onClick={() => {
                setStep(0);
                setError(null);
              }}
            >
              ویرایش اطلاعات همراه
            </button>
            {error && sessionId.current && (
              <Link className={quietBtnClass} href={linkHref(sessionId.current, publicationId)}>
                بررسی وضعیت دعوت در همراهی ایجادشده
              </Link>
            )}
          </div>
        </div>
      )}
      {step === 2 && invitation && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950">
            <Check size={22} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div className="space-y-1">
              <h3 ref={stepHeading} tabIndex={-1} className="text-sm font-bold">
                دعوت همراهت آماده است
              </h3>
              <p className="text-xs leading-6">
                کد را کپی کن و خودت برای همراهت بفرست. پیامکی به‌صورت خودکار ارسال نمی‌شود.
              </p>
            </div>
          </div>
          {invitation.invitationToken ? (
            <>
              <CopyValue
                key={invitation.invitationId}
                value={invitation.invitationToken}
                label="کد دعوت همراه"
                id="couple-created-code"
              />
              <p className="text-xs leading-6 text-muted-foreground">
                همراهت با حساب خودش وارد «آزمون زوجی» شود، «کد دعوت دارم» را انتخاب کند و این کد را
                وارد کند. پیش از خروج، کد را کپی کن؛ کد فقط همین بار نمایش داده می‌شود.
              </p>
            </>
          ) : (
            <p
              className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-6 text-amber-900"
              role="status"
            >
              دعوت ثبت شده، اما کد آن دوباره قابل دریافت نیست. برای بررسی دعوت یا ساخت کد جایگزین،
              وارد پیگیری دعوت شو.
            </p>
          )}
          <div>
            <Link className={primaryBtnClass} href={linkHref(invitation.sessionId, publicationId)}>
              پیگیری پذیرش همراه
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function InviteConsent({
  token,
  busy,
  onConfirm,
}: {
  token: string;
  busy: boolean;
  onConfirm: (policy: Schema['CoupleLinkPolicyDto']) => Promise<void>;
}) {
  const policy = usePatientResource(useCallback(() => getCoupleLinkPolicy(token), [token]));
  return (
    <>
      <PatientResourceState {...policy} retry={() => void policy.reload()} />
      {policy.data && (
        <ConfirmPolicy
          key={policy.data.contentHash}
          policy={policy.data}
          busy={busy}
          onConfirm={onConfirm}
        />
      )}
    </>
  );
}
function ConfirmPolicy({
  policy,
  busy,
  onConfirm,
}: {
  policy: Schema['CoupleLinkPolicyDto'];
  busy: boolean;
  onConfirm: (policy: Schema['CoupleLinkPolicyDto']) => Promise<void>;
}) {
  const { accepted, onChange: setAccepted } = usePolicyAcceptance(policy.id, [policy]);
  return (
    <div className="space-y-3">
      <PolicyAcceptance policy={policy} accepted={accepted} onChange={setAccepted} disabled={busy} />
      <p className="text-xs leading-6 text-muted-foreground">
        این رضایت فقط برای اتصال حساب‌هاست؛ شرایط و هزینه آزمون را بعد از پذیرش همراه بررسی می‌کنید.
      </p>
      <button
        type="button"
        className={primaryBtnClass}
        disabled={busy || !accepted}
        onClick={() => {
          if (accepted) void onConfirm(policy);
        }}
        aria-busy={Boolean(busy)}
      >
        {busy ? (
          <>
            <HeartbeatLoader />
            در حال ساخت دعوت…
          </>
        ) : (
          'تأیید و ساخت کد دعوت'
        )}
      </button>
    </div>
  );
}

export function CoupleAcceptFlow({
  token,
  publicationId,
  onBusyChange,
}: Pick<FlowProps, 'token' | 'publicationId' | 'onBusyChange'>) {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [preview, setPreview] = useState<Schema['CoupleInvitationPreviewDto'] | null>(null);
  const { accepted, onChange: setAccepted } = usePolicyAcceptance(JSON.stringify([publicationId, secret.trim()]), [preview?.policy]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const working = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (preview) heading.current?.focus();
  }, [preview]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (working.current) return;
    if (!/^[A-Za-z0-9_-]{43}$/.test(secret.trim())) {
      setFieldError(
        'کد کامل دعوت را از همراهت بگیر و اینجا بچسبان؛ شناسه بیمار را به‌جای کد وارد نکن.',
      );
      input.current?.focus();
      return;
    }
    if (preview && !accepted) return;
    working.current = true;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    setFieldError(null);
    try {
      if (!preview) {
        setPreview(await previewCoupleInvitation(token, secret.trim()));
        setAccepted(false);
      } else {
        const session = await acceptCoupleInvitation(token, {
          invitationToken: secret.trim(),
          consentPolicyVersionId: preview.policy.id,
          consentAccepted: true,
        });
        router.push(linkHref(session.id, publicationId));
      }
    } catch (cause) {
      setError(invitationError(cause));
    } finally {
      working.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
      <div className="space-y-1">
        <h3
          ref={heading}
          tabIndex={preview ? -1 : undefined}
          className="text-sm font-bold text-foreground"
        >
          {preview ? 'دعوت پیدا شد؛ شرایط را بررسی کن' : 'کد دعوت همراهت را وارد کن'}
        </h3>
        <p className="text-xs leading-6 text-muted-foreground">
          دعوت را با همان حسابی بپذیر که همراهت برایش کد ساخته است.
        </p>
      </div>
      {!preview ? (
        <div className="space-y-1.5">
          <label htmlFor="couple-received-code" className="block text-xs font-bold text-foreground">
            کد دعوت <span aria-hidden="true">*</span>
          </label>
          <textarea
            ref={input}
            id="couple-received-code"
            className={inputClass}
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            disabled={busy}
            rows={2}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            dir="ltr"
            required
            aria-invalid={Boolean(fieldError)}
            aria-describedby="couple-received-code-help"
          />
          <p
            id="couple-received-code-help"
            role={fieldError ? 'alert' : undefined}
            className={`text-xs leading-6 ${
              fieldError ? 'font-medium text-red-700' : 'text-muted-foreground'
            }`}
          >
            {fieldError ??
              'همه کد را کپی کن؛ بعد از بررسی، شرایط پذیرش را می‌بینی. این مرحله هنوز حساب‌ها را متصل نمی‌کند.'}
          </p>
        </div>
      ) : (
        <PolicyAcceptance
          policy={preview.policy}
          accepted={accepted}
          onChange={setAccepted}
          disabled={busy}
        />
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-7 text-red-700"
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className={primaryBtnClass}
          type="submit"
          disabled={busy || (Boolean(preview) && !accepted)}
          aria-busy={Boolean(busy)}
        >
          {busy ? (
            <>
              <HeartbeatLoader />
              در حال بررسی…
            </>
          ) : preview ? (
            'تأیید شرایط و اتصال به همراه'
          ) : (
            'بررسی کد دعوت'
          )}
        </button>
        {preview && (
          <button
            type="button"
            className={secondaryBtnClass}
            disabled={busy}
            onClick={() => {
              setPreview(null);
              setAccepted(false);
              setError(null);
            }}
          >
            تغییر کد
          </button>
        )}
      </div>
    </form>
  );
}
