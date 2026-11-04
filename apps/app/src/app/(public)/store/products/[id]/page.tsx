"use client";
import { ShellAction } from '@/components/layout/shell-slots';

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Heart, Share2, ShoppingCart } from "lucide-react";
import { useOptionalAuthSession } from "@/components/auth/session-gate";
import { commerceErrorMessage, getCommerceCart, getCommerceProduct, getCommerceWishlist, listCommerceProducts, updateCommerceCart, updateCommerceWishlist, type CommerceCart, type CommerceProduct, type CommerceWishlist } from "@/lib/commerce-catalog-api";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { AddedToCartToast } from "@/components/store/added-to-cart-toast";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductDetailPanel } from "@/components/store/product-detail-panel";
import { ProductContentSections } from "@/components/store/product-content-sections";
import { productImageAlt, productImageUrl } from "@/lib/product-image";
import { ProductPrice, QuantityControl, StoreHeader, StoreState } from "@/components/store/store-ui";
import { useScreenNavigation } from "@/lib/navigation";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { useRecentStore } from "@/stores/recently-viewed";

const cacheCart = (cart: CommerceCart) => useCartStore.getState().replace(cart.items.map((item) => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, variantTitle: item.sku.title, price: item.sku.currentPriceToman, tax: item.sku.currentTaxToman, qty: item.quantity, imageUrl: productImageUrl(item.product) })));
const cacheWishlist = (wishlist: CommerceWishlist) => useWishlistStore.getState().replace(wishlist.items.map((item) => item.sku.id));

