"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Heart, ShoppingCart } from "lucide-react";
import { useOptionalAuthSession } from "@/components/auth/session-gate";
import { commerceErrorMessage, getCommerceCart, getCommerceProduct, getCommerceWishlist, updateCommerceCart, updateCommerceWishlist, type CommerceCart, type CommerceProduct, type CommerceWishlist } from "@/lib/commerce-catalog-api";
import { Button } from "@/components/ui/button";
import { ProductPrice, QuantityControl, StoreHeader, StoreState } from "@/components/store/store-ui";
import { useScreenNavigation } from "@/lib/navigation";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";

const cacheCart = (cart: CommerceCart) => useCartStore.getState().replace(cart.items.map((item) => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, price: Number(item.sku.currentPriceToman), qty: item.quantity })));
const cacheWishlist = (wishlist: CommerceWishlist) => useWishlistStore.getState().replace(wishlist.items.map((item) => item.sku.id));

export default function ProductDetailPage() {
  const session = useOptionalAuthSession(); const router = useRouter(); const { id } = useParams<{ id: string }>(); const navigateScreen = useScreenNavigation();
  const [product, setProduct] = useState<CommerceProduct | null>(null); const [error, setError] = useState<string | null>(null); const [quantity, setQuantity] = useState(1); const [busy, setBusy] = useState(false); const cart = useCartStore((state) => state.items); const wishlist = useWishlistStore((state) => state.ids);
  const load = useCallback(async () => { setProduct(null); setError(null); try { setProduct(await getCommerceProduct(id)); } catch (cause) { setError(commerceErrorMessage(cause)); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!session) { useCartStore.getState().replace([]); useWishlistStore.getState().replace([]); return; }
    let cancelled = false;
    void Promise.all([getCommerceCart(session.authentication.accessToken), getCommerceWishlist(session.authentication.accessToken)])
      .then(([serverCart, serverWishlist]) => { if (!cancelled) { cacheCart(serverCart); cacheWishlist(serverWishlist); } })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [session]);
  if (!product) return <main className="store-page"><StoreHeader title="جزئیات محصول" onBack={() => router.back()} /><StoreState title={error ? "محصول در دسترس نیست" : "در حال دریافت محصول…"} description={error ?? undefined} error={!!error} pending={!error} action={error ? "تلاش دوباره" : undefined} onAction={() => void load()} /></main>;
  const sku = product.skus[0];
  if (!sku) return <main className="store-page"><StoreHeader title={product.title} onBack={() => router.back()} /><StoreState title="محصول قابل انتخاب نیست" description="برای مشاهدهٔ محصولات دیگر به فروشگاه برگردید." action="فروشگاه" onAction={() => router.push("/store")} /></main>;
  const saved = wishlist.includes(sku.id); const current = cart.find((item) => item.skuId === sku.id)?.qty ?? 0;
  const add = async () => { if (!session) { navigateScreen("CartScreen"); return; } setBusy(true); setError(null); try { cacheCart(await updateCommerceCart(session.authentication.accessToken, sku.id, Math.min(current + quantity, 100))); navigateScreen("CartScreen"); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusy(false); } };
  const toggle = async () => { if (!session) { navigateScreen("WishlistScreen"); return; } setBusy(true); setError(null); try { cacheWishlist(await updateCommerceWishlist(session.authentication.accessToken, sku.id, !saved)); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusy(false); } };
  return <main className="store-page"><StoreHeader title="جزئیات محصول" onBack={() => router.back()} />
    <div className="store-detail">
      <div className="store-detail__media"><span>{product.category.name}</span></div>
      <div className="store-detail__information">
        <div className="store-detail__title"><div><p className="store-eyebrow">{product.category.name}</p><h2>{product.title}</h2></div><Button variant="secondary" className="store-icon-button" busy={busy} aria-pressed={saved} aria-label={saved ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"} onClick={() => void toggle()}><Heart aria-hidden="true" size={20} fill={saved ? "currentColor" : "none"} /></Button></div>
        <p className="store-sku">کد محصول: <bdi dir="ltr">{sku.code}</bdi></p>
        <div className="store-detail__price"><ProductPrice amount={Number(sku.currentPriceToman)} large />{sku.currentTaxToman !== "0" && <div className="store-tax">مالیات مشمول قیمت: <ProductPrice amount={Number(sku.currentTaxToman)} /></div>}</div>
        {product.description && <section className="store-description"><h3>دربارهٔ محصول</h3><p>{product.description}</p></section>}
        {error && <StoreState title="درخواست انجام نشد" description={error} error />}
        <div className="store-purchase"><span>تعداد</span><QuantityControl value={quantity} busy={busy} label={product.title} onChange={setQuantity} /></div>
        <Button className="store-full-button" busy={busy} onClick={() => void add()}>{current > 0 ? <Check aria-hidden="true" size={20} /> : <ShoppingCart aria-hidden="true" size={20} />}{busy ? "در حال انجام…" : session ? (current > 0 ? "افزودن بیشتر به سبد" : "افزودن به سبد") : "ورود برای خرید"}</Button>
        <p className="store-inline-status" role="status">{saved ? "در علاقه‌مندی‌های شما ذخیره شده است" : current > 0 ? "این محصول در سبد شماست" : ""}</p>
      </div>
    </div>
  </main>;
}
