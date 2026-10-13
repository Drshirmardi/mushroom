"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Heart, Search, ShoppingCart, X } from "lucide-react";
import { useOptionalAuthSession } from "@/components/auth/session-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/store/product-card";
import {
  commerceErrorMessage,
  getCommerceCart,
  getCommerceWishlist,
  listCommerceProducts,
  updateCommerceCart,
  updateCommerceWishlist,
  type CommerceCart,
  type CommerceWishlist,
} from "@/lib/commerce-catalog-api";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { cartCount, useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";

const price = (value: string) => Number(value);
const cacheCart = (cart: CommerceCart) => useCartStore.getState().replace(cart.items.map((item) => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, price: price(item.sku.currentPriceToman), qty: item.quantity })));
const cacheWishlist = (wishlist: CommerceWishlist) => useWishlistStore.getState().replace(wishlist.items.map((item) => item.sku.id));

export default function StorePage() {
  const session = useOptionalAuthSession();
  const navigateScreen = useScreenNavigation();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Awaited<ReturnType<typeof listCommerceProducts>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySku, setBusySku] = useState<string | null>(null);
  const cart = useCartStore((state) => state.items);
  const wishlist = useWishlistStore((state) => state.ids);
  const count = cartCount(cart);

  const loadCatalog = useCallback(async () => {
    setProducts(null); setError(null);
    try { setProducts(await listCommerceProducts({ query: search || undefined })); }
    catch (cause) { setError(commerceErrorMessage(cause)); }
  }, [search]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadCatalog(); }, search ? 250 : 0); return () => window.clearTimeout(timer); }, [loadCatalog, search]);
  useEffect(() => {
    if (!session) { useCartStore.getState().replace([]); useWishlistStore.getState().replace([]); return; }
    let cancelled = false;
    void Promise.all([getCommerceCart(session.authentication.accessToken), getCommerceWishlist(session.authentication.accessToken)])
      .then(([serverCart, serverWishlist]) => { if (!cancelled) { cacheCart(serverCart); cacheWishlist(serverWishlist); } })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [session]);

  const categories = useMemo(() => [...new Map((products?.items ?? []).map((product) => [product.category.id, product.category])).values()], [products]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const shown = (products?.items ?? []).filter((product) => !categoryId || product.category.id === categoryId);
  const updateCart = async (skuId: string) => { if (!session) { navigateScreen("CartScreen"); return; } const current = cart.find((item) => item.skuId === skuId)?.qty ?? 0; setBusySku(skuId); try { cacheCart(await updateCommerceCart(session.authentication.accessToken, skuId, Math.min(current + 1, 100))); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusySku(null); } };
  const toggleWishlist = async (skuId: string) => { if (!session) { navigateScreen("WishlistScreen"); return; } setBusySku(skuId); try { cacheWishlist(await updateCommerceWishlist(session.authentication.accessToken, skuId, !wishlist.includes(skuId))); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusySku(null); } };

  return <main className="store-catalog" aria-labelledby="store-heading">
    <a href="#store-products" className="store-skip-link">رفتن به محصولات</a>
    <header className="store-heading">
      <div><h1 id="store-heading">فروشگاه</h1><p>محصولات سلامت</p></div>
      <div className="store-actions">
        <Button variant="secondary" className="store-icon-button" aria-label="علاقه‌مندی‌ها" onClick={() => navigateScreen("WishlistScreen")}>
          <Heart aria-hidden="true" size={20} />{wishlist.length > 0 && <span className="store-badge">{toP(wishlist.length)}</span>}
        </Button>
        <Button variant="secondary" className="store-icon-button" aria-label={`سبد خرید، ${toP(count)} کالا`} onClick={() => navigateScreen("CartScreen")}>
          <ShoppingCart aria-hidden="true" size={20} />{count > 0 && <span className="store-badge">{toP(count)}</span>}
        </Button>
      </div>
    </header>
    <label className="store-search-label" htmlFor="store-search">جست‌وجوی محصول</label>
    <div className="store-search">
      <Search aria-hidden="true" size={20} />
      <Input id="store-search" name="product-search" type="search" autoComplete="off" dir="auto" value={search}
        onChange={(event) => setSearch(event.target.value)} placeholder="نام محصول را جست‌وجو کنید…" />
      {search && <Button variant="ghost" className="store-icon-button" aria-label="پاک کردن جست‌وجو" onClick={() => setSearch("")}><X aria-hidden="true" size={18} /></Button>}
    </div>
    {categories.length > 1 && <nav className="store-categories" aria-label="دسته‌بندی محصولات">
      {[{ id: null, name: "همه" }, ...categories].map((category) => <Button variant="secondary" key={category.id ?? "all"}
        aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
        {categoryId === category.id && <Check aria-hidden="true" size={16} />}{category.name}
      </Button>)}
    </nav>}
    {!products && !error && <div className="store-state" role="status"><p>در حال دریافت محصولات…</p><div className="store-skeleton" aria-hidden="true"><span /><span /></div></div>}
    {error && <div className="store-state store-state--error" role="alert"><h2>درخواست انجام نشد</h2><p>{error}</p><Button variant="secondary" onClick={() => void loadCatalog()}>تلاش دوباره</Button></div>}
    {products && shown.length === 0 && <div className="store-state"><Search aria-hidden="true" size={28} /><h2>محصولی یافت نشد</h2><p>با کلمات دیگری جست‌وجو کنید یا فیلتر را پاک کنید.</p><Button variant="secondary" onClick={() => { setSearch(""); setCategoryId(null); }}>پاک کردن فیلتر</Button></div>}
    <div id="store-products" tabIndex={-1} className="store-grid" aria-label="محصولات">
      {shown.map((product) => { const sku = product.skus[0]; if (!sku) return null;
        return <ProductCard key={product.id} product={product} saved={wishlist.includes(sku.id)} inCart={cart.some((item) => item.skuId === sku.id)}
          busy={busySku === sku.id} authenticated={!!session} onAdd={(id) => void updateCart(id)} onFavorite={(id) => void toggleWishlist(id)} />;
      })}
    </div>
  </main>;
}