export default function ProductDetailPage() {
  const session = useOptionalAuthSession(); const router = useRouter(); const { id } = useParams<{ id: string }>(); const navigateScreen = useScreenNavigation();
  const [product, setProduct] = useState<CommerceProduct | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const cart = useCartStore((state) => state.items); const wishlist = useWishlistStore((state) => state.ids);
  const searchParams = useSearchParams();
  const sku = product?.skus.find(item => item.id === searchParams.get("sku")) ?? product?.skus[0];
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountRetry, setAccountRetry] = useState(0);
  const [related, setRelated] = useState<CommerceProduct[] | null>(null);
  const pushRecent = useRecentStore((state) => state.push);
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState(false);
  const productRequest = useRef(0);
  const noticeTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  useEffect(() => () => { if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current); if (toastTimer.current !== null) window.clearTimeout(toastTimer.current); }, []);
  const load = useCallback(async () => { const request = ++productRequest.current; setProduct(null); setError(null); try { const next = await getCommerceProduct(id); if (request === productRequest.current) setProduct(next); } catch (cause) { if (request === productRequest.current) setError(commerceErrorMessage(cause)); } }, [id]);
  useEffect(() => { void load(); return () => { ++productRequest.current; }; }, [load]);
  useEffect(() => {
    if (!session) { useCartStore.getState().replace([]); useWishlistStore.getState().replace([]); return; }
    let cancelled = false;
    setAccountError(null);
    void Promise.all([getCommerceCart(session.authentication.accessToken), getCommerceWishlist(session.authentication.accessToken)])
      .then(([serverCart, serverWishlist]) => { if (!cancelled) { cacheCart(serverCart); cacheWishlist(serverWishlist); } })
      .catch(cause => { if (!cancelled) setAccountError(commerceErrorMessage(cause)); });
    return () => { cancelled = true; };
  }, [session, accountRetry]);
  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    setRelated(null);
    void listCommerceProducts({ categoryId: product.category.id, pageSize: 9 })
      .then((page) => { if (!cancelled) setRelated(page.items.filter((item) => item.id !== product.id).slice(0, 4)); })
      .catch(() => { if (!cancelled) setRelated([]); });
    return () => { cancelled = true; };
  }, [product]);
  useEffect(() => {
    if (!product || !sku) return;
    pushRecent({ productId: product.id, skuId: sku.id, title: product.title, price: sku.currentPriceToman, imageUrl: productImageUrl(product) });
  }, [product, sku, pushRecent]);
  useEffect(() => { if (product) document.title = `${product.title} | دکتر شیرمردی`; }, [product]);
  if (!product) return <main className="store-page"><StoreHeader title="جزئیات محصول" onBack={() => router.back()} /><StoreState title={error ? "محصول در دسترس نیست" : "در حال دریافت محصول…"} description={error ?? undefined} error={!!error} pending={!error} variant="product" action={error ? "تلاش دوباره" : undefined} onAction={() => void load()} /></main>;
  if (!sku) return <main className="store-page"><StoreHeader title={product.title} onBack={() => router.back()} /><StoreState title="محصول قابل انتخاب نیست" description="برای مشاهدهٔ محصولات دیگر به فروشگاه برگردید." action="فروشگاه" onAction={() => router.push("/store")} /></main>;
  const saved = wishlist.includes(sku.id); const current = cart.find((item) => item.skuId === sku.id)?.qty ?? 0;
  const imageUrl = productImageUrl(product);
  const flashNotice = (message: string) => { setNotice(message); if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current); noticeTimer.current = window.setTimeout(() => setNotice(""), 4000); };
  const setQty = async (next: number) => { if (!session) { navigateScreen("CartScreen"); return; } if (next < 0 || next > 100) return; const firstAdd = current === 0 && next > 0; setBusy(true); setError(null); try { cacheCart(await updateCommerceCart(session.authentication.accessToken, sku.id, next)); if (firstAdd) { setToast(true); if (toastTimer.current !== null) window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(false), 3500); } } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusy(false); } };
  const toggle = async () => { if (!session) { navigateScreen("WishlistScreen"); return; } setBusy(true); setError(null); try { cacheWishlist(await updateCommerceWishlist(session.authentication.accessToken, sku.id, !saved)); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusy(false); } };
  const share = async () => { try { if (navigator.share) { await navigator.share({ title: product.title, url: window.location.href }); } else { await navigator.clipboard.writeText(window.location.href); flashNotice("پیوند محصول کپی شد."); } } catch (cause) { if (!(cause instanceof Error && cause.name === "AbortError")) flashNotice("اشتراک‌گذاری انجام نشد؛ نشانی این صفحه را کپی کنید."); } };
  const quickToggle = async (skuId: string) => { if (!session) { navigateScreen("WishlistScreen"); return; } setBusy(true); try { cacheWishlist(await updateCommerceWishlist(session.authentication.accessToken, skuId, !wishlist.includes(skuId))); } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setBusy(false); } };
  return <main className="store-page store-product-page"><StoreHeader title={product.title} onBack={() => router.back()} />
    <ProductDetailPanel key={product.id} gallery={<ProductGallery official={imageUrl ? [imageUrl] : []} buyer={[]} title={productImageAlt(product.image, product.title)} />}>
        <div className="store-detail__title"><div><h2>{product.title}</h2></div><div className="store-detail__actions"><Button variant="ghost" className="store-icon-button" aria-label="اشتراک‌گذاری محصول" onClick={() => void share()}><Share2 aria-hidden="true" size={20} /></Button><Button variant="secondary" className="store-icon-button" busy={busy} aria-pressed={saved} aria-label={saved ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"} onClick={() => void toggle()}><Heart aria-hidden="true" size={20} fill={saved ? "currentColor" : "none"} /></Button></div></div>
        {product.skus.length > 1 && <div className="store-variant"><label htmlFor="product-variant">انتخاب نوع محصول</label><select id="product-variant" value={sku.id} disabled={busy} onChange={event => { const url = new URL(window.location.href); url.searchParams.set("sku", event.target.value); window.history.replaceState(null, "", url.toString()); setError(null); }}>
          {product.skus.map(item => <option key={item.id} value={item.id}>{item.title || item.code}</option>)}
        </select></div>}
        <div className="store-unit-price"><span>{BigInt(sku.currentTaxToman) > BigInt(0) ? "قیمت هر عدد، پیش از مالیات" : "قیمت هر عدد"}</span><ProductPrice amount={BigInt(sku.currentPriceToman)} /></div>
        {BigInt(sku.currentTaxToman) > BigInt(0) && <p className="store-help">مالیات هر عدد: <span className="font-iransans-fanum">{new Intl.NumberFormat("fa-IR").format(BigInt(sku.currentTaxToman))} تومان</span></p>}
        {accountError && <div role="status" className="wallet-notice wallet-notice--info"><p>اطلاعات سبد و علاقه‌مندی‌ها دریافت نشد. {accountError}</p><Button variant="ghost" onClick={() => setAccountRetry(value => value + 1)}>دریافت دوبارهٔ اطلاعات حساب</Button></div>}
        <ProductContentSections product={product} skuCode={sku.code} />
        {error && <StoreState title="درخواست انجام نشد" description={error} error />}
        <p className="store-inline-status" role="status">{saved ? "در علاقه‌مندی‌های شما ذخیره شده است" : notice || (current > 0 ? "این محصول در سبد شماست" : "")}</p>
        {related !== null && related.length > 0 && <section className="store-related" aria-label="محصولات مرتبط"><h3>محصولات مرتبط</h3><div className="store-grid">{related.map((item) => { const itemSku = item.skus[0]; if (!itemSku) return null; return <ProductCard key={item.id} product={item} saved={wishlist.includes(itemSku.id)} inCart={cart.some((entry) => entry.skuId === itemSku.id)} busy={busy} onFavorite={(id) => void quickToggle(id)} />; })}</div></section>}
    </ProductDetailPanel>
        <ShellAction><div className="store-purchase-bar" role="group" aria-label={`خرید ${product.title}`}>
          <div className="store-purchase-bar__action">
            {current === 0
              ? <Button className="store-full-button" busy={busy} onClick={() => void setQty(1)}><ShoppingCart aria-hidden="true" size={20} />{busy ? "در حال انجام…" : session ? "افزودن به سبد" : "ورود برای خرید"}</Button>
              : <QuantityControl value={current} min={0} busy={busy} label={product.title} onChange={(value) => void setQty(value)} />}
          </div>
          <div className="store-purchase-bar__price"><span>{current > 1 ? `جمع ${new Intl.NumberFormat("fa-IR").format(current)} عدد` : "قیمت محصول"}</span><ProductPrice amount={BigInt(sku.currentPriceToman) * BigInt(Math.max(current, 1))} large /></div>
        </div></ShellAction>
    <AddedToCartToast open={toast} onClose={() => setToast(false)} onGoCart={() => navigateScreen("CartScreen")} />
  </main>;
}
