'use client';
import { AsyncButton } from '@/components/shared/async-button';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { components } from '@sabz-zendegi/api-client';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { Users } from 'lucide-react';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PolicyAcceptance, GuidanceSafety } from '@/components/shared/policy-acceptance';
import {
  getCoupleAssessment,
  acceptCoupleAssessment,
  withdrawCoupleAssessment,
  getCouplePaidState,
  createCouplePurchase,
  getCoupleJointResult,
  createCoupleJointResult,
} from '@/lib/couples-api';
import { getAssessmentOffering, acceptAssessmentConsent } from '@/lib/digital-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { finishOperation, useOperationKey } from '@/lib/use-operation-key';
import { patientErrorMessage } from '@/lib/patient-request';
import { formatRialWithUnit } from '@/lib/wallet-money';
import { billingStatusLabel } from '@/lib/wallet-labels';

export default function CoupleAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const detail = usePatientResource(useCallback(() => getCoupleAssessment(token, id), [token, id]));
  const paid = usePatientResource(useCallback(() => getCouplePaidState(token, id), [token, id]));
  return (
    <ServicePage
      title="ارزیابی مشترک"
      description="رضایت مستقل، پرداخت و پاسخ‌گویی خودتان را در همین ارزیابی مشترک پیگیری کنید."
      icon={Users}
      backHref="/assessment/couples"
      backLabel="ارزیابی زوجین"
    >
      <div className="space-y-4">
        <PatientResourceState variant="detail" {...detail} retry={() => void detail.reload()} />
        {detail.data && (
          <Actions
            key={`${authentication.user.id}:${id}:${detail.data.contextHash}:${detail.data.ownConsent.acceptedAt}:${detail.data.ownConsent.withdrawnAt}`}
            detail={detail.data}
            paid={paid.data}
            token={token}
            userId={authentication.user.id}
            reload={() => {
              void detail.reload();
              void paid.reload();
            }}
          />
        )}
        <PatientResourceState variant="detail" {...paid} retry={() => void paid.reload()} />
        {paid.data && (
          <section className="space-y-3.5 rounded-3xl border border-border/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-foreground">وضعیت مشارکت و پاسخ‌های من</h2>
              <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">
                پرداخت: {billingStatusLabel(paid.data.paymentState)}
              </span>
            </div>
            {paid.data.ownIntentId && (
              <Link
                href={`/profile/wallet/pay?intentId=${paid.data.ownIntentId}`}
                className="inline-flex text-sm font-bold text-primary hover:underline"
              >
                بررسی پرداخت من ←
              </Link>
            )}
            {paid.data.ownSubmissionId ? (
              <Link
                href={
                  paid.data.ownAssessmentState === 'COMPLETE'
                    ? `/assessment/result?submissionId=${paid.data.ownSubmissionId}`
                    : `/assessment/resume?submissionId=${paid.data.ownSubmissionId}`
                }
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-center text-sm font-bold text-white shadow-xs transition hover:bg-primary/90"
              >
                {paid.data.ownAssessmentState === 'COMPLETE'
                  ? 'نتیجهٔ فردی من'
                  : 'ادامهٔ پاسخ‌های من'}
              </Link>
            ) : paid.data.ownStartAvailable && paid.data.ownAccessGrantId ? (
              <Link
                href={`/assessment/resume?grantId=${paid.data.ownAccessGrantId}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-center text-sm font-bold text-white shadow-xs transition hover:bg-primary/90"
              >
                شروع ارزیابی من
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                شروع آزمون من به رضایت‌ها و دسترسی معتبر نیاز دارد.
              </p>
            )}
            <p className="rounded-2xl border border-border/70 bg-muted/30 p-3.5 text-xs leading-6 text-muted-foreground">
              {paid.data.partnerCompletion === 'COMPLETE'
                ? 'همراه مرحلهٔ پاسخ‌گویی را کامل کرده است.'
                : paid.data.partnerCompletion === 'PENDING'
                  ? 'همراه هنوز مرحلهٔ پاسخ‌گویی را کامل نکرده است.'
                  : 'وضعیت همراه قابل نمایش نیست.'}
            </p>
            {paid.data.jointResultState === 'AVAILABLE' && (
              <JointResult
                key={`${authentication.user.id}:${id}:${paid.data.jointResultId}`}
                token={token}
                id={id}
              />
            )}
            {paid.data.jointResultState !== 'AVAILABLE' && (
              <p className="text-sm leading-7 text-muted-foreground">
                {paid.data.jointResultState === 'READY_TO_GENERATE'
                  ? 'شرایط تولید نتیجهٔ مشترک فراهم است؛ از دکمهٔ دریافت نتیجه استفاده کنید.'
                  : 'نتیجهٔ مشترک به رضایت معتبر هر دو نفر، پرداخت و تکمیل هر دو ارزیابی نیاز دارد.'}
              </p>
            )}
          </section>
        )}
        <button
          type="button"
          onClick={() => {
            void detail.reload();
            void paid.reload();
          }}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-primary/5"
        >
          دریافت وضعیت تازه
        </button>
      </div>
    </ServicePage>
  );
}
function Actions({
  detail,
  paid,
  token,
  userId,
  reload,
}: {
  detail: components['schemas']['CoupleAssessmentDetailDto'];
  paid: components['schemas']['CoupleAssessmentPaidStateDto'] | null;
  token: string;
  userId: string;
  reload: () => void;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [partner, setPartner] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epoch] = useState(() => crypto.randomUUID());
  const key = useOperationKey(`${userId}:couple-assessment:${detail.id}`);
  const offering = usePatientResource(
    useCallback(
      () => getAssessmentOffering(token, detail.publicationId),
      [token, detail.publicationId],
    ),
  );
  const ownAccepted = !!detail.ownConsent.acceptedAt && !detail.ownConsent.withdrawnAt;
  const accept = async () => {
    if (busy || !processing || !sharing || !partner || ownAccepted || detail.ownConsent.withdrawnAt)
      return;
    setBusy(true);
    setError(null);
    try {
      const consentBody = {
        policyVersionId: detail.processingPolicy.id,
        contentHash: detail.processingPolicy.contentHash,
        accepted: true as const,
      };
      const consent = await acceptAssessmentConsent(
        token,
        consentBody,
        await key({ action: 'processing', ...consentBody, epoch }),
      );
      const body = {
        contextHash: detail.contextHash,
        processingConsentRecordId: consent.id,
        jointDisclosureAccepted: true as const,
        linkedPartnerAcknowledged: true as const,
      };
      await acceptCoupleAssessment(
        token,
        detail.id,
        body,
        await key({ action: 'participation', ...body }),
      );
      reload();
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const buy = async () => {
    if (busy || !terms || !offering.data || !detail.mutualConsentComplete) return;
    setBusy(true);
    setError(null);
    try {
      const policy = offering.data.termsPolicy;
      const consentBody = {
        policyVersionId: policy.id,
        contentHash: policy.contentHash,
        accepted: true as const,
      };
      const consent =
        offering.data.termsConsent ??
        (await acceptAssessmentConsent(
          token,
          consentBody,
          await key({ action: 'terms', ...consentBody, epoch }),
        ));
      const body = { contextHash: detail.contextHash, termsConsentRecordId: consent.id };
      const command = {
        action: 'purchase',
        ...body,
        previousIntentId: paid?.ownIntentId ?? null,
        previousPaymentState: paid?.paymentState,
      };
      const intent = await createCouplePurchase(token, detail.id, body, await key(command));
      await finishOperation(`${userId}:couple-assessment:${detail.id}`, command);
      router.push(`/profile/wallet/pay?intentId=${intent.id}`);
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const withdraw = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await withdrawCoupleAssessment(
        token,
        detail.id,
        await key({ action: 'withdraw', id: detail.id }),
      );
      setConfirmWithdraw(false);
      reload();
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const generate = async () => {
    if (busy || paid?.jointResultState !== 'READY_TO_GENERATE') return;
    setBusy(true);
    setError(null);
    try {
      await createCoupleJointResult(
        token,
        detail.id,
        await key({ action: 'joint', contextHash: detail.contextHash }),
      );
      reload();
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <section className="space-y-3 rounded-3xl border border-border/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">{detail.title}</h2>
          <p className="inline-flex rounded-full bg-primary/10 px-3.5 py-1 text-sm font-extrabold text-primary">
            {formatRialWithUnit(BigInt(detail.amountRial))}
          </p>
        </div>
        <Link
          href={`/assessment/couples/links/${detail.coupleSessionId}`}
          className="inline-flex text-sm font-bold text-primary hover:underline"
        >
          بررسی اتصال همین همراه ←
        </Link>
        <p className="text-xs leading-6 text-muted-foreground">
          پاسخ و نتیجهٔ فردی هر نفر خصوصی می‌ماند. نتیجهٔ مشترک فقط محتوای آموزشی مجاز را نشان
          می‌دهد. بازپرداخت عادی ارائه نمی‌شود.
        </p>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-7 text-red-700"
        >
          {error}
        </p>
      )}
      {detail.ownConsent.withdrawnAt ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          رضایت شما برای این مشارکت پس گرفته شده و قابل فعال‌سازی دوباره در همین مشارکت نیست.
        </p>
      ) : !ownAccepted ? (
        <>
          <PolicyAcceptance
            policy={detail.processingPolicy}
            accepted={processing}
            onChange={setProcessing}
            disabled={busy}
          />
          <PolicyAcceptance
            policy={detail.jointDisclosurePolicy}
            accepted={sharing}
            onChange={setSharing}
            disabled={busy}
          />
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/80 bg-white p-4 text-sm leading-7 text-foreground shadow-2xs">
            <input
              type="checkbox"
              checked={partner}
              disabled={busy}
              onChange={(event) => setPartner(event.target.checked)}
              className="mt-1.5 h-4 w-4 accent-primary"
            />
            <span>
              همراه متصل به همین مشارکت را بررسی کرده‌ام و اشتراک نتیجه با همین فرد را می‌پذیرم.
            </span>
          </label>
          <AsyncButton
            disabled={busy || !processing || !sharing || !partner}
            onClick={() => accept()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:opacity-40"
          >
            ثبت رضایت مستقل من
          </AsyncButton>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs">
          <p className="text-sm font-bold text-emerald-800">رضایت مشارکت شما ثبت شده است.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmWithdraw(true)}
            className="text-xs font-bold text-red-700 hover:underline disabled:opacity-50"
          >
            پس‌گرفتن رضایت اشتراک نتیجه
          </button>
        </div>
      )}
      <PatientResourceState variant="detail" {...offering} retry={() => void offering.reload()} />
      {ownAccepted &&
        detail.mutualConsentComplete &&
        offering.data &&
        (paid?.paymentState === 'UNPAID' ||
          paid?.paymentState === 'EXPIRED' ||
          paid?.paymentState === 'CANCELLED') && (
          <>
            <PolicyAcceptance
              policy={offering.data.termsPolicy}
              accepted={terms}
              onChange={setTerms}
              disabled={busy}
            />
            <AsyncButton
              disabled={busy || !terms}
              onClick={() => buy()}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:opacity-40"
            >
              پذیرش شرایط و پرداخت ارزیابی مشترک
            </AsyncButton>
          </>
        )}
      {!detail.mutualConsentComplete && !detail.ownConsent.withdrawnAt && (
        <p className="rounded-2xl border border-border/70 bg-muted/30 p-3.5 text-sm leading-7 text-muted-foreground">
          تا رضایت مستقل هر دو نفر، خرید و نتیجهٔ مشترک فعال نمی‌شود.
        </p>
      )}
      {paid?.jointResultState === 'READY_TO_GENERATE' && (
        <AsyncButton
          disabled={busy}
          onClick={() => generate()}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:opacity-40"
        >
          دریافت نتیجهٔ مشترک مجاز
        </AsyncButton>
      )}
      {confirmWithdraw && (
        <BottomSheet
          title="پس‌گرفتن رضایت اشتراک نتیجه"
          onClose={() => {
            if (!busy) setConfirmWithdraw(false);
          }}
        >
          <div className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              رضایت اشتراک نتیجهٔ همین ارزیابی پس گرفته شود؟ این تصمیم برای این مشارکت نهایی است؛
              پاسخ‌های خصوصی حذف و هزینه بازپرداخت نمی‌شود.
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
function JointResult({ token, id }: { token: string; id: string }) {
  const resource = usePatientResource(
    useCallback(() => getCoupleJointResult(token, id), [token, id]),
  );
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-foreground">نتیجهٔ آموزشی مشترک</h2>
      <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />
      {resource.data?.content.map((item) => (
        <article
          key={item.id}
          className="space-y-3 rounded-2xl border border-border/80 bg-background/50 p-4"
        >
          <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{item.body}</p>
          <GuidanceSafety safety={item.safety} />
        </article>
      ))}
      {resource.data?.recommendConsultation && (
        <Link
          href="/appointments/book"
          className="inline-flex text-sm font-bold text-primary hover:underline"
        >
          بررسی شرایط رزرو مشاوره ←
        </Link>
      )}
    </section>
  );
}
