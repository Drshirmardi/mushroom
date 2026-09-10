"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { commerceErrorMessage, getCommerceCart, getCommerceWishlist, updateCommerceCart, updateCommerceWishlist, type CommerceCart, type CommerceWishlist } from "@/lib/commerce-catalog-api";
import { formatPrice } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";

const cacheCart = (cart: CommerceCart) => useCartStore.getState().replace(cart.items.map((item) => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, price: Number(item.sku.currentPriceToman), qty: item.quantity })));
const cacheWishlist = (wishlist: CommerceWishlist) => useWishlistStore.getState().replace(wishlist.items.map((item) => item.sku.id));

export default function WishlistPage() {
  const { authentication } = useAuthSession(); const router = useRouter(); const navigateScreen = useScreenNavigation();
  const [wishlist, setWishlist] = useState<CommerceWishlist | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { setWishlist(null); setError(null); try { const [saved, cart] = await Promise.all([getCommerceWishlist(authentication.accessToken), getCommerceCart(authentication.accessToken)]); setWishlist(saved); cacheWishlist(saved); cacheCart(cart); } catch (cause) { setError(commerceErrorMessage(cause)); } }, [authentication.accessToken]);
  useEffect(() => { void load(); }, [load]);
  const remove = async (skuId: string) => { setBusy(skuId); try { const next = await updateCommerceWishlist(authentication.accessToken, skuId, false); setWishlist(next); cacheWishlist(next); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusy(null); } };
  const add = async (skuId: string) => { setBusy(skuId); try { const current = useCartStore.getState().items.find((item) => item.skuId === skuId)?.qty ?? 0; cacheCart(await updateCommerceCart(authentication.accessToken, skuId, Math.min(current + 1, 100))); navigateScreen("CartScreen"); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusy(null); } };
  return <div><PageHeader title="علاقه‌مندی‌ها" onBack={() => router.back()} /><div className="space-y-3 px-4 pb-4">{!wishlist && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت علاقه‌مندی‌ها…</p>}{error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>}{wishlist?.items.length === 0 && <EmptyState icon={Heart} title="لیست خالی است" desc="محصولات مورد علاقه را ذخیره کنید." action="فروشگاه" onAction={() => router.push("/store")} />}{wishlist?.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"><button type="button" onClick={() => navigateScreen("ProductDetail", { productId: item.product.id })} className="flex min-w-0 flex-1 items-center gap-3 text-right"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-[10px] font-bold text-primary">{item.product.category.name}</div><div><p className="text-sm font-bold text-foreground">{item.product.title}</p><p className="mt-1 text-sm font-black text-primary">{formatPrice(Number(item.sku.currentPriceToman))} تومان</p></div></button><div className="flex flex-col gap-2"><button type="button" disabled={busy === item.sku.id} onClick={() => void add(item.sku.id)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white"><ShoppingCart size={15} /></button><button type="button" disabled={busy === item.sku.id} onClick={() => void remove(item.sku.id)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={15} /></button></div></div>)}</div></div>;
}
