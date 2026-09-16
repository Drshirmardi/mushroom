"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { commerceErrorMessage, getCommerceCart, updateCommerceCart, type CommerceCart } from "@/lib/commerce-catalog-api";
import { formatPrice, toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { cartTotal, useCartStore } from "@/stores/cart";

const cache = (cart: CommerceCart) => useCartStore.getState().replace(cart.items.map((item) => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, price: Number(item.sku.currentPriceToman), qty: item.quantity })));

export default function CartPage() {
  const { authentication } = useAuthSession(); const router = useRouter(); const navigateScreen = useScreenNavigation();
  const items = useCartStore((state) => state.items); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { cache(await getCommerceCart(authentication.accessToken)); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setLoading(false); } }, [authentication.accessToken]);
  useEffect(() => { void load(); }, [load]);
  const change = async (skuId: string, quantity: number) => { setBusy(skuId); setError(null); try { cache(await updateCommerceCart(authentication.accessToken, skuId, quantity)); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusy(null); } };
  const total = cartTotal(items);
  return <div><PageHeader title="سبد خرید" onBack={() => router.back()} /><div className="space-y-4 px-4 pb-4">{loading && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت سبد خرید…</p>}{error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>}{!loading && !error && items.length === 0 && <EmptyState icon={ShoppingCart} title="سبد خرید خالی است" desc="محصولات مورد نظر را اضافه کنید." action="رفتن به فروشگاه" onAction={() => router.push("/store")} />}{items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-center text-[10px] font-bold text-primary">محصول</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{item.name}</p><p className="mt-1 text-xs font-bold text-primary">{formatPrice(item.price)} تومان</p></div><div className="flex items-center gap-1.5 rounded-xl bg-muted p-1"><button type="button" disabled={busy === item.skuId} onClick={() => void change(item.skuId, item.qty - 1)} className="flex h-6 w-6 items-center justify-center rounded-lg"><Minus size={12} /></button><span className="w-5 text-center text-xs font-bold">{toP(item.qty)}</span><button type="button" disabled={busy === item.skuId || item.qty >= 100} onClick={() => void change(item.skuId, item.qty + 1)} className="flex h-6 w-6 items-center justify-center rounded-lg"><Plus size={12} /></button></div></div>)}{items.length > 0 && <><div className="rounded-2xl border border-border bg-white p-4 shadow-sm"><div className="flex justify-between text-sm"><span className="text-muted-foreground">جمع کالاها</span><span className="font-black text-primary">{formatPrice(total)} تومان</span></div><p className="mt-3 text-xs text-muted-foreground">هزینه ارسال و مبلغ نهایی در مرحله تکمیل خرید تعیین می‌شود.</p></div><button type="button" onClick={() => navigateScreen("CheckoutScreen")} className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-white">ادامه و تکمیل خرید</button></>}</div></div>;
}
