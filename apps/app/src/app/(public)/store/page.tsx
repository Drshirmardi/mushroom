"use client";
import { BrandLogo } from "@/components/shared/brand-logo";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { Heart, ChevronDown, MapPin, Search, ShoppingCart, X } from "lucide-react";
import { useOptionalAuthSession } from "@/components/auth/session-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/store/product-card";
import { AddressSheet } from "@/components/store/address-sheet";
import { StoreHeroSlider } from "@/components/store/store-hero-slider";
import { StoreShortcuts } from "@/components/store/store-shortcuts";
import styles from "@/components/store/store-home.module.css";
import { LoadingState, SkeletonBox } from "@/components/shared/skeletons";
import { AnimatedGroup } from "@/components/motion/animated-group";
import { StoreCollection } from "@/components/store/store-collection";
import { PatientPagination } from "@/components/shared/patient-pagination";
import { readStoredDelivery, resolveDeliveryAddress, storeDelivery } from "@/lib/store-delivery";
import {
  commerceErrorMessage,
  getCommerceAddresses,
  getCommerceCart,
  getCommerceWishlist,
  listCommerceProducts,
  updateCommerceWishlist,
  type CommerceAddress,
  type CommerceCart,
  type CommerceWishlist,
} from "@/lib/commerce-catalog-api";
import { toP } from "@/lib/format";
import { productImageUrl } from "@/lib/product-image";
import { useScreenNavigation } from "@/lib/navigation";
import { cartCount, useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { useBannerStore } from "@/stores/banners";
import { PersonalizedProducts } from "@/components/store/personalized-products";
import { listStoreBanners, storeBannerImageUrl } from "@/lib/content-banners-api";

const CATALOG_PAGE_SIZE = 20;
const cacheCart = (cart: CommerceCart) => useCartStore.getState().replace(cart.items.map((item) => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, variantTitle: item.sku.title, price: item.sku.currentPriceToman, tax: item.sku.currentTaxToman, qty: item.quantity, imageUrl: productImageUrl(item.product) })));
const cacheWishlist = (wishlist: CommerceWishlist) => useWishlistStore.getState().replace(wishlist.items.map((item) => item.sku.id));

export default function StorePage() {
  return <Suspense fallback={<LoadingState label="در حال دریافت محصولات…" variant="grid" />}><StoreCatalog /></Suspense>;
}

