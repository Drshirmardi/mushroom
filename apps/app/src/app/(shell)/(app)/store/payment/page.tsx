"use client";
import { LoadingState } from "@/components/shared/skeletons";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StoreIcon } from "@/components/store/store-icon";
import { OrderSummary } from "@/components/store/order-summary";
import { orderStatusLabel } from "@/lib/order-labels";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentChooser } from "@/components/billing/payment-chooser";
import { useAuthSession } from "@/components/auth/session-gate";
import { getCommerceOrder, type CommerceOrder } from "@/lib/commerce-catalog-api";
import { createOrderIntent, getBillingIntent, walletErrorMessage, type BillingIntent } from "@/lib/wallet-billing-api";
import { returnFromPayment } from "@/lib/payment-return";
import { usePaymentRefresh } from "@/lib/use-payment-refresh";
import { toP } from "@/lib/format";
import styles from "@/components/billing/payment.module.css";

type State = "loading" | "ready" | "error" | "notpayable";

function PaymentScreen() {
  const { authentication } = useAuthSession();
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const initialIntentId = params.get("intentId");
  const [intent, setIntent] = useState<BillingIntent | null>(null);
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const paymentRequest = useRef<{ orderId: string; key: string; intentId?: string } | null>(null);

  const load = useCallback(async (quiet = false) => {
    const request = ++generation.current;
    const current = () => request === generation.current;
    if (!quiet) { setState("loading"); setError(null); setOrder(null); setIntent(null); }
    try {
      if (!orderId && !initialIntentId) {
        setError("شناسهٔ سفارش معتبر نیست.");
        setState("error");
        return;
      }

      if (orderId) {
        const nextOrder = await getCommerceOrder(authentication.accessToken, orderId);
        if (!current()) return;
        setOrder(nextOrder);
        if (nextOrder.status === "PAID") {
          router.replace(`/store/order-success?orderId=${encodeURIComponent(nextOrder.id)}`);
          return;
        }
        if (nextOrder.status !== "PENDING_PAYMENT") {
          setState("notpayable");
          return;
        }
      }

      let intentId = initialIntentId;
      if (!intentId) {
        if (paymentRequest.current?.orderId !== orderId) paymentRequest.current = { orderId: orderId as string, key: crypto.randomUUID() };
        const payment = paymentRequest.current;
        if (!payment.intentId) {
          const created = await createOrderIntent(authentication.accessToken, payment.orderId, payment.key);
          if (!current()) return;
          payment.intentId = created.id;
        }
        intentId = payment.intentId;
      }
      const nextIntent = await getBillingIntent(authentication.accessToken, intentId);
      if (!current()) return;
      if (nextIntent.purpose !== "ORDER" || !nextIntent.orderId || (orderId && nextIntent.orderId !== orderId)) {
        setError("این پرداخت مربوط به این سفارش نیست؛ از بخش سفارش‌های من ادامه دهید.");
        setState("error");
        return;
      }
      if (!orderId) {
        const nextOrder = await getCommerceOrder(authentication.accessToken, nextIntent.orderId);
        if (!current()) return;
        setOrder(nextOrder);
        if (nextOrder.status !== "PENDING_PAYMENT" && nextIntent.status !== "PAID") { setState("notpayable"); return; }
      }
      setIntent(nextIntent);
      if (nextIntent.status === "PAID") {
        const paidOrderId = nextIntent.orderId ?? orderId;
        if (paidOrderId) {
          router.replace(`/store/order-success?orderId=${encodeURIComponent(paidOrderId)}`);
          return;
        }
        setState("notpayable");
        return;
      }
      setState(nextIntent.status === "PENDING" ? "ready" : "notpayable");
    } catch (cause) {
      if (!current() || quiet) return;
      setError(walletErrorMessage(cause));
      setState("error");
    }
  }, [authentication.accessToken, initialIntentId, orderId, router]);

  useEffect(() => {
    void load();
    return () => { generation.current++; };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);
  usePaymentRefresh(state === "ready" && intent?.status === "PENDING", refresh);

  const resolvedOrderId = order?.id ?? intent?.orderId ?? orderId;

  return (
    <div className={styles.page}>
      <PageHeader title="پرداخت" onBack={() => returnFromPayment(router, intent, null, resolvedOrderId ? `/store/order-tracking?orderId=${encodeURIComponent(resolvedOrderId)}` : "/store/cart")} backIcon={<StoreIcon name="arrowRight" size={20} className="text-foreground" />} />
      <div className={styles.content}>
        {state === "loading" && (
          <LoadingState variant="payment" />
        )}

        {state === "error" && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button type="button" onClick={() => void load()} className="mr-3 font-bold text-primary">تلاش دوباره</button>
          </div>
        )}

        {state === "notpayable" && (
          <div className="space-y-3">
            <div role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
              {order ? `این سفارش دیگر قابل پرداخت نیست (وضعیت: ${toP(order.orderNumber)} · ${orderStatusLabel(order.status)}).` : "این پرداخت دیگر قابل ادامه نیست."}
            </div>
            {resolvedOrderId && (
              <button
                type="button"
                onClick={() => router.push(`/store/order-tracking?orderId=${encodeURIComponent(resolvedOrderId)}`)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white"
              >
                <StoreIcon name="receipt" size={17} />پیگیری سفارش
              </button>
            )}
          </div>
        )}

        {state === "ready" && intent && (
          <>
            <PaymentChooser
              key={intent.id}
              accessToken={authentication.accessToken}
              intent={intent}
              context={order ? `سفارش شمارهٔ ${toP(order.orderNumber)}` : undefined}
              details={order && <details className={styles.details}><summary>جزئیات سفارش<StoreIcon name="arrow2Down" size={18} /></summary><OrderSummary order={order} /></details>}
              onPaid={(paid) => {
                const paidOrderId = paid.orderId ?? resolvedOrderId;
                if (paidOrderId) router.replace(`/store/order-success?orderId=${encodeURIComponent(paidOrderId)}`);
                else void load();
              }}
              onCancelled={() => router.push("/store/cart")}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<LoadingState variant="payment" className="p-4" />}>
      <PaymentScreen />
    </Suspense>
  );
}
