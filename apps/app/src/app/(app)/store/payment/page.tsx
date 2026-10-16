"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Spinner } from "@/components/shared/skeletons";
import { PaymentChooser } from "@/components/billing/payment-chooser";
import { useAuthSession } from "@/components/auth/session-gate";
import { getCommerceOrder, type CommerceOrder } from "@/lib/commerce-catalog-api";
import { createOrderIntent, getBillingIntent, walletErrorMessage, type BillingIntent } from "@/lib/wallet-billing-api";
import { formatPrice, toP } from "@/lib/format";

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

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      if (!orderId && !initialIntentId) {
        setError("شناسهٔ سفارش معتبر نیست.");
        setState("error");
        return;
      }

      if (orderId) {
        const nextOrder = await getCommerceOrder(authentication.accessToken, orderId);
        setOrder(nextOrder);
        if (nextOrder.status !== "PENDING_PAYMENT") {
          setState("notpayable");
          return;
        }
      }

      let intentId = initialIntentId;
      if (!intentId) {
        const created = await createOrderIntent(authentication.accessToken, orderId as string, crypto.randomUUID());
        intentId = created.id;
      }
      const nextIntent = await getBillingIntent(authentication.accessToken, intentId);
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
      setError(walletErrorMessage(cause));
      setState("error");
    }
  }, [authentication.accessToken, initialIntentId, orderId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolvedOrderId = order?.id ?? intent?.orderId ?? orderId;

  return (
    <div>
      <PageHeader title="پرداخت" onBack={() => router.back()} />
      <div className="space-y-4 px-4 pb-6">
        {state === "loading" && (
          <div role="status" className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-white p-8 text-sm text-muted-foreground">
            <Spinner />در حال آماده‌سازی پرداخت…
          </div>
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
              {order ? `این سفارش دیگر قابل پرداخت نیست (وضعیت: ${toP(order.orderNumber)} · ${order.status}).` : "این پرداخت دیگر قابل ادامه نیست."}
            </div>
            {resolvedOrderId && (
              <button
                type="button"
                onClick={() => router.push(`/store/order-tracking?orderId=${encodeURIComponent(resolvedOrderId)}`)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white"
              >
                <ReceiptText size={17} aria-hidden="true" />پیگیری سفارش
              </button>
            )}
          </div>
        )}

        {state === "ready" && intent && (
          <>
            {order && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                <p className="text-sm text-muted-foreground">مبلغ سفارش</p>
                <p className="mt-1 text-2xl font-black text-primary">{formatPrice(Number(order.totalAmountToman))} تومان</p>
                <p className="mt-2 text-xs text-muted-foreground">شماره سفارش {toP(order.orderNumber)}</p>
              </div>
            )}
            <PaymentChooser
              accessToken={authentication.accessToken}
              intent={intent}
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
    <Suspense fallback={null}>
      <PaymentScreen />
    </Suspense>
  );
}
