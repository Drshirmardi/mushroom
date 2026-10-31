"use client";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
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
const button = 'w-full rounded-xl border border-border p-3 text-sm disabled:opacity-40';
const primary = `${button} bg-primary font-bold text-white`;

export function EducationalCoupleHistory({ token, linkId }: { token: string; linkId?: string }) {
  const [page, setPage] = useState(1);
  const resource = usePatientResource(useCallback(() => listEducationalCouples(token, page, linkId), [token, page, linkId]));
  if (!resource.loading && !resource.error && !resource.data?.total) return null;
  return <ServiceSection title="ارزیابی‌های آموزشی مشترک من"><PatientResourceState {...resource} retry={() => void resource.reload()} />{resource.data?.items.map(item => <Link key={item.id} href={`/assessment/couples/educational/${item.id}`} className="service-card"><h3>{item.title}</h3><p>{item.jointResultAvailable ? 'نتیجهٔ هر دو نفر آماده است' : item.ownAccessGrantId ? 'دسترسی پاسخ‌گویی شما آماده است' : item.mutualConsentComplete ? 'رضایت هر دو نفر ثبت شده است' : 'در انتظار رضایت مستقل هر دو نفر'}</p><span className="service-text-action">ادامهٔ ارزیابی مشترک</span></Link>)}{resource.data && <PatientPagination page={page} total={resource.data.total} onChange={setPage} />}</ServiceSection>;
}
export function EducationalCoupleOffers({ token, userId, linkId }: { token: string; userId: string; linkId: string }) {
  const router = useRouter(), lock = useRef(false);
  const [page, setPage] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const resource = usePatientResource(useCallback(() => listEducationalAssessmentOfferings(token, page, 'COUPLES'), [token, page]));
  const key = useOperationKey(`${userId}:educational-couple-select:${linkId}`);
  return <><EducationalCoupleHistory token={token} linkId={linkId} /><ServiceSection title="انتخاب ارزیابی آموزشی زوجین" description="هر نفر از حساب خودش رضایت می‌دهد و پاسخ‌های خودش را ثبت می‌کند."><PatientResourceState {...resource} retry={() => void resource.reload()} />{resource.data?.items.map(item => <article key={item.id} className="service-card"><h3>{item.title}</h3><strong className="service-price">{item.priceMode === 'FREE' ? 'رایگان' : `${formatRial(BigInt(item.amountRial ?? '0'))} تومان برای هر دو نفر`}</strong><button type="button" disabled={busy} className={primary} onClick={async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const body = { coupleSessionId: linkId, publicationId: item.id, publicationHash: item.publicationHash }; const result = await createEducationalCouple(token, body, await key(body)); await finishOperation(`${userId}:educational-couple-select:${linkId}`,body); router.push(`/assessment/couples/educational/${result.id}`); }
    catch (reason) { setError(patientErrorMessage(reason)); lock.current = false; setBusy(false); }
  }}>انتخاب این آزمون برای دو نفر</button></article>)}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{resource.data && <PatientPagination page={page} total={resource.data.total} onChange={setPage} />}</ServiceSection></>;
}
export function EducationalCoupleWorkspace({ token, userId, id }: { token: string; userId: string; id: string }) {
  const resource = usePatientResource(useCallback(() => getEducationalCouple(token, id), [token, id]));
  const refresh = resource.refresh;
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(update, 15000); document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [refresh]);
  return <div className="service-detail space-y-4"><PatientResourceState {...resource} retry={() => void resource.reload()} />{resource.data && <Participation key={`${userId}:${resource.data.contextHash}:${resource.data.participants.find(p => p.isSelf)?.consentState}:${resource.data.ownAccessGrantId}:${resource.data.ownPendingIntentId}`} token={token} userId={userId} data={resource.data} reload={() => void resource.reload()} />}</div>;
}
function Participation({ token, userId, data, reload }: { token: string; userId: string; data: components['schemas']['EducationalCoupleDetailDto']; reload: () => void }) {
  const router = useRouter(), lock = useRef(false), scope = `${userId}:educational-couple:${data.id}`;
  const own = data.participants.find(p => p.isSelf), alreadyAccepted = own?.consentState === 'ACCEPTED';
  const [processing, setProcessing] = useState(alreadyAccepted), [disclosure, setDisclosure] = useState(alreadyAccepted), [terms, setTerms] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const key = useOperationKey(scope);
  const run = async (work: () => Promise<void>) => { if (lock.current) return; lock.current = true; setBusy(true); setError(''); try { await work(); } catch (reason) { setError(patientErrorMessage(reason)); } finally { lock.current = false; setBusy(false); } };
  const accept = () => run(async () => {
    if (!processing || !disclosure || alreadyAccepted || own?.consentState === 'WITHDRAWN') return;
    const policy = data.processingPolicy, consentBody = { policyVersionId: policy.id, contentHash: policy.contentHash, accepted: true as const };
    const accepted = await acceptAssessmentConsent(token, consentBody, await key({ action: 'processing', ...consentBody }));
    const body = { contextHash: data.contextHash, processingConsentRecordId: accepted.id, disclosureContentHash: data.disclosurePolicy.contentHash, disclosureAccepted: true as const, linkedPartnerAcknowledged: true as const };
    await acceptEducationalCouple(token, data.id, body, await key({ action: 'sharing', ...body })); reload();
  });
  const start = () => run(async () => { const grant = await claimEducationalCoupleFreeAccess(token, data.id, await key({ action: 'free', contextHash: data.contextHash })); router.push(`/assessment/resume?grantId=${grant.id}`); });
  const purchase = () => run(async () => {
    if (!terms || !data.termsPolicy || !data.mutualConsentComplete) return;
    const policy = data.termsPolicy, consentBody = { policyVersionId: policy.id, contentHash: policy.contentHash, accepted: true as const };
    const accepted = await acceptAssessmentConsent(token, consentBody, await key({ action: 'terms', ...consentBody }));
    const body = { contextHash: data.contextHash, termsConsentRecordId: accepted.id }, operation = { action: 'purchase', ...body };
    const intent = await createEducationalCouplePurchase(token, data.id, body, await key(operation));
    await finishOperation(scope, operation); router.push(`/profile/wallet/pay?intentId=${intent.id}`);
  });
  return <><section className="service-card"><h2>{data.title}</h2><strong className="service-price">{data.priceMode === 'FREE' ? 'رایگان' : `${formatRial(BigInt(data.amountRial))} تومان برای هر دو نفر`}</strong><ul className="space-y-2 text-sm">{data.participants.map(p => <li key={p.slot}>{p.isSelf ? 'شما' : 'همراه'}: {p.consentState === 'ACCEPTED' ? 'رضایت ثبت شده' : p.consentState === 'WITHDRAWN' ? 'رضایت پس گرفته شده' : 'در انتظار رضایت'}</li>)}</ul></section>
    {!alreadyAccepted && own?.consentState !== 'WITHDRAWN' && <><PolicyAcceptance policy={data.processingPolicy} accepted={processing} onChange={setProcessing} disabled={busy} /><PolicyAcceptance policy={data.disclosurePolicy} accepted={disclosure} onChange={setDisclosure} disabled={busy} /><button type="button" className={primary} disabled={busy || !processing || !disclosure} onClick={() => void accept()}>ثبت رضایت مستقل من برای این آزمون و همین همراه</button></>}
    {data.ownAccessGrantId ? <Link className={primary} href={data.ownSubmissionId ? `/assessment/resume?submissionId=${data.ownSubmissionId}` : `/assessment/resume?grantId=${data.ownAccessGrantId}`}>باز کردن آزمون شخصی من</Link> : data.ownPendingIntentId ? <Link className={primary} href={`/profile/wallet/pay?intentId=${data.ownPendingIntentId}`}>ادامهٔ پرداخت من</Link> : data.paymentPending ? <p role="status" className="text-sm leading-7">پرداخت این ارزیابی در حال پیگیری است. پس از تأیید، دسترسی هر دو نفر باز می‌شود.</p> : !data.newAccessAvailable ? <p role="status" className="text-sm leading-7">این نسخه برای شروع جدید عرضه نمی‌شود؛ نسخهٔ تازه را از صفحهٔ همراهی انتخاب کنید.</p> : data.mutualConsentComplete ? data.priceMode === 'FREE' ? <button className={primary} disabled={busy} onClick={() => void start()}>شروع آزمون رایگان من</button> : <>{data.termsPolicy && <PolicyAcceptance policy={data.termsPolicy} accepted={terms} onChange={setTerms} disabled={busy} />}<button className={primary} disabled={busy || !terms} onClick={() => void purchase()}>پرداخت هزینهٔ ارزیابی هر دو نفر</button></> : <p role="status" className="text-sm leading-7">شروع مشترک به رضایت مستقل هر دو نفر نیاز دارد. هر نفر همین ارزیابی را از حساب خودش باز می‌کند.</p>}
    {data.jointResultAvailable && <Link className={primary} href={`/assessment/couples/educational/result/${data.id}`}>مشاهدهٔ دو نتیجه و نمودار مشترک</Link>}
    {alreadyAccepted && <button className={button} disabled={busy} onClick={() => { if (window.confirm('اجازهٔ نمایش نتیجهٔ مشترک پس گرفته شود؟ نتیجهٔ شخصی شما باقی می‌ماند.')) void run(async () => { await withdrawEducationalCoupleSharing(token, data.id, await key({ action: 'withdraw-sharing', contextHash: data.contextHash })); reload(); }); }}>پس‌گرفتن اجازهٔ اشتراک نتیجه</button>}
    {data.ownProcessingConsentRecordId && <button className={button} disabled={busy} onClick={() => { if (window.confirm('رضایت پردازش پس گرفته شود؟ ادامهٔ آزمون و دسترسی به نتیجهٔ شما متوقف می‌شود؛ سوابق حذف نمی‌شوند.')) void run(async () => { await withdrawAssessmentConsent(token, data.ownProcessingConsentRecordId!, await key({ action: 'withdraw-processing', id: data.ownProcessingConsentRecordId })); reload(); }); }}>پس‌گرفتن رضایت پردازش من</button>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button className={button} disabled={busy} onClick={reload}>به‌روزرسانی وضعیت</button></>;
}
