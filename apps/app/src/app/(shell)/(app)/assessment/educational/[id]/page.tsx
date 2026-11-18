'use client';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';
import { useCallback, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { components } from '@sabz-zendegi/api-client';
import { ClipboardList } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { ShellAction } from '@/components/layout/shell-slots';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { usePolicyAcceptance, PolicyAcceptance } from '@/components/shared/policy-acceptance';
import {
  getEducationalAssessmentOffering,
  acceptAssessmentConsent,
  claimFreeAssessmentAccess,
  createAssessmentPurchase,
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
      className="assessment-educational-detail"
      title="شرایط ارزیابی"
      description="متن پردازش، نگهداری و نمایش نتیجه را پیش از شروع بخوانید."
      icon={ClipboardList}
      backHref="/assessment"
      backLabel="ارزیابی‌ها"
    >
      <div className="space-y-4">
        <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />
        {resource.data && (
          <FreeAccess
            key={`${authentication.user.id}:${resource.data.id}:${resource.data.processingConsentId}:${resource.data.accessGrantId}`}
            offering={resource.data}
            token={authentication.accessToken}
            userId={authentication.user.id}
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
}: {
  offering: components['schemas']['EducationalAssessmentOfferingDetailDto'];
  token: string;
  userId: string;
}) {
  const router = useRouter(),
    lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const key = useOperationKey(`${userId}:educational-assessment:${offering.id}`);
  const paid = offering.priceMode === 'PAID';
  const repurchasing = paid && Boolean(offering.accessGrantId);
  const ownedGrantId = offering.accessGrantId;
  const hasPendingPayment = Boolean(offering.pendingIntentId);
  const available = hasPendingPayment
    ? true
    : repurchasing
      ? offering.publicPurchaseAvailable
      : offering.accessSupported;
  const consentAlreadyAccepted = Boolean(
    offering.processingConsentId && (!paid || offering.termsConsentId),
  );
  const policies = [
    ...(offering.processingPolicy ? [offering.processingPolicy] : []),
    ...(paid && offering.termsPolicy ? [offering.termsPolicy] : []),
  ];
  const acceptance = usePolicyAcceptance(
    JSON.stringify([offering.publicationHash, ownedGrantId, repurchasing]),
    policies,
    repurchasing && consentAlreadyAccepted,
  );
  const canAccept = Boolean(offering.processingPolicy && (!paid || offering.termsPolicy));
  const start = async () => {
    if (offering.pendingIntentId) {
      router.push(`/profile/wallet/pay?intentId=${offering.pendingIntentId}`);
      return;
    }
    if (ownedGrantId && !repurchasing) {
      router.push(`/assessment/resume?grantId=${ownedGrantId}`);
      return;
    }
    if (
      lock.current ||
      !available ||
      !offering.processingPolicy ||
      (!ownedGrantId && (!canAccept || !acceptance.accepted))
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      let grantId = repurchasing ? null : ownedGrantId;
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
  return (
    <>
      <section className="space-y-3 rounded-3xl border border-border/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{offering.title}</h2>
          <strong className="inline-flex rounded-full bg-primary/10 px-3.5 py-1 text-sm font-extrabold text-primary">
            {offering.priceMode === 'FREE'
              ? 'رایگان'
              : `${formatRial(BigInt(offering.amountRial ?? '0'))} تومان`}
          </strong>
        </div>
      </section>
      {ownedGrantId ? (
        <>
          {offering.processingPolicy && (
            <HistoricalPolicy
              policy={offering.processingPolicy}
              accepted={!!offering.processingConsentId}
            />
          )}
          {paid && offering.termsPolicy && (
            <HistoricalPolicy policy={offering.termsPolicy} accepted={!!offering.termsConsentId} />
          )}
        </>
      ) : (
        <PolicyAcceptance policies={policies} {...acceptance} disabled={busy || !canAccept} />
      )}
      {!available && (
        <p
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"
        >
          {offering.blockers.includes('ADULT_BIRTH_DATE_REQUIRED')
            ? 'برای این ارزیابی، تاریخ تولد ثبت‌شده باید سن ۱۸ سال یا بالاتر را تأیید کند.'
            : 'شروع این عرضه در وضعیت فعلی در دسترس نیست.'}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-7 text-red-700"
        >
          {error}
        </p>
      )}
      <ShellAction>
        <div className="assessment-purchase-action p-3 sm:p-4">
          <button
            type="button"
            disabled={
              busy ||
              !available ||
              (!hasPendingPayment && !ownedGrantId && (!canAccept || !acceptance.accepted))
            }
            onClick={() => void start()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-busy={Boolean(busy)}
          >
            {busy ? (
              <>
                <HeartbeatLoader />
                {'در حال ثبت…'}
              </>
            ) : offering.pendingIntentId ? (
              'ادامهٔ پرداخت'
            ) : ownedGrantId && !repurchasing ? (
              'باز کردن آزمون من'
            ) : repurchasing ? (
              'خرید تست'
            ) : offering.priceMode === 'PAID' ? (
              'خرید تست'
            ) : (
              'ثبت رضایت و شروع رایگان'
            )}
          </button>
        </div>
      </ShellAction>
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
    <section className="min-w-0 space-y-3 rounded-2xl border border-border/80 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">{policy.title}</h2>
        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
          {accepted ? 'رضایت ثبت‌شده' : 'بدون رضایت ثبت‌شده'}
        </span>
      </div>
      <p className="text-xs font-medium text-muted-foreground">
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
