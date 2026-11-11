"use client";
import { AsyncButton } from "@/components/shared/async-button";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { participationLoader, participationWaiting } from '@/lib/participation-loader';
import { marriageHref } from '@/lib/marriage-context';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ChevronDown, Clock, RefreshCw, Sparkles, Users } from 'lucide-react';
import type { components } from '@sabz-zendegi/api-client';
import { ServiceSection } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { PolicyAcceptance } from '@/components/shared/policy-acceptance';
import { acceptAssessmentConsent, listEducationalAssessmentOfferings, withdrawAssessmentConsent } from '@/lib/digital-services-api';
import { acceptEducationalCouple, claimEducationalCoupleFreeAccess, createEducationalCouple, createEducationalCouplePurchase, getEducationalCouple, listEducationalCouples, withdrawEducationalCoupleSharing } from '@/lib/couples-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { finishOperation, useOperationKey } from '@/lib/use-operation-key';
import { patientErrorMessage } from '@/lib/patient-request';
import { formatRial } from '@/lib/wallet-money';

const button = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-center text-sm font-medium text-foreground shadow-2xs transition-colors hover:bg-muted/40 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const primary = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-3 text-center text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-primary/90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const dangerButton = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600';

export function EducationalCoupleHistory({ token, linkId }: { token: string; linkId?: string }) {
  const [page, setPage] = useState(1);
  const resource = usePatientResource(useCallback(() => listEducationalCouples(token, page, linkId), [token, page, linkId]));
  if (!resource.loading && !resource.error && !resource.data?.total) return null;
  return (
    <ServiceSection title="تست‌های دو نفره من">
      <PatientResourceState {...resource} retry={() => void resource.reload()} />
      <div className="grid gap-3">
        {resource.data?.items.map(item => {
          const statusLabel = item.jointResultAvailable
            ? 'نتیجهٔ هر دو نفر آماده است'
            : item.ownAccessGrantId
              ? 'دسترسی پاسخ‌گویی شما آماده است'
              : item.mutualConsentComplete
                ? 'رضایت هر دو نفر ثبت شده است'
                : 'در انتظار رضایت مستقل هر دو نفر';
          const statusClass = item.jointResultAvailable
            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
            : item.ownAccessGrantId
              ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80';
          return (
            <Link
              key={item.id}
              href={marriageHref(`/assessment/couples/educational/${item.id}`)}
              className="group block rounded-2xl border border-border/80 bg-white p-4 shadow-2xs transition-all hover:border-primary/50 hover:shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-bold leading-7 text-foreground sm:text-base">{item.title}</h3>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-xs text-muted-foreground">تست آموزشی دو نفره</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary transition-transform group-hover:-translate-x-0.5 sm:text-sm">
                  ادامهٔ تست دو نفره
                  <ArrowLeft size={16} aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      {resource.data && <PatientPagination page={page} total={resource.data.total} onChange={setPage} />}
    </ServiceSection>
  );
}

export function EducationalCoupleOffers({ token, userId, linkId }: { token: string; userId: string; linkId: string }) {
  const router = useRouter(), lock = useRef(false);
  const [page, setPage] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const resource = usePatientResource(useCallback(() => listEducationalAssessmentOfferings(token, page, 'COUPLES'), [token, page]));
  const key = useOperationKey(`${userId}:educational-couple-select:${linkId}`);
  return (
    <>
      <EducationalCoupleHistory token={token} linkId={linkId} />
      <ServiceSection title="انتخاب تست دو نفره" description="هر نفر از حساب خودش رضایت می‌دهد و پاسخ‌های خودش را ثبت می‌کند.">
        <PatientResourceState {...resource} retry={() => void resource.reload()} />
        <div className="grid gap-3">
          {resource.data?.items.map(item => (
            <article key={item.id} className="space-y-3.5 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-base font-bold leading-7 text-foreground">{item.title}</h3>
                <strong className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {item.priceMode === 'FREE' ? 'رایگان' : `${formatRial(BigInt(item.amountRial ?? '0'))} تومان برای هر دو نفر`}
                </strong>
              </div>
              <AsyncButton
                type="button"
                disabled={busy}
                className={primary}
                onClick={async () => {
                  if (item.servicePurpose === 'MARRIAGE') { router.push(marriageHref(`/assessment/marriage/new/${item.id}`)); return; }
                  if (lock.current) return; lock.current = true; setBusy(true); setError('');
                  try {
                    const body = { coupleSessionId: linkId, publicationId: item.id, publicationHash: item.publicationHash };
                    const result = await createEducationalCouple(token, body, await key(body));
                    await finishOperation(`${userId}:educational-couple-select:${linkId}`, body);
                    router.push(marriageHref(`/assessment/couples/educational/${result.id}`));
                  } catch (reason) {
                    setError(patientErrorMessage(reason));
                    lock.current = false;
                    setBusy(false);
                  }
                }}
              >
                انتخاب این تست برای دو نفر
                <ArrowLeft size={16} aria-hidden="true" />
              </AsyncButton>
            </article>
          ))}
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {resource.data && <PatientPagination page={page} total={resource.data.total} onChange={setPage} />}
      </ServiceSection>
    </>
  );
}

export function EducationalCoupleWorkspace({
  token,
  userId,
  id,
  embedded = false,
  prepaidMarriage = false,
}: {
  token: string;
  userId: string;
  id: string;
  embedded?: boolean;
  prepaidMarriage?: boolean;
}) {
  const scope = `${id}:${userId}`;
  const loader = useMemo(() => participationLoader((accessToken: string) => getEducationalCouple(accessToken, scope.split(':')[0])), [scope]);
  const operating = useRef(false);
  const resource = usePatientResource(useCallback(() => loader.load(token), [loader, token]));
  const refresh = resource.refresh;
  const waiting = participationWaiting(resource.data);
  const begin = async () => { operating.current = true; if (loader.pending) await loader.pending.catch(() => null); };
  const end = () => { operating.current = false; };
  const mutated = async () => { loader.mutationSucceeded(); await refresh(); };
  const retry = () => { if (!operating.current) void refresh(); };
  useEffect(() => {
    if (!waiting) return;
    const update = () => { if (!operating.current && document.visibilityState === 'visible' && navigator.onLine) void refresh(); };
    const timer = window.setInterval(update, 30000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [refresh, waiting]);
  return (
    <div className="service-detail min-w-0 space-y-4 break-words">
      <PatientResourceState {...resource} retry={retry} />
      {resource.data && (
        <Participation
          key={`${userId}:${resource.data.contextHash}:${resource.data.participants.find(p => p.isSelf)?.consentState}:${resource.data.ownAccessGrantId}:${resource.data.ownPendingIntentId}`}
          token={token}
          userId={userId}
          data={resource.data}
          embedded={embedded}
          prepaidMarriage={prepaidMarriage}
          begin={begin}
          end={end}
          reload={mutated}
          refresh={refresh}
        />
      )}
    </div>
  );
}

function Participation({
  token,
  userId,
  data,
  embedded,
  prepaidMarriage,
  reload,
  refresh,
  begin,
  end,
}: {
  token: string;
  userId: string;
  data: components['schemas']['EducationalCoupleDetailDto'];
  embedded: boolean;
  prepaidMarriage: boolean;
  reload: () => Promise<unknown>;
  refresh: () => Promise<unknown>;
  begin: () => Promise<void>;
  end: () => void;
}) {
  const router = useRouter(), lock = useRef(false), scope = `${userId}:educational-couple:${data.id}`;
  const own = data.participants.find(p => p.isSelf), alreadyAccepted = own?.consentState === 'ACCEPTED';
  const [processing, setProcessing] = useState(alreadyAccepted);
  const [disclosure, setDisclosure] = useState(alreadyAccepted);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState<'sharing' | 'processing' | null>(null);
  const key = useOperationKey(scope);
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await begin();
      await work();
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      end();
      lock.current = false;
      setBusy(false);
    }
  };
  const accept = () => run(async () => {
    if (!processing || !disclosure || alreadyAccepted || own?.consentState === 'WITHDRAWN') return;
    const policy = data.processingPolicy, consentBody = { policyVersionId: policy.id, contentHash: policy.contentHash, accepted: true as const };
    const accepted = await acceptAssessmentConsent(token, consentBody, await key({ action: 'processing', ...consentBody }));
    const body = { contextHash: data.contextHash, processingConsentRecordId: accepted.id, disclosureContentHash: data.disclosurePolicy.contentHash, disclosureAccepted: true as const, linkedPartnerAcknowledged: true as const };
    await acceptEducationalCouple(token, data.id, body, await key({ action: 'sharing', ...body }));
    await reload();
  });
  const start = () => run(async () => {
    const grant = await claimEducationalCoupleFreeAccess(token, data.id, await key({ action: 'free', contextHash: data.contextHash }));
    router.push(marriageHref(`/assessment/resume?grantId=${grant.id}`));
  });
  const purchase = () => run(async () => {
    if (!terms || !data.termsPolicy || !data.mutualConsentComplete) return;
    const policy = data.termsPolicy, consentBody = { policyVersionId: policy.id, contentHash: policy.contentHash, accepted: true as const };
    const accepted = await acceptAssessmentConsent(token, consentBody, await key({ action: 'terms', ...consentBody }));
    const body = { contextHash: data.contextHash, termsConsentRecordId: accepted.id }, operation = { action: 'purchase', ...body };
    const intent = await createEducationalCouplePurchase(token, data.id, body, await key(operation));
    await finishOperation(scope, operation);
    router.push(marriageHref(`/profile/wallet/pay?intentId=${intent.id}`));
  });

  const nextStep = own?.consentState === 'WITHDRAWN'
    ? 'رضایت شما پس گرفته شده است؛ ادامهٔ این مشارکت ممکن نیست.'
    : !alreadyAccepted
      ? 'برای ادامه، ابتدا رضایت مستقل خودت را در پایین همین بخش ثبت کن.'
      : data.jointResultAvailable
        ? 'پاسخ‌گویی هر دو نفر کامل شده و نتیجهٔ مشترک آمادهٔ مشاهده است.'
        : data.ownAccessGrantId
          ? data.ownSubmissionId
            ? 'می‌توانید پاسخ‌های خود را ادامه دهید یا نتیجهٔ فردی خود را ببینید.'
            : 'دسترسی تست شخصی شما فعال شده و آمادهٔ شروع است.'
          : data.ownPendingIntentId
            ? 'پرداخت را از همان جایی که متوقف شد ادامه بده.'
            : data.paymentPending
              ? 'پرداخت در حال بررسی است؛ پس از تأیید، دسترسی فعال می‌شود.'
              : !data.newAccessAvailable
                ? 'این نسخه دیگر برای شروع جدید عرضه نمی‌شود.'
                : !data.mutualConsentComplete
                  ? 'رضایت شما ثبت شد؛ منتظر ثبت رضایت نفر دوم هستیم تا تست باز شود.'
                  : data.priceMode === 'FREE'
                    ? 'هر دو نفر رضایت داده‌اید؛ تست رایگان آمادهٔ شروع است.'
                    : prepaidMarriage
                      ? 'هر دو نفر رضایت داده‌اید؛ دسترسی تست شخصی در حال آماده‌سازی است.'
                      : 'هر دو نفر رضایت داده‌اید؛ نوبت پرداخت هزینه است.';

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5">
        {!embedded ? (
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-base font-bold leading-8 text-foreground sm:text-lg">{data.title}</h2>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {data.priceMode === 'FREE'
                ? 'رایگان'
                : formatRial(BigInt(data.amountRial)) + ' تومان برای هر دو نفر'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" aria-hidden="true" />
            <h3 className="text-sm font-bold leading-7 text-foreground sm:text-base">
              وضعیت رضایت و آمادگی شرکت‌کنندگان
            </h3>
          </div>
        )}
        <div
          className={
            embedded
              ? 'mt-3.5 grid gap-2.5 sm:grid-cols-2'
              : 'mt-4 grid gap-2.5 border-t border-border/70 pt-4 sm:grid-cols-2'
          }
        >
          {data.participants.map(participant => {
            const isAccepted = participant.consentState === 'ACCEPTED';
            const isWithdrawn = participant.consentState === 'WITHDRAWN';
            return (
              <div
                key={participant.slot}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 text-sm"
              >
                <span className="font-bold text-foreground">
                  {participant.isSelf ? 'شما' : 'نفر دوم'}
                </span>
                <span
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                    isAccepted
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
                      : isWithdrawn
                        ? 'bg-red-50 text-red-700 ring-1 ring-red-200/80'
                        : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
                  ].join(' ')}
                >
                  {isAccepted ? (
                    <CheckCircle2 size={14} aria-hidden="true" />
                  ) : (
                    <Clock size={14} aria-hidden="true" />
                  )}
                  {isAccepted
                    ? 'رضایت ثبت شده'
                    : isWithdrawn
                      ? 'رضایت پس گرفته شده'
                      : 'در انتظار رضایت'}
                </span>
              </div>
            );
          })}
        </div>
        <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-primary/6 p-3.5 text-xs font-medium leading-6 text-foreground sm:text-sm">
          <Sparkles size={17} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
          <span>{nextStep}</span>
        </p>
      </section>

      {!alreadyAccepted && own?.consentState !== 'WITHDRAWN' && (
        <section className="space-y-3 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5" aria-label="رضایت مستقل من">
          <h4 className="text-sm font-bold text-foreground">تأیید شرایط مشارکت و محرمانگی</h4>
          <PolicyAcceptance
            variant="compact"
            policy={data.processingPolicy}
            accepted={processing}
            onChange={setProcessing}
            disabled={busy}
          />
          <PolicyAcceptance
            variant="compact"
            policy={data.disclosurePolicy}
            accepted={disclosure}
            onChange={setDisclosure}
            disabled={busy}
          />
          <AsyncButton
            type="button"
            className={primary}
            disabled={busy || !processing || !disclosure}
            onClick={() => accept()}
          >
            ثبت رضایت من و ادامه
          </AsyncButton>
        </section>
      )}

      {data.jointResultAvailable && alreadyAccepted && (
        <Link
          className={primary}
          href={marriageHref('/assessment/couples/educational/result/' + data.id)}
        >
          مشاهدهٔ نتیجهٔ مشترک دو نفره
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
      )}

      {alreadyAccepted && (data.ownAccessGrantId ? (
        <Link
          className={data.jointResultAvailable ? button : primary}
          href={marriageHref(
            data.ownSubmissionId
              ? '/assessment/resume?submissionId=' + data.ownSubmissionId
              : '/assessment/resume?grantId=' + data.ownAccessGrantId,
          )}
        >
          {data.ownSubmissionId
            ? data.jointResultAvailable
              ? 'مشاهدهٔ نتیجهٔ فردی من'
              : 'ادامه یا مشاهدهٔ تست شخصی من'
            : 'شروع تست شخصی من'}
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
      ) : data.ownPendingIntentId ? (
        <Link
          className={primary}
          href={marriageHref('/profile/wallet/pay?intentId=' + data.ownPendingIntentId)}
        >
          ادامهٔ پرداخت
        </Link>
      ) : data.paymentPending ? (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-7 text-amber-900">
          پرداخت این تست در حال پیگیری است؛ پس از تأیید، دسترسی هر دو نفر باز می‌شود.
        </p>
      ) : !data.newAccessAvailable ? (
        <p role="status" className="rounded-xl border border-border/80 bg-white p-3.5 text-sm leading-7 text-muted-foreground">
          نسخهٔ تازه را از صفحهٔ تست‌های دو نفره انتخاب کن.
        </p>
      ) : data.mutualConsentComplete ? (
        data.priceMode === 'FREE' ? (
          <AsyncButton type="button" className={primary} disabled={busy} onClick={() => start()}>
            شروع تست رایگان من
          </AsyncButton>
        ) : prepaidMarriage ? (
          <div role="status" className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm leading-7 text-foreground">
            <p>
              هزینهٔ این تست قبلاً پرداخت شده است؛ برای دریافت لینک شروع آزمون، دکمهٔ «به‌روزرسانی وضعیت» را بزنید.
            </p>
            <AsyncButton className={primary} disabled={busy} onClick={() => refresh()}>
              <RefreshCw size={16} aria-hidden="true" />
              بررسی و دریافت لینک شروع آزمون
            </AsyncButton>
          </div>
        ) : (
          <section className="space-y-3 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5" aria-label="پرداخت تست">
            {data.termsPolicy && (
              <PolicyAcceptance
                variant="compact"
                policy={data.termsPolicy}
                accepted={terms}
                onChange={setTerms}
                disabled={busy}
              />
            )}
            <AsyncButton className={primary} disabled={busy || !terms} onClick={() => purchase()}>
              پرداخت هزینه تست دو نفره
            </AsyncButton>
          </section>
        )
      ) : null)}

      {(alreadyAccepted || data.ownProcessingConsentRecordId) && (
        <details className="group rounded-2xl border border-border/80 bg-white px-4 py-2 shadow-2xs">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted-foreground sm:text-sm [&::-webkit-details-marker]:hidden">
            <span>مدیریت رضایت‌های ثبت‌شده</span>
            <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2.5 border-t border-border/70 py-3">
            {alreadyAccepted && (
              <button
                type="button"
                className={button + ' text-red-700 hover:bg-red-50/50'}
                disabled={busy}
                onClick={() => setConfirmWithdraw('sharing')}
              >
                پس‌گرفتن اجازهٔ اشتراک نتیجه
              </button>
            )}
            {data.ownProcessingConsentRecordId && (
              <button
                type="button"
                className={button + ' text-red-700 hover:bg-red-50/50'}
                disabled={busy}
                onClick={() => setConfirmWithdraw('processing')}
              >
                پس‌گرفتن رضایت پردازش من
              </button>
            )}
          </div>
        </details>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-7 text-red-700">
          {error}
        </p>
      )}
      <AsyncButton className={button} disabled={busy} onClick={() => refresh()}>
        <RefreshCw size={16} aria-hidden="true" />
        به‌روزرسانی وضعیت
      </AsyncButton>

      {confirmWithdraw && (
        <BottomSheet
          title={confirmWithdraw === 'sharing' ? 'پس‌گرفتن اجازهٔ اشتراک نتیجه' : 'پس‌گرفتن رضایت پردازش'}
          onClose={() => { if (!lock.current) setConfirmWithdraw(null); }}
          onBeforeClose={() => !lock.current}
        >
          <div className="space-y-3">
            <p className="text-sm leading-8 text-foreground">
              {confirmWithdraw === 'sharing'
                ? 'آیا اجازهٔ نمایش نتیجهٔ مشترک دو نفره پس گرفته شود؟ نتیجهٔ شخصی شما باقی می‌ماند اما نتیجهٔ مشترک برای هر دو نفر غیرفعال می‌شود.'
                : 'آیا رضایت پردازش پس گرفته شود؟ ادامهٔ تست و دسترسی به نتیجهٔ شما متوقف می‌شود؛ سوابق قبلی حذف نمی‌شوند.'}
            </p>
            <AsyncButton
              className={dangerButton}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  if (confirmWithdraw === 'sharing') {
                    await withdrawEducationalCoupleSharing(
                      token,
                      data.id,
                      await key({ action: 'withdraw-sharing', contextHash: data.contextHash }),
                    );
                  } else if (data.ownProcessingConsentRecordId) {
                    await withdrawAssessmentConsent(
                      token,
                      data.ownProcessingConsentRecordId,
                      await key({ action: 'withdraw-processing', id: data.ownProcessingConsentRecordId }),
                    );
                  }
                  setConfirmWithdraw(null);
                  await reload();
                })
              }
            >
              تأیید و پس‌گرفتن رضایت
            </AsyncButton>
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => setConfirmWithdraw(null)}
            >
              انصراف
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
