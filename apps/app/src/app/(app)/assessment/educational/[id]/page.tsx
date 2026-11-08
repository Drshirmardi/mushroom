'use client';
import { AsyncButton } from '@/components/shared/async-button';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';
import { useCallback, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { components } from '@sabz-zendegi/api-client';
import { ClipboardList } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PolicyAcceptance } from '@/components/shared/policy-acceptance';
import {
  getEducationalAssessmentOffering,
  acceptAssessmentConsent,
  claimFreeAssessmentAccess,
  createAssessmentPurchase,
  withdrawAssessmentConsent,
} from '@/lib/digital-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { finishOperation, useOperationKey } from '@/lib/use-operation-key';
import { formatRial } from '@/lib/wallet-money';
import { patientErrorMessage } from '@/lib/patient-request';

export default function EducationalOfferingPage() {
  const { id } = useParams<{ id: string }>(),
    { authentication } = useAuthSession();
  const resource = usePatientResource(
    useCallback(
      () => getEducationalAssessmentOffering(authentication.accessToken, id),
      [authentication.accessToken, id],
    ),
  );
  return (
    <ServicePage
      title="شرایط ارزیابی"
      description="متن پردازش، نگهداری و نمایش نتیجه را پیش از شروع بخوانید."
      icon={ClipboardList}
      backHref="/assessment"
      backLabel="ارزیابی‌ها"
    >
      <div className="service-detail space-y-4">
        <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />
        {resource.data && (
          <FreeAccess
            key={`${authentication.user.id}:${resource.data.id}:${resource.data.processingConsentId}:${resource.data.accessGrantId}`}
            offering={resource.data}
            token={authentication.accessToken}
            userId={authentication.user.id}
            reload={() => void resource.reload()}
          />
        )}
      </div>
    </ServicePage>
  );
}
function FreeAccess({
  offering,
  token,
  userId,
  reload,
}: {
  offering: components['schemas']['EducationalAssessmentOfferingDetailDto'];
  token: string;
  userId: string;
  reload: () => void;
}) {
  const router = useRouter(),
    lock = useRef(false);
  const [accepted, setAccepted] = useState(false),
    [termsAccepted, setTermsAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const key = useOperationKey(`${userId}:educational-assessment:${offering.id}`);
  const [repurchasing, setRepurchasing] = useState(false);
  const ownedGrantId = repurchasing ? null : offering.accessGrantId,
    available = repurchasing
      ? offering.publicPurchaseAvailable
      : offering.accessSupported && (!offering.pendingIntentId || !!offering.accessGrantId);
  const start = async () => {
    if (
      lock.current ||
      !available ||
      !offering.processingPolicy ||
      (!ownedGrantId && (!accepted || (offering.priceMode === 'PAID' && !termsAccepted)))
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      let grantId = ownedGrantId;
      if (!grantId) {
        const policy = offering.processingPolicy;
        const body = {
          policyVersionId: policy.id,
          contentHash: policy.contentHash,
          accepted: true as const,
        };
        const consentId =
          offering.processingConsentId ??
          (await acceptAssessmentConsent(token, body, await key({ action: 'consent', ...body })))
            .id;
        if (offering.priceMode === 'PAID') {
          if (!offering.termsPolicy) throw new Error('Purchase terms unavailable');
          const termsBody = {
            policyVersionId: offering.termsPolicy.id,
            contentHash: offering.termsPolicy.contentHash,
            accepted: true as const,
          };
          const termsId =
            offering.termsConsentId ??
            (
              await acceptAssessmentConsent(
                token,
                termsBody,
                await key({ action: 'consent', ...termsBody }),
              )
            ).id;
          const purchase = {
            publicationId: offering.id,
            publicationHash: offering.publicationHash,
            processingConsentRecordId: consentId,
            termsConsentRecordId: termsId,
          };
          const operation = {
            action: 'purchase',
            ...purchase,
            previousGrantId: offering.accessGrantId,
          };
          const intent = await createAssessmentPurchase(token, purchase, await key(operation));
          await finishOperation(`${userId}:educational-assessment:${offering.id}`, operation);
          router.push(`/profile/wallet/pay?intentId=${intent.id}`);
          return;
        }
        const claim = { publicationId: offering.id, processingConsentRecordId: consentId };
        grantId = (
          await claimFreeAssessmentAccess(
            token,
            claim,
            await key({ action: 'free-access', ...claim }),
          )
        ).id;
      }
      router.push(`/assessment/resume?grantId=${grantId}`);
    } catch (reason) {
      setError(patientErrorMessage(reason));
      lock.current = false;
      setBusy(false);
    }
  };
  const withdraw = async () => {
    if (
      lock.current ||
      !offering.processingConsentId ||
      !window.confirm(
        'رضایت پردازش پس گرفته شود؟ ادامهٔ آزمون و دسترسی به نتیجه متوقف می‌شود؛ سوابق حذف نمی‌شوند.',
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await withdrawAssessmentConsent(
        token,
        offering.processingConsentId,
        await key({ action: 'withdraw', id: offering.processingConsentId }),
      );
      reload();
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <section className="service-card">
        <h2>{offering.title}</h2>
        <strong className="service-price">
          {offering.priceMode === 'FREE'
            ? 'رایگان'
            : `${formatRial(BigInt(offering.amountRial ?? '0'))} تومان`}
        </strong>
        <p>ویژهٔ افراد ۱۸ سال و بالاتر؛ نتیجهٔ آموزشی جایگزین بررسی پزشک نیست.</p>
      </section>
      {offering.processingPolicy &&
        (ownedGrantId ? (
          <HistoricalPolicy
            policy={offering.processingPolicy}
            accepted={!!offering.processingConsentId}
          />
        ) : (
          <PolicyAcceptance
            policy={offering.processingPolicy}
            accepted={accepted}
            onChange={setAccepted}
            disabled={busy}
          />
        ))}
      {offering.priceMode === 'PAID' &&
        offering.termsPolicy &&
        (ownedGrantId ? (
          <HistoricalPolicy policy={offering.termsPolicy} accepted={!!offering.termsConsentId} />
        ) : (
          <PolicyAcceptance
            policy={offering.termsPolicy}
            accepted={termsAccepted}
            onChange={setTermsAccepted}
            disabled={busy}
          />
        ))}
      {!available && (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {offering.blockers.includes('ADULT_BIRTH_DATE_REQUIRED')
            ? 'برای این ارزیابی، تاریخ تولد ثبت‌شده باید سن ۱۸ سال یا بالاتر را تأیید کند.'
            : 'شروع این عرضه در وضعیت فعلی در دسترس نیست.'}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={
          busy ||
          !available ||
          (!ownedGrantId && (!accepted || (offering.priceMode === 'PAID' && !termsAccepted)))
        }
        onClick={() => void start()}
        className="w-full rounded-2xl bg-primary p-4 font-bold text-white disabled:opacity-40"
        aria-busy={Boolean(busy)}
      >
        {busy ? (
          <>
            <HeartbeatLoader />
            {'در حال ثبت…'}
          </>
        ) : ownedGrantId ? (
          'باز کردن آزمون من'
        ) : offering.priceMode === 'PAID' ? (
          'ثبت رضایت و ادامه به پرداخت'
        ) : (
          'ثبت رضایت و شروع رایگان'
        )}
      </button>
      {offering.pendingIntentId && (
        <button
          className="w-full rounded-xl border border-border p-3 text-primary"
          onClick={() => router.push(`/profile/wallet/pay?intentId=${offering.pendingIntentId}`)}
        >
          ادامهٔ پرداخت قبلی
        </button>
      )}
      {offering.publicPurchaseAvailable && offering.accessGrantId && !repurchasing && (
        <button
          disabled={busy}
          className="w-full rounded-xl border border-border p-3 text-primary"
          onClick={() => {
            setAccepted(false);
            setTermsAccepted(false);
            setRepurchasing(true);
          }}
        >
          خرید و انجام دوبارهٔ آزمون
        </button>
      )}
      {repurchasing && (
        <button
          disabled={busy}
          className="w-full p-3 text-primary"
          onClick={() => setRepurchasing(false)}
        >
          بازگشت به نتیجهٔ قبلی
        </button>
      )}
      {offering.processingConsentId && (
        <AsyncButton
          type="button"
          disabled={busy}
          onClick={() => withdraw()}
          className="w-full rounded-xl border border-border p-3 text-sm text-red-700 disabled:opacity-40"
        >
          پس‌گرفتن رضایت پردازش
        </AsyncButton>
      )}
    </>
  );
}

function HistoricalPolicy({
  policy,
  accepted,
}: {
  policy: { title: string; body: string };
  accepted: boolean;
}) {
  return (
    <section className="min-w-0 space-y-3 rounded-2xl border border-border bg-white p-4">
      <h2 className="text-sm font-bold">{policy.title}</h2>
      <p className="text-sm font-semibold">
        {accepted
          ? 'رضایت این شرایط قبلاً ثبت شده است.'
          : 'رضایت ثبت‌شده‌ای برای این شرایط نمایش داده نمی‌شود.'}
      </p>
      <p className="whitespace-pre-wrap break-words text-sm leading-8 text-muted-foreground">
        {policy.body}
      </p>
    </section>
  );
}
