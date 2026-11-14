'use client';
import { AsyncButton } from '@/components/shared/async-button';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';
import { useCallback, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { components } from '@sabz-zendegi/api-client';
import { ClipboardList } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { usePolicyAcceptance, PolicyAcceptance } from '@/components/shared/policy-acceptance';
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
      <div className="space-y-4">
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
  const [busy, setBusy] = useState(false),
    [confirmWithdraw, setConfirmWithdraw] = useState(false),
    [error, setError] = useState('');
  const key = useOperationKey(`${userId}:educational-assessment:${offering.id}`);
  const [repurchasing, setRepurchasing] = useState(false);
  const ownedGrantId = repurchasing ? null : offering.accessGrantId,
    available = repurchasing
      ? offering.publicPurchaseAvailable
      : offering.accessSupported && (!offering.pendingIntentId || !!offering.accessGrantId);
  const paid = offering.priceMode === 'PAID';
  const policies = [
    ...(offering.processingPolicy ? [offering.processingPolicy] : []),
    ...(paid && offering.termsPolicy ? [offering.termsPolicy] : []),
  ];
  const acceptance = usePolicyAcceptance(
    JSON.stringify([offering.publicationHash, ownedGrantId, repurchasing]),
    policies,
  );
  const canAccept = Boolean(offering.processingPolicy && (!paid || offering.termsPolicy));
  const start = async () => {
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
    if (lock.current || !offering.processingConsentId) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await withdrawAssessmentConsent(
        token,
        offering.processingConsentId,
        await key({ action: 'withdraw', id: offering.processingConsentId }),
      );
      setConfirmWithdraw(false);
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
      <section className="space-y-3 rounded-3xl border border-border/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{offering.title}</h2>
          <strong className="inline-flex rounded-full bg-primary/10 px-3.5 py-1 text-sm font-extrabold text-primary">
            {offering.priceMode === 'FREE'
              ? 'رایگان'
              : `${formatRial(BigInt(offering.amountRial ?? '0'))} تومان`}
          </strong>
        </div>
        <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
          ویژهٔ افراد ۱۸ سال و بالاتر؛ نتیجهٔ آموزشی جایگزین بررسی پزشک نیست.
        </p>
      </section>
      {ownedGrantId ? (
        <>
          {offering.processingPolicy && (
            <HistoricalPolicy policy={offering.processingPolicy} accepted={!!offering.processingConsentId} />
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
      <button
        type="button"
        disabled={
          busy ||
          !available ||
          (!ownedGrantId && (!canAccept || !acceptance.accepted))
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
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:border-primary/40 hover:bg-primary/5"
          onClick={() => router.push(`/profile/wallet/pay?intentId=${offering.pendingIntentId}`)}
        >
          ادامهٔ پرداخت قبلی
        </button>
      )}
      {offering.publicPurchaseAvailable && offering.accessGrantId && !repurchasing && (
        <button
          type="button"
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
          onClick={() => {
            setRepurchasing(true);
          }}
        >
          خرید و انجام دوبارهٔ آزمون
        </button>
      )}
      {repurchasing && (
        <button
          type="button"
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted/50 disabled:opacity-50"
          onClick={() => setRepurchasing(false)}
        >
          بازگشت به نتیجهٔ قبلی
        </button>
      )}
      {offering.processingConsentId && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmWithdraw(true)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
        >
          پس‌گرفتن رضایت پردازش
        </button>
      )}
      {confirmWithdraw && (
        <BottomSheet
          title="پس‌گرفتن رضایت پردازش"
          onClose={() => {
            if (!busy) setConfirmWithdraw(false);
          }}
        >
          <div className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              رضایت پردازش پس گرفته شود؟ ادامهٔ آزمون و دسترسی به نتیجه متوقف می‌شود؛ سوابق حذف
              نمی‌شوند.
            </p>
            <AsyncButton
              type="button"
              disabled={busy}
              onClick={() => withdraw()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              تأیید و پس‌گرفتن رضایت
            </AsyncButton>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmWithdraw(false)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground"
            >
              انصراف
            </button>
          </div>
        </BottomSheet>
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
