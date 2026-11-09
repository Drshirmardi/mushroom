"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { marriageAccountRecovery, marriageError, marriagePhoneError } from '@/lib/marriage-errors';
import { marriageHref } from '@/lib/marriage-context';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, HeartHandshake } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { PolicyAcceptance } from '@/components/shared/policy-acceptance';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { usePatientResource } from '@/lib/use-patient-resource';
import { listEducationalAssessmentOfferings } from '@/lib/digital-services-api';
import { marriageRequestLoader } from '@/lib/marriage-request-loader';
import { marriageLoginUrl } from '@/lib/api';
import { formatRial } from '@/lib/wallet-money';
import { reviewMarriageRequest, getMarriageSettings, replaceMarriageRequest, createMarriageRequest, getMarriageRequest, acceptMarriageRequest, cancelMarriageRequest, sendMarriageSms, listMarriageRequests } from '@/lib/marriage-api';
const button = 'block min-h-11 w-full rounded-2xl bg-primary p-4 text-center text-sm font-bold text-white disabled:opacity-50';
const secondary = 'block min-h-11 w-full rounded-2xl border border-border bg-white p-3 text-center text-sm font-semibold disabled:opacity-50';
const statuses: Record<string,string> = { PENDING: 'در انتظار پذیرش همراه', ACCEPTED: 'همراهی تأیید شد', CANCELLED: 'دعوت لغو شده', REPLACED: 'دعوت جایگزین شده' };
const ineligibility: Record<string,string> = { PROFILE_INCOMPLETE: 'مشخصات خودت برای بررسی شرایط کامل نیست.', GENDER_NOT_ALLOWED: 'جنسیت ثبت‌شدهٔ شما با شرایط این نقش سازگار نیست.', AGE_BELOW_MINIMUM: 'سن ثبت‌شدهٔ شما کمتر از حداقل سن این نقش است.' };
const smsStatuses: Record<string,string> = { QUEUED: 'پیامک در صف ارسال است.', SENDING: 'در حال بررسی ارسال پیامک…', ACCEPTED: 'ارسال پیامک توسط سرویس‌دهنده پذیرفته شد؛ تحویل قطعی تأیید نشده است.', FAILED: 'ارسال پیامک انجام نشد؛ لینک دعوت همچنان قابل استفاده است.', UNKNOWN: 'وضعیت ارسال مشخص نیست. پیش از ارسال دوباره، از همراهت بپرس.' };

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const command = useRef<{ fingerprint: string; key: string } | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    if (phoneError && !busy) phoneInput.current?.focus();
  }, [phoneError, busy]);

  const data = resource.data;
  const ownRole = role || (data?.eligibleRoles.length === 1 ? data.eligibleRoles[0] : '');
  const returnTo = '/assessment/marriage/new/' + publicationId +
    (replacesId ? '?replaceRequestId=' + encodeURIComponent(replacesId) : '');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || lock.current || !accepted || !ownRole) return;

    lock.current = true;
    setBusy(true);
    setError('');
    setPhoneError(null);

    const body = {
      publicationId,
      initiatorRole: ownRole as 'FIRST' | 'SECOND',
      recipientPhone: phone,
      consentPolicyVersionId: data.linkingPolicy.id,
      consentAccepted: true as const,
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
    <ServicePage
      title={data?.title ?? 'شناخت پیش از ازدواج'}
      description="نقشت را مشخص کن و شمارهٔ همراهت را وارد کن تا لینک دعوت ساخته شود."
      icon={HeartHandshake}
      backHref="/assessment/couples"
      backLabel="انتخاب خدمت"
    >
      <div className="service-detail mx-auto w-full max-w-2xl space-y-4">
        <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />

        {data && (
          <>
            <div className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5">
              <p className="text-xs text-muted-foreground">هزینهٔ کل دو نفر</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatRial(BigInt(data.amountRial))} تومان
              </p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                هر نفر جداگانه پاسخ می‌دهد. پرداخت پس از پذیرش دعوت و رضایت هر دو نفر انجام می‌شود.
              </p>
              <details className="group mt-3 border-t border-border/60 pt-2">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
                  شرایط شرکت در این آزمون
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
                  برای انتخاب نقش در این آزمون، اطلاعات حساب و شرایط شرکت باید بررسی شود.
                </p>
                <Link
                  href={'/profile/edit?returnTo=' + encodeURIComponent(returnTo)}
                  className={secondary + ' mt-4'}
                >
                  تکمیل مشخصات و بازگشت
                </Link>
              </section>
            ) : (
              <form
                onSubmit={submit}
                className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5"
              >
                <h2 className="text-base font-semibold text-foreground">دعوت همراه</h2>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">
                  همراهت می‌تواند پس از بازکردن لینک، وارد حساب خودش شود یا ثبت‌نام کند.
                </p>

                <fieldset disabled={busy} className="mt-5 space-y-4">
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
                    <span>شماره موبایل همراه</span>
                    <input
                      ref={phoneInput}
                      required
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      maxLength={32}
                      autoComplete="off"
                      placeholder="09..."
                      value={phone}
                      aria-invalid={Boolean(phoneError)}
                      aria-describedby={phoneError ? 'marriage-phone-error' : 'marriage-phone-help'}
                      onChange={event => { setPhone(event.target.value); setPhoneError(null); }}
                      className="block min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 text-left text-base font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                  </label>

                  <p id="marriage-phone-help" className="text-xs leading-6 text-muted-foreground">
                    فقط شمارهٔ همراه را لازم داریم؛ دعوت به‌معنی تأیید شرایط شرکت او نیست.
                  </p>
                  {phoneError && (
                    <p id="marriage-phone-error" role="alert" className="text-sm text-red-700">
                      {phoneError}
                    </p>
                  )}

                  <PolicyAcceptance
                    variant="compact"
                    policy={{ title: 'شرایط اتصال حساب‌ها', body: data.linkingPolicy.body }}
                    accepted={accepted}
                    onChange={setAccepted}
                    disabled={busy}
                    label="اتصال حسابم به همین همراه برای این خدمت را می‌پذیرم."
                  />

                  <button
                    type="submit"
                    className={button}
                    disabled={busy || !accepted || !ownRole}
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
                {error && <p role="alert" className="mt-3 text-sm leading-7 text-red-700">{error}</p>}
              </form>
            )}
          </>
        )}
      </div>
    </ServicePage>
  );
}

