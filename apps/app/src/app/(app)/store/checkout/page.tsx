"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { MapPin, Package, Plus, Truck } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { StoreHeader, StoreState, ProductPrice } from "@/components/store/store-ui";
import { ProductImage } from "@/components/store/product-image";
import { AddressFormSheet } from "@/components/profile/address-form-sheet";
import { Button } from "@/components/ui/button";
import { cartTotal, cartTax, useCartStore } from "@/stores/cart";
import { checkoutCommerceOrder, commerceErrorMessage, getCommerceAddresses, getCommerceCart, getCommerceShippingOptions, previewCommerceDiscount, type CommerceDiscountPreview, type CommerceAddress, type CommerceShippingOption } from "@/lib/commerce-catalog-api";
import { productImageUrl } from "@/lib/product-image";
import { formatPrice, toP } from "@/lib/format";
import { readStoredDelivery, resolveDeliveryAddress, storeDelivery } from "@/lib/store-delivery";

export default function CheckoutPage() {
  const { authentication } = useAuthSession();
  const router = useRouter();
  const items = useCartStore(state => state.items);
  const [addresses, setAddresses] = useState<CommerceAddress[]>([]);
  const [options, setOptions] = useState<CommerceShippingOption[]>([]);
  const [addressId, setAddressId] = useState<string>();
  const [method, setMethod] = useState<"PICKUP" | "COURIER">("PICKUP");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountPreview, setDiscountPreview] = useState<{ cartKey: string; value: CommerceDiscountPreview } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const discountRequest = useRef(0);
  const discountBusy = useRef(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const checkoutIntent = useRef<{ payloadKey: string; idempotencyKey: string } | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cart, nextAddresses, nextOptions] = await Promise.all([getCommerceCart(authentication.accessToken), getCommerceAddresses(authentication.accessToken), getCommerceShippingOptions(authentication.accessToken)]);
      useCartStore.getState().replace(cart.items.map(item => ({ id: item.id, skuId: item.sku.id, productId: item.product.id, name: item.product.title, variantTitle: item.sku.title, price: item.sku.currentPriceToman, tax: item.sku.currentTaxToman, qty: item.quantity, imageUrl: productImageUrl(item.product) })));
      setAddresses(nextAddresses);
      setAddressId(current => resolveDeliveryAddress(nextAddresses, current, readStoredDelivery(authentication.user.id))?.id);
      setOptions(nextOptions);
      setMethod(current => nextOptions.some(item => item.method === current) ? current : nextOptions[0]?.method ?? "PICKUP");
    } catch (cause) { setError(commerceErrorMessage(cause)); }
    finally { setLoading(false); }
  }, [authentication.accessToken, authentication.user.id]);
  useEffect(() => { void load(); }, [load]);
  const shipping = options.find(item => item.method === method);
  const subtotal = cartTotal(items);
  const tax = cartTax(items);
  const shippingAmount = BigInt(shipping?.amountToman ?? "0");
  const normalizedDiscountCode = discountCode.normalize("NFKC").trim().toUpperCase();
  const cartKey = JSON.stringify(items.map(item => [item.skuId, item.qty, String(item.price), String(item.tax ?? 0)]));
  const appliedDiscount = discountPreview?.cartKey === cartKey && discountPreview.value.code === normalizedDiscountCode ? discountPreview.value : null;
  const discountAmount = appliedDiscount ? BigInt(appliedDiscount.discountAmountToman) : BigInt(0);
  const total = subtotal + tax + shippingAmount - discountAmount;
  const selectedAddress = addresses.find(item => item.id === addressId);
  const applyDiscount = async () => {
    if (saving || discountBusy.current) return;
    setDiscountError(null);
    if (!/^[A-Z0-9_-]{3,40}$/.test(normalizedDiscountCode)) { setDiscountError("کد باید ۳ تا ۴۰ کاراکتر انگلیسی، عدد، خط تیره یا زیرخط باشد."); return; }
    const request = ++discountRequest.current;
    discountBusy.current = true;
    setApplyingDiscount(true);
    setDiscountPreview(null);
    try {
      const preview = await previewCommerceDiscount(authentication.accessToken, normalizedDiscountCode);
      if (request !== discountRequest.current) return;
      if (BigInt(preview.subtotalAmountToman) !== subtotal || BigInt(preview.taxAmountToman) !== tax) {
        setDiscountError("مبلغ سبد تغییر کرده؛ اطلاعات را دوباره دریافت و کد را اعمال کنید.");
        return;
      }
      setDiscountPreview({ cartKey, value: preview });
    } catch (cause) { if (request === discountRequest.current) setDiscountError(commerceErrorMessage(cause)); }
    finally { discountBusy.current = false; setApplyingDiscount(false); }
  };
  const checkout = async () => {
    if (saving || loading || applyingDiscount || !shipping || !items.length || (method === "COURIER" && !selectedAddress)) return;
    if (normalizedDiscountCode && !appliedDiscount) { setDiscountError("ابتدا «اعمال کد» را بزنید یا کد را پاک کنید."); return; }
    const body = { shippingMethod: method, ...(method === "COURIER" ? { addressId } : {}), ...(appliedDiscount ? { discountCode: appliedDiscount.code } : {}) };
    const payloadKey = JSON.stringify(body);
    if (checkoutIntent.current?.payloadKey !== payloadKey) checkoutIntent.current = { payloadKey, idempotencyKey: crypto.randomUUID() };
    setSaving(true); setError(null);
    try {
      const order = await checkoutCommerceOrder(authentication.accessToken, checkoutIntent.current.idempotencyKey, body);
      const checkedOut = new Set(items.map(item => item.id));
      useCartStore.getState().replace(useCartStore.getState().items.filter(item => !checkedOut.has(item.id)));
      checkoutIntent.current = null;
      router.push(`/store/payment?orderId=${encodeURIComponent(order.id)}`);
    } catch (cause) { setError(commerceErrorMessage(cause)); }
    finally { setSaving(false); }
  };
  return <main className="store-page store-checkout"><StoreHeader title="تکمیل خرید" onBack={() => router.back()} />
    {loading && <StoreState title="در حال آماده‌سازی سفارش…" pending />}
    {error && <StoreState title="اطلاعات سفارش کامل نشد" description={error} error action="دریافت دوباره" onAction={() => void load()} />}
    {!loading && !items.length && !error && <div className="store-empty"><Package size={42} strokeWidth={1.5} aria-hidden="true" /><h2>سبد خریدتان خالی است</h2><p>برای ثبت سفارش، ابتدا یک محصول انتخاب کنید.</p><Link href="/store" className="patient-button">مشاهدهٔ محصولات</Link></div>}
    {!loading && items.length > 0 && <div className="store-checkout__layout">
      <div className="store-checkout__steps">
        <section className="store-checkout__section" aria-labelledby="shipping-heading"><h2 id="shipping-heading"><Truck size={18} aria-hidden="true" />روش دریافت</h2>
          {!options.length && <p role="status">روش دریافت فعالی پیدا نشد. دوباره اطلاعات را دریافت کنید.</p>}
          {options.map(item => <label key={item.method} className={`store-choice ${method === item.method ? "store-choice--selected" : ""}`}><input type="radio" name="shipping" disabled={saving} checked={method === item.method} onChange={() => setMethod(item.method)} /><span>{item.method === "PICKUP" ? "دریافت حضوری" : "ارسال با پیک"}</span><span className="font-iransans-fanum">{BigInt(item.amountToman) === BigInt(0) ? "بدون هزینهٔ ارسال" : `${formatPrice(BigInt(item.amountToman))} تومان`}</span></label>)}
          {method === "PICKUP" && <p className="store-help">سفارش را پس از آماده‌شدن، به‌صورت حضوری دریافت می‌کنید. وضعیت آماده‌سازی در «سفارش‌های من» نمایش داده می‌شود.</p>}
        </section>
        {method === "COURIER" && <section className="store-checkout__section" aria-labelledby="address-heading"><h2 id="address-heading"><MapPin size={18} aria-hidden="true" />آدرس تحویل</h2>
          {!addresses.length && <p className="store-help">برای ارسال با پیک، یک آدرس اضافه کنید.</p>}
          {addresses.map(item => <label key={item.id} className={`store-choice store-choice--address ${item.id === addressId ? "store-choice--selected" : ""}`}><input type="radio" name="address" disabled={saving} checked={addressId === item.id} onChange={() => { setAddressId(item.id); storeDelivery(authentication.user.id, item.id); }} /><span><strong>{item.label} · {item.recipientName}</strong><span>{item.province}، {item.city}، {item.line1}</span></span></label>)}
          <Button variant="ghost" disabled={saving} onClick={() => setShowAddressForm(true)}><Plus size={17} aria-hidden="true" />افزودن آدرس</Button>
        </section>}
        <section className="store-checkout__section" aria-labelledby="review-heading"><header className="store-collection__header"><h2 id="review-heading">کالاهای سفارش</h2><Link href="/store/cart">ویرایش سبد</Link></header>
          {items.map(item => <Link key={item.skuId} href={`/store/products/${encodeURIComponent(item.productId)}?sku=${encodeURIComponent(item.skuId)}`} className="store-checkout__item"><ProductImage src={item.imageUrl ?? null} alt="" width={64} height={64} /><span><strong>{item.name}</strong>{item.variantTitle && <span>{item.variantTitle}</span>}<span>{toP(item.qty)} عدد</span></span><ProductPrice amount={BigInt(item.price) * BigInt(item.qty)} /></Link>)}
        </section>
      </div>
      <aside className="store-checkout__summary" aria-labelledby="summary-heading"><h2 id="summary-heading">مرور سفارش</h2>
        <div className="store-field">
          <label htmlFor="checkout-discount">کد تخفیف (اختیاری)</label>
          <div className="flex items-center gap-2">
            <input id="checkout-discount" name="discountCode" autoComplete="off" spellCheck={false} maxLength={40} dir="ltr" className="patient-input min-w-0 flex-1" value={discountCode} disabled={saving} aria-invalid={Boolean(discountError)} aria-describedby="checkout-discount-feedback"
              onChange={event => { discountRequest.current++; setDiscountCode(event.target.value); setDiscountPreview(null); setDiscountError(null); }}
              onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void applyDiscount(); } }} />
            <Button variant="secondary" className="shrink-0 whitespace-nowrap" style={{ width: "auto", marginTop: 0 }} disabled={saving || applyingDiscount || !normalizedDiscountCode || Boolean(appliedDiscount)} onClick={() => void applyDiscount()}>{applyingDiscount ? "در حال بررسی…" : appliedDiscount ? "اعمال شد" : "اعمال کد"}</Button>
          </div>
          <div id="checkout-discount-feedback" className="text-xs leading-6">
            {discountError ? <p role="alert" className="text-red-700">{discountError}</p> : appliedDiscount ? <p role="status" className="text-emerald-700">کد تخفیف اعمال شد؛ {formatPrice(discountAmount)} تومان از مبلغ کالاها کم شد.</p> : <p className="text-muted-foreground">کد را وارد کنید و «اعمال کد» را بزنید.</p>}
            {discountCode && <button type="button" disabled={saving} className="min-h-9 text-muted-foreground underline underline-offset-4" onClick={() => { discountRequest.current++; setDiscountCode(""); setDiscountPreview(null); setDiscountError(null); }}>حذف کد تخفیف</button>}
          </div>
        </div>
        <dl><div><dt>جمع کالاها</dt><dd>{formatPrice(subtotal)} تومان</dd></div>{tax > BigInt(0) && <div><dt>مالیات کالاها</dt><dd>{formatPrice(tax)} تومان</dd></div>}<div><dt>هزینهٔ دریافت</dt><dd>{shippingAmount === BigInt(0) ? "بدون هزینه" : `${formatPrice(shippingAmount)} تومان`}</dd></div>{appliedDiscount && <div className="text-emerald-700"><dt>تخفیف کد {appliedDiscount.code}</dt><dd>{formatPrice(discountAmount)} تومان</dd></div>}<div className="store-checkout__total"><dt>مبلغ قابل پرداخت</dt><dd>{formatPrice(total)} تومان</dd></div></dl>
        <p className="store-help">تخفیف روی مبلغ کالاها اعمال می‌شود. مبلغ نهایی هنگام ثبت سفارش دوباره بررسی خواهد شد.</p>
        <Button disabled={saving || applyingDiscount || !shipping || (method === "COURIER" && !selectedAddress)} onClick={() => void checkout()}>{saving ? "در حال ثبت سفارش…" : "ثبت سفارش و ادامهٔ پرداخت"}</Button>
        <Link href="/store/orders" className="store-checkout__orders">سفارش‌های من</Link>
      </aside>
    </div>}
    <AnimatePresence>{showAddressForm && <AddressFormSheet accessToken={authentication.accessToken} onClose={() => setShowAddressForm(false)} onCreated={created => { setAddresses(current => [created, ...current]); setAddressId(created.id); storeDelivery(authentication.user.id, created.id); setShowAddressForm(false); }} />}</AnimatePresence>
  </main>;
}
