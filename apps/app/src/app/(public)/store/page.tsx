"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Heart, ChevronDown, MapPin, Search, ShoppingBasket, Sparkles, X } from "lucide-react";
import { useOptionalAuthSession } from "@/components/auth/session-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/store/product-card";
import { IncredibleOffers } from "@/components/store/incredible-offers";
import { AddressSheet } from "@/components/store/address-sheet";
import { StoreHeroSlider } from "@/components/store/store-hero-slider";
import { StoreShortcuts } from "@/components/store/store-shortcuts";
import { LoadingState } from "@/components/shared/skeletons";
import { AnimatedGroup } from "@/components/motion/animated-group";
import { StoreCollection } from "@/components/store/store-collection";
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
import { TEST_SHORTCUTS, type StoreShortcut } from "@/stores/shortcuts";
import { useWishlistStore } from "@/stores/wishlist";
import { useBannerStore } from "@/stores/banners";
import { listStoreBanners, storeBannerImageUrl } from "@/lib/content-banners-api";

const price = (value: string) => Number(value);
const deliveryKey = (userId: string) => `store-delivery-address:${userId}`;
const readStoredDelivery = (userId: string | null): string | null => {
  if (!userId || typeof window === "undefined") return null;
  try { return window.localStorage.getItem(deliveryKey(userId)); } catch { return null; }
};
const storeDelivery = (userId: string | null, addressId: string) => {
  if (!userId || typeof window === "undefined") return;
  try { window.localStorage.setItem(deliveryKey(userId), addressId); } catch { /* private-mode storage may be unavailable */ }
};
const cacheCart = (cart: CommerceCart) => useCartStore.getState().replace(cart.items.map((item) => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, price: price(item.sku.currentPriceToman), qty: item.quantity, imageUrl: productImageUrl(item.product) })));
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
    let cancelled = false;
    useBannerStore.getState().setSlides([]);
    void listStoreBanners().then((banners) => {
      if (cancelled) return;
      useBannerStore.getState().setSlides(
        banners
          .filter((banner) => storeBannerImageUrl(banner) !== null)
          .map((banner) => ({ id: banner.id, image: storeBannerImageUrl(banner)!, alt: banner.title, href: banner.destinationUrl })),
      );
    });
    return () => { cancelled = true; useBannerStore.getState().setSlides([]); };
  }, []);
  useEffect(() => {
    if (!session) { setAddresses([]); setDelivery(null); return; }
    let cancelled = false;
    const userId = session.authentication.user.id;
    void getCommerceAddresses(session.authentication.accessToken)
      .then((list) => {
        if (cancelled) return;
        setAddresses(list);
        // Never clobber an explicit pick with the server default on refetch:
        // keep the current selection when it still exists, else restore the
        // stored pick, else fall back to the default/first address.
        setDelivery((current) => {
          if (current && list.some((item) => item.id === current.id)) return current;
          const stored = readStoredDelivery(userId);
          const storedMatch = stored ? list.find((item) => item.id === stored) : undefined;
          return storedMatch ?? list.find((item) => item.isDefault) ?? list[0] ?? null;
        });
      })
      .catch(() => { if (!cancelled) { setAddresses([]); setDelivery(null); } });
    return () => { cancelled = true; };
  }, [session]);
  useEffect(() => {
    if (!session) { useCartStore.getState().replace([]); useWishlistStore.getState().replace([]); return; }
    let cancelled = false;
    void Promise.all([getCommerceCart(session.authentication.accessToken), getCommerceWishlist(session.authentication.accessToken)])
      .then(([serverCart, serverWishlist]) => { if (!cancelled) { cacheCart(serverCart); cacheWishlist(serverWishlist); } })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [session]);

  const [catalogView, setCatalogView] = useState(false);
  const [addresses, setAddresses] = useState<CommerceAddress[]>([]);
  const [delivery, setDelivery] = useState<CommerceAddress | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const selectDelivery = (address: CommerceAddress) => { setDelivery(address); storeDelivery(session?.authentication.user.id ?? null, address.id); };
  const isFiltering = catalogView || search.trim().length > 0;
  const shown = products?.items ?? [];
  const renderProduct = (product: NonNullable<typeof products>["items"][number]) => {
    const sku = product.skus[0];
    if (!sku) return null;
    return <ProductCard key={product.id} product={product} saved={wishlist.includes(sku.id)} inCart={cart.some(item => item.skuId === sku.id)}
      busy={busySku === sku.id} onFavorite={id => void toggleWishlist(id)} />;
  };
  const toggleWishlist = async (skuId: string) => { if (!session) { navigateScreen("WishlistScreen"); return; } setBusySku(skuId); try { cacheWishlist(await updateCommerceWishlist(session.authentication.accessToken, skuId, !wishlist.includes(skuId))); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusySku(null); } };

  return <main className="store-catalog" aria-labelledby="store-heading">
    <a href="#store-products" className="store-skip-link">رفتن به محصولات</a>
    <header className="store-heading">
      <div><h1 id="store-heading">فروشگاه</h1><p>محصولات سلامت</p></div>
      <div className="store-actions">
        <Button variant="ghost" className="store-icon-button" aria-label="علاقه‌مندی‌ها" onClick={() => navigateScreen("WishlistScreen")}>
          <Heart aria-hidden="true" size={22} />{wishlist.length > 0 && <span className="store-badge">{toP(wishlist.length)}</span>}
        </Button>
        <Button variant="ghost" className="store-icon-button" aria-label={`سبد خرید، ${toP(count)} کالا`} onClick={() => navigateScreen("CartScreen")}>
          <ShoppingBasket aria-hidden="true" size={22} />{count > 0 && <span className="store-badge store-badge--danger">{toP(count)}</span>}
        </Button>
      </div>
    </header>
    <label className="sr-only" htmlFor="store-search">جستجو در فروشگاه سبز زندگی</label>
    <div className="store-search" role="search" aria-label="جست‌وجوی محصولات فروشگاه">
      <span className="store-search__icon"><Search aria-hidden="true" size={20} /></span>
      <Input id="store-search" name="product-search" type="search" autoComplete="off" dir="rtl" value={search}
        onChange={(event) => setSearch(event.target.value)} placeholder="جستجو در فروشگاه سبز زندگی" />
      {search ? <Button variant="ghost" className="store-icon-button" aria-label="پاک کردن جست‌وجو" onClick={() => setSearch("")}><X aria-hidden="true" size={18} /></Button> : <span className="store-search__clear-space" aria-hidden="true" />}
    </div>
    <button
      type="button"
      className="store-delivery"
      onClick={() => setDeliveryOpen(true)}
      aria-label={delivery ? `تحویل به ${delivery.province}، ${delivery.city}، ${delivery.line1}` : "افزودن آدرس تحویل"}
    >
      <MapPin aria-hidden="true" size={16} />
      <span className="store-delivery__text">{delivery ? `تحویل به ${delivery.province}، ${delivery.city}، ${delivery.line1}` : "افزودن آدرس تحویل"}</span>
      <ChevronDown aria-hidden="true" size={16} />
    </button>
    {!isFiltering && <StoreHeroSlider onShopNow={() => setCatalogView(true)} />}
    {!isFiltering && <StoreShortcuts
      items={TEST_SHORTCUTS}
      onShortcut={(shortcut: StoreShortcut) => { if (shortcut.target === "catalog") setCatalogView(true); else navigateScreen(shortcut.target); }}
    />}
    {!isFiltering && <IncredibleOffers onViewAll={() => setCatalogView(true)} />}
    {!isFiltering && <>
      <section className="store-promo" aria-label="فروشگاه سبز زندگی">
        <div><h2>فروشگاه سبز زندگی</h2><p>محصولات سلامت، با سفارش آسان و پیگیری شفاف.</p></div>
        <Button variant="secondary" className="store-promo__action" onClick={() => setCatalogView(true)}><Sparkles aria-hidden="true" size={18} />مشاهده همه</Button>
      </section>
    </>}
    {!products && !error && <LoadingState label="در حال دریافت محصولات…" variant="grid" />}
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
        <AnimatedGroup className="store-grid" preset="slide">{shown.map(renderProduct)}</AnimatedGroup>
      </>}
    </div>
    <AnimatePresence>
      {deliveryOpen && <AddressSheet
        authenticated={!!session}
        accessToken={session?.authentication.accessToken ?? null}
        addresses={addresses}
        selectedId={delivery?.id ?? null}
        onSelect={selectDelivery}
        onAddresses={setAddresses}
        onLogin={() => { setDeliveryOpen(false); navigateScreen("CheckoutScreen"); }}
        onClose={() => setDeliveryOpen(false)}
      />}
    </AnimatePresence>
  </main>;
}
