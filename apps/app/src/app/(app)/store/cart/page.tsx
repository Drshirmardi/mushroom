"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth/session-gate";
import { Button } from "@/components/ui/button";
import { CartItem, ProductPrice, StoreHeader, StoreState } from "@/components/store/store-ui";

import { commerceErrorMessage, getCommerceCart, updateCommerceCart, type CommerceCart } from "@/lib/commerce-catalog-api";

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
  return <main className="store-page"><StoreHeader title="سبد خرید" onBack={() => router.back()} />
    {loading && <StoreState title="در حال دریافت سبد خرید…" pending />}
    {error && <StoreState title="سبد به‌روزرسانی نشد" description={error} error action="تلاش دوباره" onAction={() => void load()} />}
    {!loading && !error && items.length === 0 && <StoreState title="سبد خرید خالی است" description="محصولات مورد نظر را از فروشگاه انتخاب کنید." action="رفتن به فروشگاه" onAction={() => router.push("/store")} />}
    {!loading && items.length > 0 && <div className="store-cart-layout"><div className="store-cart-list">{items.map(item => <CartItem key={item.id} item={item} busy={busy === item.skuId} onChange={quantity => void change(item.skuId, quantity)} />)}</div>
      <aside className="store-summary" aria-label="خلاصهٔ سبد"><h2>خلاصهٔ خرید</h2><div className="store-summary__total"><span>جمع کالاها</span><ProductPrice amount={total} large /></div><p>هزینهٔ ارسال و مبلغ نهایی در مرحلهٔ تکمیل خرید تعیین می‌شود.</p><Button className="store-full-button" disabled={loading || !!busy} onClick={() => navigateScreen("CheckoutScreen")}>ادامه و تکمیل خرید</Button></aside>
    </div>}
  </main>;
}
