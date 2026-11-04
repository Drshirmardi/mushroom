"use client";
import { LoadingState } from "@/components/shared/skeletons";

import { Suspense, useCallback } from "react";
import { currentInvitationContext, marriageHref } from '@/lib/marriage-context';
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { PaymentChooser } from "@/components/billing/payment-chooser";
import { PageHeader } from "@/components/shared/page-header";
import styles from "@/components/billing/payment.module.css";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { getBillingIntent } from "@/lib/wallet-billing-api";
import { returnFromPayment } from "@/lib/payment-return";
import { usePaymentRefresh } from "@/lib/use-payment-refresh";
import { usePatientResource } from "@/lib/use-patient-resource";
import { billingStatusLabel, billingPurposeLabel } from "@/lib/wallet-labels";
import { formatRial } from "@/lib/wallet-money";

function Payment() {
  const id = useSearchParams().get("intentId");
  const router = useRouter();
  const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => id ? getBillingIntent(authentication.accessToken, id) : Promise.reject(new Error("MISSING_INTENT")), [authentication.accessToken, id]));
  const intent = resource.data;
  usePaymentRefresh(intent?.status === "PENDING", resource.refresh);
  const invitation = currentInvitationContext();
  return (
    <div className={styles.page} dir="rtl">
      <PageHeader title="پرداخت" onBack={() => returnFromPayment(router, intent, invitation)} />
      <div className={styles.content}>
        {!id ? <p role="alert">شناسهٔ پرداخت مشخص نیست.</p> : <PatientResourceState variant="payment" {...resource} refreshing={false} retry={() => void resource.reload()} />}
        {intent && <>
          {intent.status !== "PENDING" && <section className={styles.amount}>
            <h2>{billingPurposeLabel(intent.purpose)}</h2>
            <strong>{formatRial(BigInt(intent.amountRial))} <small>تومان</small></strong>
            <p>{billingStatusLabel(intent.status)}</p>
          </section>}
          {intent.status === "PAID" ? (
            <Link href={marriageHref(`/profile/wallet/payment-result?intentId=${intent.id}`)} className="block rounded-xl bg-primary p-4 text-center font-bold text-white">مشاهدهٔ نتیجه و ادامه</Link>
          ) : intent.status === "PENDING" ? (
            <PaymentChooser key={intent.id} accessToken={authentication.accessToken} intent={intent}
              onPaid={() => router.replace(marriageHref(`/profile/wallet/payment-result?intentId=${intent.id}`))}
              onCancelled={() => void resource.reload()} />
          ) : intent.status === "CANCELLED" ? (
            <div role="status" className="space-y-3 rounded-2xl border border-border bg-white p-4">
              <p className="text-sm">{intent.purpose === "TOPUP" ? "درخواست شارژ کیف پول لغو شده است." : "این درخواست پرداخت لغو شده است."} این لغو فقط مربوط به همین درخواست است؛ درخواست‌های دیگر جداگانه پیگیری می‌شوند.</p>
              <Link href="/" className="block rounded-xl bg-primary p-3 text-center text-sm font-medium text-white">بازگشت به خانه و قدم بعدی</Link>
            </div>
          ) : <p className="text-sm text-muted-foreground">برای این وضعیت امکان پرداخت جدید وجود ندارد. وضعیت نهایی را بررسی کنید.</p>}
        </>}
      </div>
    </div>
  );
}
export default function PaymentPage() { return <Suspense fallback={<LoadingState variant="payment" className="p-4" />}><Payment /></Suspense>; }
