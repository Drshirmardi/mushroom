"use client";
import { AsyncButton } from "@/components/shared/async-button";
import { participationLoader, participationWaiting } from '@/lib/participation-loader';
import { marriageHref } from '@/lib/marriage-context';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
const button = 'flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-white px-4 py-3 text-center text-sm font-medium disabled:opacity-40';
const primary = `${button} border-primary bg-primary font-semibold text-white`;

export function EducationalCoupleHistory({ token, linkId }: { token: string; linkId?: string }) {
  const [page, setPage] = useState(1);
  const resource = usePatientResource(useCallback(() => listEducationalCouples(token, page, linkId), [token, page, linkId]));
  if (!resource.loading && !resource.error && !resource.data?.total) return null;
  return <ServiceSection title="تست‌های دو نفره من"><PatientResourceState {...resource} retry={() => void resource.reload()} />{resource.data?.items.map(item => <Link key={item.id} href={marriageHref(`/assessment/couples/educational/${item.id}`)} className="service-card"><h3>{item.title}</h3><p>{item.jointResultAvailable ? 'نتیجهٔ هر دو نفر آماده است' : item.ownAccessGrantId ? 'دسترسی پاسخ‌گویی شما آماده است' : item.mutualConsentComplete ? 'رضایت هر دو نفر ثبت شده است' : 'در انتظار رضایت مستقل هر دو نفر'}</p><span className="service-text-action">ادامهٔ تست دو نفره</span></Link>)}{resource.data && <PatientPagination page={page} total={resource.data.total} onChange={setPage} />}</ServiceSection>;
}
export function EducationalCoupleOffers({ token, userId, linkId }: { token: string; userId: string; linkId: string }) {
  const router = useRouter(), lock = useRef(false);
  const [page, setPage] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const resource = usePatientResource(useCallback(() => listEducationalAssessmentOfferings(token, page, 'COUPLES'), [token, page]));
  const key = useOperationKey(`${userId}:educational-couple-select:${linkId}`);
  return <><EducationalCoupleHistory token={token} linkId={linkId} /><ServiceSection title="انتخاب تست دو نفره" description="هر نفر از حساب خودش رضایت می‌دهد و پاسخ‌های خودش را ثبت می‌کند."><PatientResourceState {...resource} retry={() => void resource.reload()} />{resource.data?.items.map(item => <article key={item.id} className="service-card"><h3>{item.title}</h3><strong className="service-price">{item.priceMode === 'FREE' ? 'رایگان' : `${formatRial(BigInt(item.amountRial ?? '0'))} تومان برای هر دو نفر`}</strong><AsyncButton type="button" disabled={busy} className={primary} onClick={async () => {
    if (item.servicePurpose === 'MARRIAGE') { router.push(marriageHref(`/assessment/marriage/new/${item.id}`)); return; }
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const body = { coupleSessionId: linkId, publicationId: item.id, publicationHash: item.publicationHash }; const result = await createEducationalCouple(token, body, await key(body)); await finishOperation(`${userId}:educational-couple-select:${linkId}`,body); router.push(marriageHref(`/assessment/couples/educational/${result.id}`)); }
    catch (reason) { setError(patientErrorMessage(reason)); lock.current = false; setBusy(false); }
  }}>انتخاب این تست برای دو نفر</AsyncButton></article>)}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{resource.data && <PatientPagination page={page} total={resource.data.total} onChange={setPage} />}</ServiceSection></>;
}
export function EducationalCoupleWorkspace({ token, userId, id }: { token: string; userId: string; id: string }) {
  const scope = `${id}:${userId}`;
  const loader = useMemo(() => participationLoader((accessToken: string) => getEducationalCouple(accessToken,scope.split(':')[0])), [scope]);
  const operating = useRef(false);
  const resource = usePatientResource(useCallback(() => loader.load(token), [loader,token]));
  const refresh = resource.refresh;
  const waiting = participationWaiting(resource.data);
  const begin = async () => { operating.current = true; if (loader.pending) await loader.pending.catch(() => null); };
  const end = () => { operating.current = false; };
  const mutated = async () => { loader.mutationSucceeded(); await refresh(); };
  const retry = () => { if (!operating.current) void refresh(); };
  useEffect(() => {
    if (!waiting) return;
    const update = () => { if (!operating.current && document.visibilityState === 'visible' && navigator.onLine) void refresh(); };
    const timer = window.setInterval(update,30000);
    document.addEventListener('visibilitychange',update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange',update); };
  }, [refresh,waiting]);
  return <div className="service-detail min-w-0 space-y-4 break-words"><PatientResourceState {...resource} retry={retry} />{resource.data && <Participation key={`${userId}:${resource.data.contextHash}:${resource.data.participants.find(p => p.isSelf)?.consentState}:${resource.data.ownAccessGrantId}:${resource.data.ownPendingIntentId}`} token={token} userId={userId} data={resource.data} begin={begin} end={end} reload={mutated} refresh={refresh} />}</div>;
}
function Participation({ token, userId, data, reload, refresh, begin, end }: { token: string; userId: string; data: components['schemas']['EducationalCoupleDetailDto']; reload: () => Promise<unknown>; refresh: () => Promise<unknown>; begin: () => Promise<void>; end: () => void }) {
  const router = useRouter(), lock = useRef(false), scope = `${userId}:educational-couple:${data.id}`;
  const own = data.participants.find(p => p.isSelf), alreadyAccepted = own?.consentState === 'ACCEPTED';
  const [processing, setProcessing] = useState(alreadyAccepted), [disclosure, setDisclosure] = useState(alreadyAccepted), [terms, setTerms] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const key = useOperationKey(scope);
  const run = async (work: () => Promise<void>) => { if (lock.current) return; lock.current = true; setBusy(true); setError(''); try { await begin(); await work(); } catch (reason) { setError(patientErrorMessage(reason)); } finally { end(); lock.current = false; setBusy(false); } };
  const accept = () => run(async () => {
    if (!processing || !disclosure || alreadyAccepted || own?.consentState === 'WITHDRAWN') return;
    const policy = data.processingPolicy, consentBody = { policyVersionId: policy.id, contentHash: policy.contentHash, accepted: true as const };
    const accepted = await acceptAssessmentConsent(token, consentBody, await key({ action: 'processing', ...consentBody }));
    const body = { contextHash: data.contextHash, processingConsentRecordId: accepted.id, disclosureContentHash: data.disclosurePolicy.contentHash, disclosureAccepted: true as const, linkedPartnerAcknowledged: true as const };
    await acceptEducationalCouple(token, data.id, body, await key({ action: 'sharing', ...body })); await reload();
  });
  const start = () => run(async () => { const grant = await claimEducationalCoupleFreeAccess(token, data.id, await key({ action: 'free', contextHash: data.contextHash })); router.push(marriageHref(`/assessment/resume?grantId=${grant.id}`)); });
  const purchase = () => run(async () => {
    if (!terms || !data.termsPolicy || !data.mutualConsentComplete) return;
    const policy = data.termsPolicy, consentBody = { policyVersionId: policy.id, contentHash: policy.contentHash, accepted: true as const };
    const accepted = await acceptAssessmentConsent(token, consentBody, await key({ action: 'terms', ...consentBody }));
    const body = { contextHash: data.contextHash, termsConsentRecordId: accepted.id }, operation = { action: 'purchase', ...body };
    const intent = await createEducationalCouplePurchase(token, data.id, body, await key(operation));
    await finishOperation(scope, operation); router.push(marriageHref(`/profile/wallet/pay?intentId=${intent.id}`));
  });
  const nextStep = own?.consentState === 'WITHDRAWN'
    ? 'رضایت شما پس گرفته شده است؛ ادامهٔ این مشارکت ممکن نیست.'
    : !alreadyAccepted
      ? 'برای ادامه، ابتدا رضایت مستقل خودت را ثبت کن.'
      : data.jointResultAvailable
        ? 'نتیجهٔ مشترک آمادهٔ مشاهده است.'
        : data.ownAccessGrantId
          ? 'دسترسی تست شخصی شما آماده است.'
          : data.ownPendingIntentId
            ? 'پرداخت را از همان جایی که متوقف شد ادامه بده.'
            : data.paymentPending
              ? 'پرداخت در حال بررسی است؛ پس از تأیید، دسترسی فعال می‌شود.'
              : !data.newAccessAvailable
                ? 'این نسخه دیگر برای شروع جدید عرضه نمی‌شود.'
                : !data.mutualConsentComplete
                  ? 'منتظر ثبت رضایت نفر دوم هستیم.'
                  : data.priceMode === 'FREE'
                    ? 'هر دو نفر رضایت داده‌اید؛ تست رایگان آمادهٔ شروع است.'
                    : 'هر دو نفر رضایت داده‌اید؛ نوبت پرداخت هزینه است.';

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <section className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold leading-8 text-foreground">{data.title}</h2>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {data.priceMode === 'FREE'
            ? 'رایگان'
            : formatRial(BigInt(data.amountRial)) + ' تومان برای هر دو نفر'}
        </p>
        <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
          {data.participants.map(participant => (
            <div
              key={participant.slot}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>{participant.isSelf ? 'شما' : 'همراه'}</span>
              <span className="text-xs text-muted-foreground">
                {participant.consentState === 'ACCEPTED'
                  ? 'رضایت ثبت شده'
                  : participant.consentState === 'WITHDRAWN'
                    ? 'رضایت پس گرفته شده'
                    : 'در انتظار رضایت'}
              </span>
            </div>
          ))}
        </div>
        <p role="status" className="mt-4 rounded-xl bg-muted/40 p-3 text-sm leading-7 text-foreground">
          {nextStep}
        </p>
      </section>

      {!alreadyAccepted && own?.consentState !== 'WITHDRAWN' && (
        <section className="space-y-3" aria-label="رضایت مستقل من">
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

      {alreadyAccepted && (data.ownAccessGrantId ? (
        <Link
          className={data.jointResultAvailable ? button : primary}
          href={marriageHref(
            data.ownSubmissionId
              ? '/assessment/resume?submissionId=' + data.ownSubmissionId
              : '/assessment/resume?grantId=' + data.ownAccessGrantId,
          )}
        >
          باز کردن تست شخصی من
        </Link>
      ) : data.ownPendingIntentId ? (
        <Link
          className={primary}
          href={marriageHref('/profile/wallet/pay?intentId=' + data.ownPendingIntentId)}
        >
          ادامهٔ پرداخت
        </Link>
      ) : data.paymentPending ? (
        <p role="status" className="text-sm leading-7 text-muted-foreground">
          پرداخت این تست در حال پیگیری است؛ پس از تأیید، دسترسی هر دو نفر باز می‌شود.
        </p>
      ) : !data.newAccessAvailable ? (
        <p role="status" className="text-sm leading-7 text-muted-foreground">
          نسخهٔ تازه را از صفحهٔ تست‌های دو نفره انتخاب کن.
        </p>
      ) : data.mutualConsentComplete ? (
        data.priceMode === 'FREE' ? (
          <AsyncButton type="button" className={primary} disabled={busy} onClick={() => start()}>
            شروع تست رایگان من
          </AsyncButton>
        ) : (
          <section className="space-y-3" aria-label="پرداخت ارزیابی">
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
      ) : alreadyAccepted ? (
        <p role="status" className="text-sm leading-7 text-muted-foreground">
          نفر دوم هنوز رضایت مستقل خودش را ثبت نکرده است.
        </p>
      ) : null)}

      {data.jointResultAvailable && alreadyAccepted && (
        <Link
          className={primary}
          href={marriageHref('/assessment/couples/educational/result/' + data.id)}
        >
          مشاهدهٔ نتیجهٔ مشترک
        </Link>
      )}

      {(alreadyAccepted || data.ownProcessingConsentRecordId) && (
        <details className="rounded-2xl border border-border/80 bg-white px-4 py-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground">
            مدیریت رضایت‌های ثبت‌شده
          </summary>
          <div className="space-y-2 border-t border-border/70 py-3">
            {alreadyAccepted && (
              <AsyncButton
                className={button}
                disabled={busy}
                onClick={() => {
                  if (window.confirm('اجازهٔ نمایش نتیجهٔ دو نفره پس گرفته شود؟ نتیجهٔ شخصی شما باقی می‌ماند.')) {
                    return run(async () => {
                      await withdrawEducationalCoupleSharing(
                        token, data.id,
                        await key({ action: 'withdraw-sharing', contextHash: data.contextHash }),
                      );
                      await reload();
                    });
                  }
                }}
              >
                پس‌گرفتن اجازهٔ اشتراک نتیجه
              </AsyncButton>
            )}
            {data.ownProcessingConsentRecordId && (
              <AsyncButton
                className={button}
                disabled={busy}
                onClick={() => {
                  if (window.confirm('رضایت پردازش پس گرفته شود؟ ادامهٔ تست و دسترسی به نتیجهٔ شما متوقف می‌شود؛ سوابق حذف نمی‌شوند.')) {
                    return run(async () => {
                      await withdrawAssessmentConsent(
                        token, data.ownProcessingConsentRecordId!,
                        await key({ action: 'withdraw-processing', id: data.ownProcessingConsentRecordId }),
                      );
                      await reload();
                    });
                  }
                }}
              >
                پس‌گرفتن رضایت پردازش من
              </AsyncButton>
            )}
          </div>
        </details>
      )}

      {error && <p role="alert" className="text-sm leading-7 text-red-700">{error}</p>}
      <AsyncButton className={button} disabled={busy} onClick={() => refresh()}>
        به‌روزرسانی وضعیت
      </AsyncButton>
    </div>
  );
}
