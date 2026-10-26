"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { OrderSummary } from "@/components/store/order-summary";
import { OrderPaymentSuccess } from "@/components/store/order-payment-success";
import { PageHeader } from "@/components/shared/page-header";
import { useAuthSession } from "@/components/auth/session-gate";
import { commerceErrorMessage, getCommerceCart, getCommerceOrder, getCommerceReceipt, type CommerceOrder, type CommerceReceipt } from "@/lib/commerce-catalog-api";
import { formatPrice, toP } from "@/lib/format";
import { productImageUrl } from "@/lib/product-image";
import { useCartStore } from "@/stores/cart";

const paymentLabel = (status: string | null | undefined) => ({ PENDING: "در انتظار پرداخت", REDIRECTED: "در انتظار بازگشت از درگاه", CALLBACK_RECEIVED: "در حال بررسی پرداخت", VERIFYING: "در حال بررسی پرداخت", VERIFIED: "پرداخت تأیید شده", FAILED: "پرداخت ناموفق", EXPIRED: "مهلت پرداخت پایان یافته", REQUIRES_RECONCILIATION: "نیازمند بررسی" }[status ?? ""] ?? "در انتظار پرداخت");

export default function OrderSuccessPage() {
  const { authentication } = useAuthSession(); const router = useRouter(); const orderId = useSearchParams().get("orderId");
  const [order, setOrder] = useState<CommerceOrder | null>(null); const [receipt, setReceipt] = useState<CommerceReceipt | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [dismissedOrderId, setDismissedOrderId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!orderId) { setError("شناسهٔ سفارش معتبر نیست."); setLoading(false); return; }
    setLoading(true); setError(null);
    try { const next = await getCommerceOrder(authentication.accessToken, orderId); setOrder(next); try { setReceipt(await getCommerceReceipt(authentication.accessToken, orderId)); } catch { setReceipt(null); } }
    catch (cause) { setError(commerceErrorMessage(cause)); } finally { setLoading(false); }
  }, [authentication.accessToken, orderId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (receipt?.status !== "VERIFIED" || receipt.orderId !== orderId) return;
    let active = true;
    void getCommerceCart(authentication.accessToken).then(cart => {
      if (active) useCartStore.getState().replace(cart.items.map(item => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, variantTitle: item.sku.title, price: item.sku.currentPriceToman, tax: item.sku.currentTaxToman, qty: item.quantity, imageUrl: productImageUrl(item.product) })));
    }).catch(() => { /* The next cart visit reloads authoritative contents if this refresh fails. */ });
    return () => { active = false; };
  }, [authentication.accessToken, orderId, receipt]);
  return <div><PageHeader title="وضعیت سفارش" onBack={() => router.back()} /><div className="space-y-4 px-4 pb-4">
    {loading && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت وضعیت معتبر سفارش…</p>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button onClick={() => void load()} className="mr-3 font-bold underline">تلاش دوباره</button></div>}
    {order ? <><section className="rounded-2xl border border-border bg-white p-4 shadow-sm"><div className="flex justify-between"><span className="text-sm text-muted-foreground">شماره سفارش</span><span className="font-black text-primary">{toP(order.orderNumber)}</span></div><div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">{receipt ? "پرداخت شما تأیید شده است." : paymentLabel(order.paymentStatus)}</div><p className="mt-3 text-sm">مبلغ سفارش: <strong>{formatPrice(BigInt(order.totalAmountToman))} تومان</strong></p></section>
      <OrderSummary order={order} />
      {receipt ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-bold">رسید پرداخت</p><p className="mt-2">تأیید در {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.verifiedAt))}</p>{receipt.providerReferenceId ? <p className="mt-1">شماره مرجع: {receipt.providerReferenceId}</p> : null}{receipt.providerTraceNumber ? <p className="mt-1">شماره پیگیری: {receipt.providerTraceNumber}</p> : null}</section> : <p className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">تا زمان تأیید واقعی پرداخت، رسید موفق صادر نمی‌شود. اگر تازه پرداخت کرده‌اید، وضعیت را دوباره بررسی کنید.</p>}
      <button onClick={() => router.push(`/store/order-tracking?orderId=${encodeURIComponent(order.id)}`)} className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white">پیگیری سفارش</button>
      {!receipt && <button onClick={() => void load()} className="w-full rounded-2xl border py-3 text-sm font-bold"><RefreshCw size={15} className="ml-2 inline" />تازه‌سازی وضعیت</button>}
    </> : null}
  </div>
    {!loading && !error && order?.id === orderId && receipt?.orderId === orderId && receipt.status === "VERIFIED" && dismissedOrderId !== orderId && (
      <OrderPaymentSuccess key={order.id} order={order} receipt={receipt} onClose={() => setDismissedOrderId(order.id)} onTrack={() => router.push(`/store/order-tracking?orderId=${encodeURIComponent(order.id)}`)} />
    )}
  </div>;
}