function StoreCatalog() {
  const session = useOptionalAuthSession();
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  const params = useSearchParams();
  const search = (params.get("q") ?? "").slice(0, 120);
  const pageParam = Number(params.get("page"));
  const page = Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const categoryId = params.get("category") ?? undefined;
  const catalogView = params.get("view") === "all";
  const updateCatalog = (patch: Record<string, string | null>, replace = false) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(patch)) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    window.history[replace ? "replaceState" : "pushState"](null, "", `${url.pathname}${url.search}`);
  };
  const clearSearch = () => updateCatalog({ q: null, page: null }, true);
  const requestVersion = useRef(0);
  const focusResults = useRef(false);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof listCommerceProducts>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [accountRetry, setAccountRetry] = useState(0);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerError, setBannerError] = useState(false);
  const [bannerRetry, setBannerRetry] = useState(0);
  const cart = useCartStore((state) => state.items);
  const wishlist = useWishlistStore((state) => state.ids);
  const count = cartCount(cart);

  const loadCatalog = useCallback(async () => {
    const version = ++requestVersion.current;
    setProducts(null); setError(null);
    try {
      const next = await listCommerceProducts({ query: search.trim() || undefined, page, pageSize: CATALOG_PAGE_SIZE, categoryId });
      if (version === requestVersion.current) setProducts(next);
    } catch (cause) { if (version === requestVersion.current) setError(commerceErrorMessage(cause)); }
  }, [search, page, categoryId]);

  useEffect(() => {
    ++requestVersion.current;
    setProducts(null); setError(null);
    const timer = window.setTimeout(() => { void loadCatalog(); }, search ? 250 : 0);
    return () => { window.clearTimeout(timer); ++requestVersion.current; };
  }, [loadCatalog, search]);
  useEffect(() => {
    if (!products || !focusResults.current) return;
    focusResults.current = false;
    const results = document.getElementById("store-products");
    results?.focus({ preventScroll: true });
    results?.scrollIntoView({ block: "start" });
  }, [products]);
  useEffect(() => {
    let cancelled = false;
    useBannerStore.getState().setSlides([]);
    void listStoreBanners().then((banners) => {
      if (cancelled) return;
      useBannerStore.getState().setSlides(
        banners
          .filter((banner) => storeBannerImageUrl(banner) !== null)
          .map((banner) => ({ id: banner.id, image: storeBannerImageUrl(banner)!, alt: banner.title, href: banner.destinationUrl })),
      );
    }).catch(() => { if (!cancelled) setBannerError(true); }).finally(() => { if (!cancelled) setBannerLoading(false); });
    return () => { cancelled = true; useBannerStore.getState().setSlides([]); };
  }, [bannerRetry]);
  useEffect(() => {
    if (!session) { setAddresses([]); setDelivery(null); setDeliveryError(null); return; }
    let cancelled = false;
    setDeliveryError(null);
    const userId = session.authentication.user.id;
    void getCommerceAddresses(session.authentication.accessToken)
      .then((list) => {
        if (cancelled) return;
        setAddresses(list);
        // Never clobber an explicit pick with the server default on refetch:
        // keep the current selection when it still exists, else restore the
        // stored pick, else fall back to the default/first address.
        setDelivery((current) => {
          return resolveDeliveryAddress(list, current?.id, readStoredDelivery(userId)) ?? null;
        });
      })
      .catch(cause => { if (!cancelled) { setDeliveryError(commerceErrorMessage(cause)); } });
    return () => { cancelled = true; };
  }, [session, accountRetry]);
  useEffect(() => {
    if (!session) { useCartStore.getState().replace([]); useWishlistStore.getState().replace([]); setAccountError(null); return; }
    let cancelled = false;
    setAccountError(null);
    void Promise.allSettled([
      getCommerceCart(session.authentication.accessToken),
      getCommerceWishlist(session.authentication.accessToken),
    ]).then(([cartResult, wishlistResult]) => {
      if (cancelled) return;
      if (cartResult.status === "fulfilled") cacheCart(cartResult.value);
      if (wishlistResult.status === "fulfilled") cacheWishlist(wishlistResult.value);
      const failure = cartResult.status === "rejected" ? cartResult.reason
        : wishlistResult.status === "rejected" ? wishlistResult.reason
        : null;
      setAccountError(failure ? commerceErrorMessage(failure) : null);
    });
    return () => { cancelled = true; };
  }, [session, accountRetry]);

  const [addresses, setAddresses] = useState<CommerceAddress[]>([]);
  const [delivery, setDelivery] = useState<CommerceAddress | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const selectDelivery = (address: CommerceAddress) => { setDelivery(address); storeDelivery(session?.authentication.user.id ?? null, address.id); };
  const isFiltering = catalogView || !!categoryId || page > 1 || search.trim().length > 0;
  const shown = products?.items ?? [];
  const renderProduct = (product: NonNullable<typeof products>["items"][number]) => {
    const sku = product.skus[0];
    if (!sku) return null;
    return <ProductCard key={product.id} product={product} showFavorite={false} saved={wishlist.includes(sku.id)} inCart={cart.some(item => item.skuId === sku.id)}
      busy={busySku === sku.id} onFavorite={id => void toggleWishlist(id)} />;
  };
  const toggleWishlist = async (skuId: string) => { if (!session) { navigateScreen("WishlistScreen"); return; } setBusySku(skuId); setFavoriteError(null); try { cacheWishlist(await updateCommerceWishlist(session.authentication.accessToken, skuId, !wishlist.includes(skuId))); } catch (cause) { setFavoriteError(commerceErrorMessage(cause)); } finally { setBusySku(null); } };

  return <main className={`store-catalog ${styles.catalog}`} aria-labelledby="store-heading" dir="rtl">
    <a href="#store-products" className="store-skip-link">رفتن به محصولات</a>
    <header className="store-heading">
      <div><p className="store-brand"><BrandLogo />دکتر شیرمردی</p><h1 id="store-heading">فروشگاه</h1></div>
      <div className="store-actions">
        <Link href="/store/wishlist" className="patient-button patient-button--ghost store-icon-button" aria-label="علاقه‌مندی‌ها">
          <Heart aria-hidden="true" size={22} />{wishlist.length > 0 && <span className="store-badge">{toP(wishlist.length)}</span>}
        </Link>
        <Link href="/store/cart" className="patient-button patient-button--ghost store-icon-button" aria-label={`سبد خرید، ${toP(count)} کالا`}>
          <ShoppingCart aria-hidden="true" size={23} strokeWidth={1.75} />{count > 0 && <span className="store-badge store-badge--danger">{toP(count)}</span>}
        </Link>
      </div>
    </header>
    <div className="store-search-panel">
    <label className="sr-only" htmlFor="store-search">جستجو در فروشگاه</label>
    <div className="store-search" role="search" aria-label="جست‌وجوی محصولات فروشگاه">
      <span className="store-search__icon"><Search aria-hidden="true" size={20} /></span>
      <Input id="store-search" name="product-search" type="search" autoComplete="off" dir="rtl" value={search}
        onChange={(event) => { updateCatalog({ q: event.target.value, page: null, view: "all" }, true); }} placeholder="جستجو در فروشگاه" />
      {search ? <Button variant="ghost" className="store-icon-button" aria-label="پاک کردن جست‌وجو" onClick={() => { clearSearch(); }}><X aria-hidden="true" size={18} /></Button> : <span className="store-search__clear-space" aria-hidden="true" />}
    </div>
    <button
      type="button"
      className="store-delivery"
      aria-haspopup="dialog"
      aria-expanded={deliveryOpen}
      onClick={() => setDeliveryOpen(true)}
      aria-label={delivery ? `تحویل به ${delivery.province}، ${delivery.city}، ${delivery.line1}` : "افزودن آدرس تحویل"}
    >
      <MapPin aria-hidden="true" size={16} />
      <span className="store-delivery__text">{delivery ? `تحویل به ${delivery.province}، ${delivery.city}، ${delivery.line1}` : "افزودن آدرس تحویل"}</span>
      <ChevronDown aria-hidden="true" size={16} />
    </button>
    </div>
    {(accountError || deliveryError) && <div className="wallet-notice wallet-notice--info" role="status"><div><p>{deliveryError ? "آدرس‌های شما دریافت نشدند." : "سبد و علاقه‌مندی‌ها دریافت نشدند."} {deliveryError ?? accountError}</p><Button variant="ghost" onClick={() => setAccountRetry(value => value + 1)}>دریافت دوبارهٔ اطلاعات حساب</Button></div></div>}
    {favoriteError && <div role="alert" className="store-state store-state--error"><p>ذخیرهٔ علاقه‌مندی انجام نشد. {favoriteError}</p></div>}
    {!isFiltering && (bannerLoading ? <LoadingState variant="card" label="در حال دریافت بنرهای فروشگاه…"><SkeletonBox className="my-4 h-[180px] w-full rounded-2xl" /></LoadingState> : bannerError ? <div role="alert" className="store-personal-hint"><p>بنرهای فروشگاه دریافت نشد.</p><Button variant="ghost" onClick={() => { setBannerLoading(true); setBannerError(false); setBannerRetry(value => value + 1); }}>تلاش دوباره</Button></div> : <StoreHeroSlider onShopNow={() => updateCatalog({ view: "all", page: null })} />)}
    {!isFiltering && <StoreShortcuts />}
    {!isFiltering && <PersonalizedProducts key={session?.authentication.user.id ?? "guest"} accessToken={session?.authentication.accessToken} renderProduct={renderProduct} />}
    {categoryId && <div className="store-catalog-tools"><span>نمایش یک دستهٔ محصول</span><Button variant="ghost" onClick={() => updateCatalog({ category: null, page: null })}>همهٔ دسته‌ها<X size={15} aria-hidden="true" /></Button></div>}
    {!products && !error && <LoadingState label="در حال دریافت محصولات…" variant="grid" />}
    {error && <div className="store-state store-state--error" role="alert"><h2>درخواست انجام نشد</h2><p>{error}</p><Button variant="secondary" onClick={() => void loadCatalog()}>تلاش دوباره</Button></div>}
    {products && shown.length === 0 && <div className="store-state"><Search aria-hidden="true" size={28} /><h2>{search.trim() ? "محصولی یافت نشد" : "هنوز محصولی در این صفحه نیست"}</h2><p>{search.trim() ? "با کلمات دیگری جست‌وجو کنید یا جست‌وجو را پاک کنید." : "بعداً دوباره سر بزنید یا محصولات صفحهٔ قبل را ببینید."}</p>{search && <Button variant="secondary" onClick={() => { clearSearch(); }}>پاک کردن جست‌وجو</Button>}</div>}
    <div id="store-products" tabIndex={-1} aria-label="محصولات">
      {products && shown.length > 0 && !isFiltering && <>
        <StoreCollection title="محصولات فروشگاه" id="store-discover-heading" onViewAll={() => updateCatalog({ view: "all", page: null })}>
          {shown.slice(0, 8).map(renderProduct)}
        </StoreCollection>
      </>}
      {products && shown.length > 0 && isFiltering && <>
        <header className="store-collection__header store-results-heading"><h2>{search.trim() ? "نتایج جست‌وجو" : "همهٔ محصولات"}</h2>
          <Button variant="ghost" onClick={() => { updateCatalog({ q: null, page: null, view: null, category: null }); }}>بازگشت به فروشگاه</Button>
        </header>
        <AnimatedGroup className="store-grid" preset="slide">{shown.map(renderProduct)}</AnimatedGroup>
      </>}
      {products && isFiltering && <div className="store-pagination">
        <p role="status">{toP(products.total)} محصول · به‌ترتیب نام</p>
        <PatientPagination page={page} pageSize={CATALOG_PAGE_SIZE} total={products.total} onChange={next => { focusResults.current = true; updateCatalog({ page: next > 1 ? String(next) : null }); }} />
      </div>}
    </div>
    <AnimatePresence>
      {deliveryOpen && <AddressSheet
        authenticated={!!session}
        accessToken={session?.authentication.accessToken ?? null}
        addresses={addresses}
        selectedId={delivery?.id ?? null}
        onSelect={selectDelivery}
        onAddresses={setAddresses}
        onLogin={() => { setDeliveryOpen(false); router.push("/profile/addresses"); }}
        onClose={() => setDeliveryOpen(false)}
      />}
    </AnimatePresence>
  </main>;
}
