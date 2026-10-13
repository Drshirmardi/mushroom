"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Search, ShoppingCart, X } from "lucide-react";
import { useOptionalAuthSession } from "@/components/auth/session-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/store/product-card";
import { StoreCollection } from "@/components/store/store-collection";
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

  const [catalogView, setCatalogView] = useState(false);
  const isFiltering = catalogView || search.trim().length > 0;
  const shown = products?.items ?? [];
  const renderProduct = (product: NonNullable<typeof products>["items"][number]) => {
    const sku = product.skus[0];
    if (!sku) return null;
    return <ProductCard key={product.id} product={product} saved={wishlist.includes(sku.id)} inCart={cart.some(item => item.skuId === sku.id)}
      busy={busySku === sku.id} authenticated={!!session} onAdd={id => void updateCart(id)} onFavorite={id => void toggleWishlist(id)} />;
  };
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
    <label className="sr-only" htmlFor="store-search">جست‌وجوی محصول</label>
    <div className="store-search" role="search" aria-label="جست‌وجوی محصولات فروشگاه">
      <span className="store-search__icon"><Search aria-hidden="true" size={20} /></span>
      <Input id="store-search" name="product-search" type="search" autoComplete="off" dir="auto" value={search}
        onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو در فروشگاه…" />
      {search ? <Button variant="ghost" className="store-icon-button" aria-label="پاک کردن جست‌وجو" onClick={() => setSearch("")}><X aria-hidden="true" size={18} /></Button> : <span className="store-search__clear-space" aria-hidden="true" />}
    </div>
    {!products && !error && <div className="store-state" role="status"><p>در حال دریافت محصولات…</p><div className="store-skeleton" aria-hidden="true"><span /><span /></div></div>}
    {error && <div className="store-state store-state--error" role="alert"><h2>درخواست انجام نشد</h2><p>{error}</p><Button variant="secondary" onClick={() => void loadCatalog()}>تلاش دوباره</Button></div>}
    {products && shown.length === 0 && <div className="store-state"><Search aria-hidden="true" size={28} /><h2>محصولی یافت نشد</h2><p>با کلمات دیگری جست‌وجو کنید یا جست‌وجو را پاک کنید.</p><Button variant="secondary" onClick={() => setSearch("")}>پاک کردن جست‌وجو</Button></div>}
    <div id="store-products" tabIndex={-1} aria-label="محصولات">
      {products && shown.length > 0 && !isFiltering && <>
        <StoreCollection title="محصولات فروشگاه" id="store-discover-heading" onViewAll={() => setCatalogView(true)}>
          {shown.slice(0, 8).map(renderProduct)}
        </StoreCollection>
      </>}
      {products && shown.length > 0 && isFiltering && <>
        <header className="store-collection__header store-results-heading"><h2>{search.trim() ? "نتایج جست‌وجو" : "همهٔ محصولات"}</h2>
          <Button variant="ghost" onClick={() => { setSearch(""); setCatalogView(false); }}>بازگشت به فروشگاه</Button>
        </header>
        <div className="store-grid">{shown.map(renderProduct)}</div>
      </>}
    </div>
  </main>;
}
