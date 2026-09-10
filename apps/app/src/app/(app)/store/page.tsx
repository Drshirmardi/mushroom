"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, Search, ShoppingCart, X } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { commerceErrorMessage, getCommerceCart, getCommerceWishlist, listCommerceProducts, updateCommerceCart, updateCommerceWishlist, type CommerceCart, type CommerceWishlist } from "@/lib/commerce-catalog-api";
import { formatPrice, toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { cartCount, useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";

const price = (value: string) => Number(value);
const cacheCart = (cart: CommerceCart) => useCartStore.getState().replace(cart.items.map((item) => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, price: price(item.sku.currentPriceToman), qty: item.quantity })));
const cacheWishlist = (wishlist: CommerceWishlist) => useWishlistStore.getState().replace(wishlist.items.map((item) => item.sku.id));

export default function StorePage() {
  const { authentication } = useAuthSession();
  const navigateScreen = useScreenNavigation();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Awaited<ReturnType<typeof listCommerceProducts>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySku, setBusySku] = useState<string | null>(null);
  const cart = useCartStore((state) => state.items);
  const wishlist = useWishlistStore((state) => state.ids);
  const count = cartCount(cart);

  const load = useCallback(async () => {
    setProducts(null); setError(null);
    try {
      const [catalog, serverCart, serverWishlist] = await Promise.all([listCommerceProducts(authentication.accessToken, { query: search || undefined }), getCommerceCart(authentication.accessToken), getCommerceWishlist(authentication.accessToken)]);
      setProducts(catalog); cacheCart(serverCart); cacheWishlist(serverWishlist);
    } catch (cause) { setError(commerceErrorMessage(cause)); }
  }, [authentication.accessToken, search]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, search ? 250 : 0); return () => window.clearTimeout(timer); }, [load, search]);
  const categories = useMemo(() => [...new Map((products?.items ?? []).map((product) => [product.category.id, product.category])).values()], [products]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const shown = (products?.items ?? []).filter((product) => !categoryId || product.category.id === categoryId);
  const updateCart = async (skuId: string) => { const current = cart.find((item) => item.skuId === skuId)?.qty ?? 0; setBusySku(skuId); try { cacheCart(await updateCommerceCart(authentication.accessToken, skuId, Math.min(current + 1, 100))); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusySku(null); } };
  const toggleWishlist = async (skuId: string) => { setBusySku(skuId); try { cacheWishlist(await updateCommerceWishlist(authentication.accessToken, skuId, !wishlist.includes(skuId))); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusySku(null); } };

  return <div className="space-y-4 px-4">
    <div className="flex items-center justify-between pb-1 pt-3"><div><h1 className="text-xl font-bold text-foreground">فروشگاه</h1><p className="mt-0.5 text-sm text-muted-foreground">محصولات سلامت</p></div><div className="flex gap-2"><button type="button" onClick={() => navigateScreen("WishlistScreen")} className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-white shadow-sm"><Heart size={20} />{wishlist.length > 0 && <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">{toP(wishlist.length)}</span>}</button><button type="button" onClick={() => navigateScreen("CartScreen")} className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-white shadow-sm"><ShoppingCart size={20} />{count > 0 && <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">{toP(count)}</span>}</button></div></div>
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-3 shadow-sm"><Search size={16} className="shrink-0 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی محصول..." className="flex-1 bg-transparent text-right text-sm outline-none" />{search && <button type="button" onClick={() => setSearch("")}><X size={16} /></button>}</div>
    {categories.length > 1 && <div className="flex gap-2 overflow-x-auto pb-0.5">{[{ id: null, name: "همه" }, ...categories].map((category) => <button type="button" key={category.id ?? "all"} onClick={() => setCategoryId(category.id)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${categoryId === category.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{category.name}</button>)}</div>}
    {!products && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت محصولات…</p>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>}
    {products && shown.length === 0 && <EmptyState icon={Search} title="محصولی یافت نشد" desc="با کلمات دیگری جستجو کنید." action="پاک کردن فیلتر" onAction={() => { setSearch(""); setCategoryId(null); }} />}
    <div className="grid grid-cols-2 gap-3 pb-4">{shown.map((product) => { const sku = product.skus[0]; const inCart = cart.some((item) => item.skuId === sku.id); const saved = wishlist.includes(sku.id); return <article key={product.id} className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm"><button type="button" onClick={() => navigateScreen("ProductDetail", { productId: product.id })} className="block w-full text-right"><div className="flex h-28 items-center justify-center bg-primary/10 p-3 text-center text-xs font-bold text-primary">{product.category.name}</div><div className="p-3"><p className="line-clamp-2 text-sm font-semibold text-foreground">{product.title}</p><p className="mt-2 text-xs font-bold text-primary">{formatPrice(price(sku.currentPriceToman))} تومان</p></div></button><button type="button" disabled={busySku === sku.id} onClick={() => void toggleWishlist(sku.id)} aria-label="علاقه‌مندی" className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-xl ${saved ? "bg-rose-500 text-white" : "bg-white/90"}`}><Heart size={13} className={saved ? "fill-white" : ""} /></button><div className="flex items-center justify-between px-3 pb-3"><span className="text-[10px] text-muted-foreground">{inCart ? "در سبد" : "قابل انتخاب"}</span><button type="button" disabled={busySku === sku.id} onClick={() => void updateCart(sku.id)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-60"><ShoppingCart size={14} /></button></div></article>; })}</div>
  </div>;
}
