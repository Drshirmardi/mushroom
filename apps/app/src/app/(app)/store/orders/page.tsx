"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { commerceErrorMessage, getCommerceOrders, type CommerceOrder } from "@/lib/commerce-catalog-api";
import { useAuthSession } from "@/components/auth/session-gate";
import { formatPrice, toP } from "@/lib/format";

export default function OrderHistoryPage() {
  const { authentication } = useAuthSession(); const router = useRouter(); const [orders, setOrders] = useState<CommerceOrder[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setOrders(await getCommerceOrders(authentication.accessToken)); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setLoading(false); } }, [authentication.accessToken]); useEffect(() => { void load(); }, [load]);
  return <div><PageHeader title="تاریخچه سفارشات" onBack={() => router.back()} /><div className="space-y-3 px-4 pb-4">{loading && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت سفارش‌ها…</p>}{error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => void load()} className="mr-3 font-bold text-primary">تلاش دوباره</button></div>}{!loading && !error && orders.length === 0 && <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">هنوز سفارشی ثبت نشده است.</p>}{orders.map((order) => <article key={order.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm"><div className="mb-2 flex justify-between"><span className="text-xs font-bold text-primary"># {toP(order.orderNumber)}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{order.status === "PENDING_PAYMENT" ? "در انتظار پرداخت" : order.status}</span></div><p className="text-sm font-semibold">{formatPrice(Number(order.totalAmountToman))} تومان</p><p className="mt-1 text-xs text-muted-foreground">{toP(order.lines.reduce((sum, line) => sum + line.quantity, 0))} کالا · {order.shippingMethod === "PICKUP" ? "دریافت حضوری" : "ارسال با پیک"}</p></article>)}</div></div>;
}
