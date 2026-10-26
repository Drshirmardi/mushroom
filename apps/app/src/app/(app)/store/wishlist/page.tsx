"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth/session-gate";


import { commerceErrorMessage, getCommerceCart, getCommerceWishlist, updateCommerceWishlist, type CommerceCart, type CommerceWishlist } from "@/lib/commerce-catalog-api";

import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { StoreHeader, StoreState } from "@/components/store/store-ui";

const cacheCart = (cart: CommerceCart) => useCartStore.getState().replace(cart.items.map((item) => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, variantTitle: item.sku.title, price: item.sku.currentPriceToman, tax: item.sku.currentTaxToman, qty: item.quantity })));
const cacheWishlist = (wishlist: CommerceWishlist) => useWishlistStore.getState().replace(wishlist.items.map((item) => item.sku.id));

export default function WishlistPage() {
  const { authentication } = useAuthSession(); const router = useRouter();
  const cartItems = useCartStore(state => state.items);
  const [feedback, setFeedback] = useState("");
  const [wishlist, setWishlist] = useState<CommerceWishlist | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { setWishlist(null); setError(null); setFeedback(""); try { const [saved, cart] = await Promise.all([getCommerceWishlist(authentication.accessToken), getCommerceCart(authentication.accessToken)]); setWishlist(saved); cacheWishlist(saved); cacheCart(cart); } catch (cause) { setError(commerceErrorMessage(cause)); } }, [authentication.accessToken]);
  useEffect(() => { void load(); }, [load]);
  const remove = async (skuId: string) => { setBusy(skuId); setError(null); setFeedback(""); try { const next = await updateCommerceWishlist(authentication.accessToken, skuId, false); setWishlist(next); cacheWishlist(next); setFeedback("محصول از علاقه‌مندی‌ها حذف شد."); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusy(null); } };
  return <main className="store-page"><StoreHeader title="علاقه‌مندی‌ها" onBack={() => router.back()} />
    {!wishlist && !error && <StoreState title="در حال دریافت علاقه‌مندی‌ها…" pending />}
    {error && <StoreState title="درخواست انجام نشد" description={error} error action="تلاش دوباره" onAction={() => void load()} />}
    <p className="store-inline-status" role="status">{feedback}</p>
    {wishlist?.items.length === 0 && <div className="store-empty">
      <Heart size={44} strokeWidth={1.25} className="text-primary" aria-hidden="true" />
      <h2>لیست علاقه‌مندی‌ها خالی است!</h2>
      <p>به فروشگاه سر بزنید و کالاهای موردعلاقه‌تان را ذخیره کنید.</p>
      <Button variant="secondary" className="store-empty__action" onClick={() => router.push("/store")}>رفتن به فروشگاه</Button>
    </div>}
    <div className="store-grid">{wishlist?.items.map(item => <ProductCard key={item.id} product={item.product} skuOverride={item.sku} saved inCart={cartItems.some(cartItem => cartItem.skuId === item.sku.id)} busy={busy === item.sku.id} onFavorite={id => void remove(id)} />)}</div>
  </main>;
}