export function MarriageRequestView({ id }: { id: string }) {
  const { authentication,logout } = useAuthSession(); const token = authentication.accessToken;
  const scope = `${id}:${authentication.user.id}`;
  const loader = useMemo(() => {
    const requestId = scope.split(':')[0];
    return marriageRequestLoader(token => getMarriageRequest(token!,requestId), token => reviewMarriageRequest(token!,requestId));
  }, [scope]);
  const resource = usePatientResource(useCallback(() => loader.load(token),[loader,token]));
  const refresh = resource.refresh;
  const [accepted,setAccepted] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [confirmCancel,setConfirmCancel] = useState(false);
  const lock = useRef(false), smsKey = useRef<string|null>(null), data = resource.data;
  useEffect(() => {
    if (data?.status !== 'PENDING') return;
    const timer = window.setInterval(() => { if (!lock.current && document.visibilityState === 'visible' && navigator.onLine) void refresh(); },30000);
    return () => window.clearInterval(timer);
  },[data?.status,refresh]);
  const retry = () => { loader.reviewAgain(); void resource.refresh(); };
  const run = async (action: () => Promise<unknown>) => { if (lock.current) return; lock.current = true; setBusy(true); setError(''); try { if (loader.pending) await loader.pending.catch(() => null); await action(); loader.mutationSucceeded(); await resource.refresh(); } catch (cause) { setError(marriageError(cause)); } finally { lock.current = false; setBusy(false); } };
  return <ServicePage title={data?.service.title ?? 'دعوت خدمت ازدواج'} description="دعوت فقط با حساب و شماره تأییدشده خودت قابل پذیرش است." icon={HeartHandshake} backHref="/assessment/marriage" backLabel="درخواست‌های من"><div className="service-detail space-y-4"><PatientResourceState variant="detail" {...resource} error={resource.error ? marriageError(loader.failure) : null} retry={retry} />{resource.error && !data && marriageAccountRecovery(loader.failure) && <div className="space-y-3"><p className="text-sm leading-7">با همان شماره‌ای که دعوت برایش ساخته شده، با کد پیامکی وارد شو. بازکردن لینک به‌تنهایی اجازهٔ پذیرش نمی‌دهد.</p><button className={secondary} onClick={() => void (async () => { if (await logout()) window.location.assign(marriageLoginUrl()); })()}>ورود دوباره با شماره دعوت‌شده</button></div>}{data && <>
    <section className="service-card space-y-3"><h2>{statuses[data.status]}</h2>{data.isInitiator && data.recipientPhoneMasked && <p>شماره همراه دعوت‌شده: <bdi dir="ltr">{data.recipientPhoneMasked}</bdi></p>}<p className="text-sm">تاریخ دعوت: {new Date(data.createdAt).toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'})}</p>{!data.isInitiator && data.initiatorName && <p>دعوت‌کننده: {data.initiatorName}</p>}<p>نقش شما: {data.service.definition.roles.find(role => role.id === data.ownRole)?.title}</p>{data.service.definition.roles.map(role => <p key={role.id} className="text-sm leading-7">{role.title}: حداقل {role.minimumAgeYears.toLocaleString('fa-IR')} سال؛ {role.genders.map(gender => gender === 'MALE' ? 'آقا' : 'خانم').join(' یا ')}</p>)}<p>{formatRial(BigInt(data.service.amountRial))} تومان برای هر دو نفر</p></section>
    {data.eligibilityNotConfirmed && <p role="status" className="service-card">شرایط شرکت در این خدمت هنوز تأیید نشده است.</p>}
    {(!data.ownEligible || data.continuation?.profileRequired) && <div className="service-card space-y-3"><p>{ineligibility[data.ownIneligibilityReason ?? ''] ?? 'اطلاعات خودت را تکمیل کن یا شرایط نقش خودت را بررسی کن.'}</p>{(data.ownIneligibilityReason !== 'AGE_BELOW_MINIMUM' || data.continuation?.profileRequired) && <Link href={marriageHref(data.continuation?.profileRequired ? `/welcome?returnTo=${encodeURIComponent(data.invitationPath)}` : `/profile/edit?returnTo=${encodeURIComponent(data.invitationPath)}`)} className={data.continuation?.profileRequired ? button : secondary}>{data.continuation?.profileRequired ? 'تکمیل مشخصات و ادامه' : 'ویرایش مشخصات من'}</Link>}</div>}
    {data.status === 'PENDING' && data.isInitiator && <section className="service-card space-y-4"><label className="block space-y-2 text-sm">لینک دعوت<input className={secondary} dir="ltr" readOnly value={typeof window === 'undefined' ? data.invitationPath : new URL(data.invitationPath,window.location.origin).toString()} onFocus={event => event.target.select()} /></label><button className={secondary} onClick={() => void navigator.clipboard.writeText(new URL(data.invitationPath,window.location.origin).toString()).then(() => setNotice('لینک کپی شد.')).catch(() => setNotice('لینک را از کادر بالا انتخاب و کپی کن.'))}>کپی لینک دعوت</button><button className={button} disabled={busy || data.smsStatus === 'QUEUED' || data.smsStatus === 'SENDING'} onClick={() => void run(async () => { const key = smsKey.current ??= crypto.randomUUID(); await sendMarriageSms(token,id,key); smsKey.current = null; })} aria-busy={Boolean(busy)}>{busy ? <><HeartbeatLoader />{'در حال ثبت درخواست…'}</> : 'ارسال پیامک دعوت'}</button>{data.smsStatus && <p role="status" className="text-sm leading-7">{smsStatuses[data.smsStatus]}</p>}<Link aria-disabled={busy} onClick={event => { if (lock.current) event.preventDefault(); }} className={secondary} href={marriageHref(`/assessment/marriage/new/${data.service.publicationId}?replaceRequestId=${id}`)}>جایگزینی شماره همراه؛ لینک قبلی غیرفعال می‌شود</Link><button className={secondary} disabled={busy} onClick={() => setConfirmCancel(true)}>لغو این دعوت</button></section>}
    {data.status === 'PENDING' && !data.isInitiator && data.ownEligible && !data.continuation?.profileRequired && <section className="space-y-4"><PolicyAcceptance policy={{ title: 'پذیرش نقش و دعوت', body: data.service.linkingPolicy.body }} accepted={accepted} onChange={setAccepted} disabled={busy} label="نقش خودم و شرایط اتصال برای همین خدمت را می‌پذیرم." /><button className={button} disabled={busy || !accepted} onClick={() => void run(() => acceptMarriageRequest(token,id,{ consentPolicyVersionId: data.service.linkingPolicy.id,consentAccepted:true }))} aria-busy={Boolean(busy)}>{busy ? <><HeartbeatLoader />{'در حال ثبت پذیرش…'}</> : 'پذیرش دعوت و ادامه'}</button>{!accepted && <p className="text-sm leading-7">برای ادامه، نقش و شرایط اتصال را مطالعه و تأیید کنید.</p>}</section>}
    {data.status === 'ACCEPTED' && data.educationalId && !data.continuation?.profileRequired && <Link className={button} href={data.continuation?.nextPath ?? marriageHref(`/assessment/couples/educational/${data.educationalId}`)}>ادامه به رضایت، پرداخت و آزمون خودم</Link>}
    {(data.status === 'CANCELLED' || data.status === 'REPLACED') && data.isInitiator && <Link className={secondary} href={marriageHref(`/assessment/marriage/new/${data.service.publicationId}`)}>ساخت دعوت جدید</Link>}
  </>}{confirmCancel && <BottomSheet title="لغو دعوت" onClose={() => { if (!lock.current) setConfirmCancel(false); }}><p className="text-sm leading-8">با لغو دعوت، لینک فعلی برای پذیرش غیرفعال می‌شود. دعوت لغو شود؟</p><button className={button} disabled={busy} onClick={() => void run(async () => { await cancelMarriageRequest(token,id); setConfirmCancel(false); })} aria-busy={Boolean(busy)}>{busy ? <><HeartbeatLoader />{'در حال لغو…'}</> : 'تأیید لغو دعوت'}</button><button className={secondary} disabled={busy} onClick={() => setConfirmCancel(false)}>انصراف</button></BottomSheet>}{notice && <p role="status">{notice}</p>}{error && <p role="alert" className="text-sm leading-7 text-red-700">{error}</p>}</div></ServicePage>;
}

export function MarriageHistory() {
  const { authentication } = useAuthSession(); const [page,setPage] = useState(1);
  const resource = usePatientResource(useCallback(() => listMarriageRequests(authentication.accessToken,page),[authentication.accessToken,page]));
  return <ServicePage title="درخواست‌های ازدواج" description="دعوت‌های ارسالی و دریافتی همین شماره و وضعیت ادامهٔ خدمت" icon={HeartHandshake} backHref="/assessment" backLabel="خدمات و آزمون‌ها"><PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />{resource.data?.items.map(item => <Link key={item.id} className="service-card my-3 block" href={item.invitationPath}><h2>{item.service.title}</h2>{item.isInitiator && item.recipientPhoneMasked && <p>همراه: <bdi dir="ltr">{item.recipientPhoneMasked}</bdi></p>}<p className="text-sm">{new Date(item.createdAt).toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran'})}</p><p className="mt-2 text-sm">{item.isInitiator ? 'دعوت ارسالی' : 'دعوت دریافتی'} · {statuses[item.status]}</p></Link>)}{resource.data?.total === 0 && <p className="service-card">هنوز درخواستی برای این حساب وجود ندارد.</p>}{resource.data && <PatientPagination page={page} total={resource.data.total} onChange={setPage} />}</ServicePage>;
}

export function MarriageOffers() {
  const { authentication } = useAuthSession();
  const [page, setPage] = useState(1);
  const resource = usePatientResource(
    useCallback(
      () => listEducationalAssessmentOfferings(authentication.accessToken, page, 'COUPLES', 'MARRIAGE'),
      [authentication.accessToken, page],
    ),
  );

  return (
    <section aria-label="انتخاب خدمت شناخت پیش از ازدواج" className="space-y-4">
      <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />

      {resource.data?.total === 0 && (
        <p className="rounded-2xl border border-border bg-white p-5 text-sm leading-7 text-muted-foreground">
          فعلاً آزمونی برای شروع در دسترس نیست. دعوت‌های قبلی را می‌توانی از بخش پیگیری باز کنی.
        </p>
      )}

      {resource.data?.items
        .filter(item => item.servicePurpose === 'MARRIAGE')
        .map(item => (
          <Link
            key={item.id}
            href={marriageHref('/assessment/marriage/new/' + item.id)}
            className="group block min-w-0 rounded-2xl border border-border/80 bg-white p-4 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
          >
            <h2 className="text-base font-semibold leading-8 text-foreground">{item.title}</h2>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              هر نفر جداگانه پاسخ می‌دهد؛ برای دعوت فقط شمارهٔ موبایل همراه را لازم داری.
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

      <Link
        href="/assessment/marriage"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        پیگیری دعوت‌های ارسالی و دریافتی
        <ArrowLeft aria-hidden="true" size={16} />
      </Link>

      {resource.data && (
        <PatientPagination page={page} total={resource.data.total} onChange={setPage} />
      )}
    </section>
  );
}
