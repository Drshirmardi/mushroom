'use client';
import { AsyncButton } from '@/components/shared/async-button';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';
import { useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { components } from '@sabz-zendegi/api-client';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { ClipboardList } from 'lucide-react';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PolicyAcceptance } from '@/components/shared/policy-acceptance';
import {
  getAssessmentOffering,
  acceptAssessmentConsent,
  createAssessmentPurchase,
  withdrawAssessmentConsent,
} from '@/lib/digital-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { finishOperation, useOperationKey } from '@/lib/use-operation-key';
import { patientErrorMessage } from '@/lib/patient-request';
import { formatRialWithUnit } from '@/lib/wallet-money';

export default function OfferingPage() {
  const { id } = useParams<{ id: string }>();
  const { authentication } = useAuthSession();
  const resource = usePatientResource(
    useCallback(
      () => getAssessmentOffering(authentication.accessToken, id),
      [authentication.accessToken, id],
    ),
  );
  return (
    <ServicePage
      title="شرایط ارزیابی"
      description="شرایط، هزینه و رضایت‌نامهٔ ارزیابی را پیش از خرید بررسی کنید."
      icon={ClipboardList}
      backHref="/assessment"
      backLabel="ارزیابی‌ها"
    >
      <div className="space-y-4">
        <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />
        {resource.data && (
          <Checkout
            key={`${authentication.user.id}:${resource.data.publicationHash}:${resource.data.processingConsent?.id}`}
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
function Checkout({
  offering,
  token,
  userId,
  reload,
}: {
  offering: components['schemas']['PatientAssessmentOfferingDetailDto'];
  token: string;
  userId: string;
  reload: () => void;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epoch] = useState(() => crypto.randomUUID());
  const key = useOperationKey(`${userId}:assessment:${offering.id}`);
  const purchase = async () => {
    if (
      busy ||
      !processing ||
      !terms ||
      !offering.purchaseSupported ||
      offering.kind !== 'INDIVIDUAL'
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const accept = async (policy: { id: string; contentHash: string }) => {
        const body = {
          policyVersionId: policy.id,
          contentHash: policy.contentHash,
          accepted: true as const,
        };
        return acceptAssessmentConsent(token, body, await key({ action: 'consent', ...body, epoch }));
      };
      const processingRecord =
        offering.processingConsent ?? (await accept(offering.processingPolicy));
      const termsRecord = offering.termsConsent ?? (await accept(offering.termsPolicy));
      if (processingRecord.withdrawnAt || termsRecord.withdrawnAt)
        throw new Error('CONSENT_WITHDRAWN');
      const body = {
        publicationId: offering.id,
        publicationHash: offering.publicationHash,
        processingConsentRecordId: processingRecord.id,
        termsConsentRecordId: termsRecord.id,
      };
      const intent = await createAssessmentPurchase(
        token,
        body,
        await key({ action: 'purchase', ...body }),
      );
      await finishOperation(`${userId}:assessment:${offering.id}`, {
        action: 'purchase',
        ...body,
      });
      router.push(`/profile/wallet/pay?intentId=${intent.id}`);
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const withdraw = async () => {
    if (!offering.processingConsent || busy) return;
    setBusy(true);
    setError(null);
    try {
      await withdrawAssessmentConsent(
        token,
        offering.processingConsent.id,
        await key({ action: 'withdraw', id: offering.processingConsent.id }),
      );
      setConfirmWithdraw(false);
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
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{offering.title}</h2>
          <p className="inline-flex rounded-full bg-primary/10 px-3.5 py-1 text-sm font-extrabold text-primary">
            {formatRialWithUnit(BigInt(offering.amountRial))}
          </p>
        </div>
        <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
          ویژهٔ افراد ۱۸ سال و بالاتر؛ پرداخت پیش از شروع انجام می‌شود. بازپرداخت عادی برای این
          ارزیابی ارائه نمی‌شود.
        </p>
      </section>
      <PolicyAcceptance
        policy={offering.processingPolicy}
        accepted={processing}
        onChange={setProcessing}
        disabled={busy}
      />
      <PolicyAcceptance
        policy={offering.termsPolicy}
        accepted={terms}
        onChange={setTerms}
        disabled={busy}
      />
      {(!offering.purchaseSupported || offering.blockers.length > 0) && (
        <p
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"
        >
          این ارزیابی در وضعیت فعلی برای خرید در دسترس نیست؛ انتشار، شرایط و تأییدهای لازم باید توسط
          کلینیک تکمیل شود.
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
          !processing ||
          !terms ||
          !offering.purchaseSupported ||
          offering.kind !== 'INDIVIDUAL'
        }
        onClick={() => void purchase()}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        aria-busy={Boolean(busy)}
      >
        {busy ? (
          <>
            <HeartbeatLoader />
            {'در حال ثبت…'}
          </>
        ) : (
          'ثبت رضایت و ادامه به پرداخت'
        )}
      </button>
      {offering.processingConsent && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmWithdraw(true)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
        >
          پس‌گرفتن رضایت پردازش
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={reload}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:border-primary/40 hover:bg-primary/5"
      >
        بازخوانی شرایط جاری
      </button>
      {confirmWithdraw && (
        <BottomSheet
          title="پس‌گرفتن رضایت پردازش"
          onClose={() => {
            if (!busy) setConfirmWithdraw(false);
          }}
        >
          <div className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              با پس‌گرفتن رضایت پردازش، ادامهٔ آزمون و دسترسی به نتیجه ممکن است متوقف شود. این کار
              بازپرداخت یا حذف سوابق نیست. ادامه می‌دهید؟
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
