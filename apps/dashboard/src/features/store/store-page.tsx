"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PackagePlus, Plus, RefreshCw, ShieldAlert, X } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import MezajCollectionsEditor from "./mezaj-collections-editor";
import { ProductCatalog } from "./product-catalog";
import { catalogInteger } from "./catalog-view";
import { apiClient } from "@/lib/api";
import { CommerceCatalogApiError, createCommerceCategory, createCommerceProduct, createCommerceSku, getCommerceCourierShippingRate, loadCommerceCatalog, updateCommerceCategory, updateCommerceCourierShippingRate, type CommerceCatalogData, type CommerceCatalogState, type CommerceCourierShippingRate, type CommerceProduct } from "@/lib/commerce-catalog-api";

const ProductWorkspace = dynamic(() => import("./product-workspace"), { ssr: false, loading: () => <p role="status">در حال آماده‌سازی مدیریت محصول…</p> });
type ViewState = CommerceCatalogState | { status: "loading" };
type MutationState = { status: "idle" } | { status: "saving" } | { status: "success"; message: string } | { status: "validation"; message: string } | { status: "forbidden" } | { status: "unavailable" } | { status: "error" };

const field = "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
const toman = (value: string) => `${BigInt(value).toLocaleString("fa-IR")} تومان`;

function Notice({ state, onRetry }: { state: Exclude<ViewState["status"], "ready" | "loading">; onRetry: () => void }) {
  const title = state === "unauthorized" ? "دسترسی مجاز نیست" : state === "unavailable" ? "سرویس در دسترس نیست" : "دریافت کاتالوگ ناموفق بود";
  const body = state === "unauthorized" ? "حساب شما اجازهٔ مدیریت کاتالوگ فروشگاه را ندارد." : state === "unavailable" ? "اتصال به API برقرار نشد؛ هیچ دادهٔ محلی جایگزین نشده است." : "داده‌ای نمایش داده نشد؛ دوباره تلاش کنید.";
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert"><div className="flex items-center gap-2 font-bold"><ShieldAlert size={18} />{title}</div><p className="mt-2 text-sm">{body}</p>{state !== "unauthorized" && <button onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold"><RefreshCw size={15} />تلاش دوباره</button>}</div>;
}

function MutationNotice({ state }: { state: MutationState }) {
  if (state.status === "idle" || state.status === "saving") return null;
  const message = state.status === "success" ? state.message : state.status === "validation" ? state.message : state.status === "forbidden" ? "اجازهٔ انجام این تغییر را ندارید." : state.status === "unavailable" ? "سرویس در دسترس نیست؛ تغییر ذخیره نشد." : "ذخیره‌سازی ناموفق بود؛ دادهٔ نمایش‌داده‌شده تغییر نکرد.";
  return <p className={`rounded-xl px-3 py-2 text-sm ${state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role={state.status === "success" ? "status" : "alert"}>{message}</p>;
}

function StoreManagement({ data, accessToken, refresh, reloading, onBusy, onPage }: { data: CommerceCatalogData; accessToken: string; refresh: () => Promise<void>; reloading: boolean; onBusy: (value: boolean) => void; onPage: (page: number) => void }) {
  const [tab, setTab] = useState<"products" | "categories" | "inventory" | "shipping" | "mezaj">("products");
  const [mutation, setMutation] = useState<MutationState>({ status: "idle" });
  const [mezajBusy, setMezajBusy] = useState(false);
  const saving = useRef(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const busy = mutation.status === "saving" || reloading || mezajBusy || workspaceBusy;
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  const [creating, setCreating] = useState(false);
  const createDialog = useRef<HTMLDialogElement>(null);
  const [confirmCreateDiscard, setConfirmCreateDiscard] = useState(false);
  useEffect(() => {
    if (!creating) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = createDialog.current;
    element?.showModal();
    return () => { element?.close(); previousFocus?.focus(); };
  }, [creating]);
  const [creatingSku, setCreatingSku] = useState(false);
  const [categoryName, setCategoryName] = useState(""); const [categorySlug, setCategorySlug] = useState("");
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState(data.categories.find((category) => category.isActive)?.id ?? "");
  const [description, setDescription] = useState("");
  const [skuProductId, setSkuProductId] = useState(data.products.find((product) => product.status !== "ARCHIVED")?.id ?? "");
  const [skuCode, setSkuCode] = useState(""); const [skuPrice, setSkuPrice] = useState("0"); const [skuStock, setSkuStock] = useState("0");
  const [managedProduct, setManagedProduct] = useState<CommerceProduct | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<"base" | "inventory">("base");
  const submit = async (work: () => Promise<unknown>, success: string) => {
    if (saving.current) return;
    saving.current = true; setMutation({ status: "saving" });
    try {
      await work();
      try { await refresh(); setMutation({ status: "success", message: success }); }
      catch { setMutation({ status: "success", message: success + " دریافت فهرست تازه ناموفق بود؛ با دکمهٔ بازخوانی دوباره تلاش کنید." }); }
    } catch (error) {
      const status = error instanceof CommerceCatalogApiError ? error.status : 0;
      setMutation(status === 401 || status === 403 ? { status: "forbidden" } : status === 400 || status === 409 || status === 422 ? { status: "validation", message: "اطلاعات یا وضعیت محصول معتبر نیست؛ تغییر ثبت نشد." } : status === 0 || status === 503 || status === 504 ? { status: "unavailable" } : { status: "error" });
    } finally { saving.current = false; }
  };
  const closeCreate = () => {
    if (saving.current || busy) return;
    if (title.trim() || slug.trim() || description.trim()) { setConfirmCreateDiscard(true); return; }
    setCreating(false);
  };
  const discardCreate = () => {
    if (saving.current || busy) return;
    setTitle(""); setSlug(""); setDescription(""); setConfirmCreateDiscard(false); setCreating(false);
  };
  const skuProducts = data.products;
  const skuPriceValue = catalogInteger(skuPrice); const skuStockValue = catalogInteger(skuStock);
  return <div className="space-y-5">
    {managedProduct && <ProductWorkspace key={managedProduct.id} product={data.products.find(product => product.id === managedProduct.id) ?? managedProduct} categories={data.categories} accessToken={accessToken} initialTab={workspaceTab} externalBusy={mutation.status === "saving" || reloading || mezajBusy} onClose={() => { setManagedProduct(null); setWorkspaceBusy(false); }} onChanged={refresh} onBusy={setWorkspaceBusy} />}
    <div className="flex flex-wrap gap-2 border-b border-border pb-3" role="group" aria-label="بخش‌های مدیریت فروشگاه">
      {([["products", "محصولات"], ["categories", "دسته‌بندی‌ها"], ["inventory", "انبار و انواع فروش"], ["shipping", "ارسال"], ["mezaj", "پیشنهاد بر اساس مزاج"]] as const).map(([id, label]) => <button type="button" key={id} disabled={busy} aria-pressed={tab === id} onClick={() => setTab(id)} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${tab === id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}>{label}</button>)}
    </div>
    {tab === "mezaj" && <MezajCollectionsEditor accessToken={accessToken} onBusy={setMezajBusy} />}
    <MutationNotice state={mutation} />
    {busy && <p role="status" className="text-sm text-muted-foreground">در حال ذخیره و دریافت اطلاعات تازه…</p>}
    {tab === "products" && <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">محصولات فروشگاه</h2><p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">محصول را انتخاب کنید؛ اطلاعات، تصویر، محتوا و قیمت را در یک پنجره مدیریت کنید.</p></div><button type="button" disabled={busy || data.categories.every((category) => !category.isActive)} aria-expanded={creating} aria-controls="new-product-dialog" aria-haspopup="dialog" onClick={() => { setMutation({ status: "idle" }); setConfirmCreateDiscard(false); setCreating(true); }} className={button}><PackagePlus size={18} aria-hidden="true" />افزودن محصول</button></div>
      {data.categories.every((category) => !category.isActive) && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">برای ساخت محصول، ابتدا در بخش دسته‌بندی‌ها یک دستهٔ فعال ثبت کنید.</p>}
      {creating && <dialog ref={createDialog} id="new-product-dialog" dir="rtl" aria-labelledby="new-product-title" aria-describedby="new-product-help" onCancel={event => { event.preventDefault(); closeCreate(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm">
      <form id="new-product-form" className="space-y-5 p-4 sm:p-6" onSubmit={(event) => {
        event.preventDefault();
        if (!busy && !confirmCreateDiscard && title.trim() && slug.trim() && categoryId) void submit(async () => {
          const product = await createCommerceProduct(accessToken, { title: title.trim(), slug: slug.trim(), categoryId, ...(description.trim() ? { description: description.trim() } : {}) });
          setTitle(""); setSlug(""); setDescription(""); setCreating(false); setWorkspaceTab("inventory"); setManagedProduct(product);
        }, "پیش‌نویس ساخته شد؛ اکنون کد فروش، قیمت و موجودی اولیه را ثبت کنید.");
      }}>
        <header className="flex items-start justify-between gap-3 border-b border-border pb-4"><div><h3 id="new-product-title" className="text-lg font-bold">افزودن محصول جدید</h3><p id="new-product-help" className="mt-2 text-xs leading-6 text-muted-foreground">ابتدا اطلاعات پایه را ثبت کنید؛ در مرحلهٔ بعد تصویر، محتوا، قیمت و موجودی را در همین روند تکمیل می‌کنید.</p></div><button type="button" disabled={busy} onClick={closeCreate} className="dashboard-icon shrink-0" aria-label="بستن افزودن محصول"><X size={20} /></button></header>
        <MutationNotice state={mutation} />
        <fieldset disabled={busy} className="grid min-w-0 gap-4 border-0 p-0 md:grid-cols-3">
          <label className="space-y-2 text-sm font-semibold">نام محصول<input className={field} required autoFocus maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="space-y-2 text-sm font-semibold">شناسهٔ آدرس<input className={field} required maxLength={260} dir="ltr" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="product-name" /><span className="block text-xs font-normal text-muted-foreground">برای آدرس محصول؛ با حروف انگلیسی و خط تیره.</span></label>
          <label className="space-y-2 text-sm font-semibold">دسته‌بندی<select className={field} required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">انتخاب دسته</option>{data.categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="space-y-2 text-sm font-semibold md:col-span-3">توضیح اولیه <span className="font-normal text-muted-foreground">(اختیاری)</span><textarea className={field} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        </fieldset>
        <footer className="border-t border-border pt-4">{confirmCreateDiscard ? <div className="space-y-3" role="alert"><p className="text-sm">اطلاعات واردشده کنار گذاشته شود؟</p><div className="flex flex-wrap gap-2"><button type="button" className="dashboard-button" disabled={busy} onClick={discardCreate}>بستن بدون ذخیره</button><button type="button" className={button} disabled={busy} onClick={() => setConfirmCreateDiscard(false)}>ادامهٔ تکمیل</button></div></div> : <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className="dashboard-button" disabled={busy} onClick={closeCreate}>انصراف</button><button className={button} disabled={busy || !title.trim() || !slug.trim() || !categoryId}><Plus size={16} aria-hidden="true" />{mutation.status === "saving" ? "در حال ساخت محصول…" : "ساخت پیش‌نویس و ادامه"}</button></div>}</footer>
      </form></dialog>}
      <ProductCatalog data={data} busy={busy} onEdit={product => { setWorkspaceTab("base"); setManagedProduct(product); }} />
    </div>}
    {tab === "categories" && <div className="space-y-4">
      <h2 className="text-xl font-bold">دسته‌بندی محصولات</h2>
      <form className="rounded-2xl border border-border bg-card p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); if (categoryName.trim() && categorySlug.trim()) void submit(async () => { await createCommerceCategory(accessToken, { name: categoryName.trim(), slug: categorySlug.trim() }); setCategoryName(""); setCategorySlug(""); }, "دسته‌بندی ایجاد شد."); }}>
        <fieldset disabled={busy} className="grid min-w-0 gap-3 border-0 p-0 md:grid-cols-3"><label className="space-y-2 text-sm font-semibold">نام دسته<input className={field} required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label><label className="space-y-2 text-sm font-semibold">شناسهٔ آدرس<input className={field} required dir="ltr" value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} placeholder="category-name" /></label><button className={`${button} md:self-end`} disabled={!categoryName.trim() || !categorySlug.trim() || busy}>ثبت دسته‌بندی</button></fieldset>
      </form>
      {data.categories.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">هنوز دسته‌بندی ثبت نشده است.</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.categories.map((category) => <div key={category.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{category.name}</h3><span className="text-xs text-muted-foreground">{category.isActive ? "فعال" : "غیرفعال"}</span></div><p className="mt-2 text-sm text-muted-foreground">{category.productCount.toLocaleString("fa-IR")} محصول</p><p className="mt-1 break-all text-xs text-muted-foreground"><bdi dir="ltr">{category.slug}</bdi></p><button type="button" disabled={busy} onClick={() => void submit(() => updateCommerceCategory(accessToken, category.id, { isActive: !category.isActive }), category.isActive ? "دسته‌بندی غیرفعال شد." : "دسته‌بندی فعال شد.")} className="mt-4 min-h-11 rounded-lg border border-border px-3 text-sm font-semibold text-primary hover:bg-secondary disabled:opacity-50">{category.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}</button></div>)}</div>}
    </div>}
    {tab === "inventory" && <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">انبار و انواع فروش</h2><p className="mt-1 text-sm leading-7 text-muted-foreground">موجودی فیزیکی شامل تعداد رزروشده است. کد فروش برای هر نوع محصول باید یکتا باشد.</p></div><button type="button" disabled={busy || data.products.every((product) => product.status === "ARCHIVED")} aria-expanded={creatingSku} onClick={() => setCreatingSku((current) => !current)} className={button}><Plus size={16} aria-hidden="true" />{creatingSku ? "بستن فرم" : "نوع فروش جدید"}</button></div>
      {creatingSku && <form className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5" onSubmit={(event) => {
        event.preventDefault(); if (skuProductId && skuCode.trim() && skuPriceValue !== null && skuStockValue !== null) void submit(async () => { await createCommerceSku(accessToken, skuProductId, { code: skuCode.trim(), currentPriceToman: skuPriceValue, currentTaxToman: 0, initialOnHandQuantity: skuStockValue }); setSkuCode(""); setSkuPrice("0"); setSkuStock("0"); setCreatingSku(false); }, "نوع فروش و موجودی اولیه ثبت شد. اکنون می‌توانید تصویر، محتوا و وضعیت محصول را از فهرست مدیریت کنید.");
      }}>
        <h3 className="font-bold">مرحلهٔ دوم: کد فروش، قیمت و موجودی</h3>
        <fieldset disabled={busy} className="grid min-w-0 gap-4 border-0 p-0 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2 text-sm font-semibold">محصول<select className={field} required value={skuProductId} onChange={(event) => setSkuProductId(event.target.value)}><option value="">انتخاب محصول</option>{skuProducts.filter((product) => product.status !== "ARCHIVED").map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select></label>
          <label className="space-y-2 text-sm font-semibold">کد فروش (SKU)<input className={field} required dir="ltr" value={skuCode} onChange={(event) => setSkuCode(event.target.value)} placeholder="SKU-001" /></label>
          <label className="space-y-2 text-sm font-semibold">قیمت فروش (تومان)<input className={field} type="number" required dir="ltr" min="0" step="1" value={skuPrice} onChange={(event) => setSkuPrice(event.target.value)} /></label>
          <label className="space-y-2 text-sm font-semibold">موجودی فیزیکی اولیه<input className={field} type="number" required dir="ltr" min="0" step="1" value={skuStock} onChange={(event) => setSkuStock(event.target.value)} /></label>
        </fieldset>
        <button className={button} disabled={!skuProductId || !skuCode.trim() || skuPriceValue === null || skuStockValue === null || busy}>ثبت نوع فروش</button>
      </form>}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"><table className="w-full"><thead><tr className="border-b border-border bg-secondary/30">{["محصول", "کد فروش", "قیمت (تومان)", "موجودی فیزیکی", "رزرو", "موجودی آزاد", "وضعیت"].map((label) => <th key={label} className="px-5 py-3 text-right text-xs font-bold text-muted-foreground">{label}</th>)}</tr></thead><tbody>{data.products.flatMap((product) => product.skus.map((sku) => <tr key={sku.id} className="border-b border-border last:border-0"><td className="px-5 py-4 text-sm font-semibold">{product.title}</td><td className="px-5 py-4 text-xs text-muted-foreground">{sku.code}</td><td className="px-5 py-4 text-sm text-primary">{toman(sku.currentPriceToman)}</td><td className="px-5 py-4 text-sm">{sku.onHandQuantity.toLocaleString("fa-IR")}</td><td className="px-5 py-4 text-sm text-muted-foreground">{sku.reservedQuantity.toLocaleString("fa-IR")}</td><td className="px-5 py-4 text-sm">{Math.max(0, sku.onHandQuantity - sku.reservedQuantity).toLocaleString("fa-IR")}</td><td className="px-5 py-4">{sku.onHandQuantity <= sku.reservedQuantity ? <span className="text-xs font-bold text-red-600">ناموجود</span> : sku.onHandQuantity - sku.reservedQuantity <= 5 ? <span className="text-xs font-bold text-amber-700">رو به اتمام</span> : <span className="text-xs font-bold text-emerald-700">موجود</span>}</td></tr>))}</tbody></table>{data.products.every((product) => product.skus.length === 0) && <p className="p-6 text-sm text-muted-foreground">هنوز SKU یا موجودی ثبت نشده است.</p>}</div>
    </div>}
    {tab === "shipping" && <CourierRateManager accessToken={accessToken} />}
    {(tab === "products" || tab === "inventory") && data.pagination && data.pagination.total > data.pagination.pageSize && <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4" aria-label="صفحه‌های کاتالوگ">
      <p className="text-sm tabular-nums text-muted-foreground">صفحهٔ {data.pagination.page.toLocaleString("fa-IR")} از {Math.ceil(data.pagination.total / data.pagination.pageSize).toLocaleString("fa-IR")} · {data.pagination.total.toLocaleString("fa-IR")} محصول</p>
      <div className="flex gap-2"><button type="button" className={button} disabled={busy || data.pagination.page <= 1} onClick={() => onPage(Math.max(1, (data.pagination?.page ?? 1) - 1))}>صفحهٔ قبل</button><button type="button" className={button} disabled={busy || data.pagination.page * data.pagination.pageSize >= data.pagination.total} onClick={() => onPage((data.pagination?.page ?? 1) + 1)}>صفحهٔ بعد</button></div>
    </nav>}
  </div>;
}

function CourierRateManager({ accessToken }: { accessToken: string }) {
  const [rate, setRate] = useState<CommerceCourierShippingRate | null>(null); const [amount, setAmount] = useState(""); const [active, setActive] = useState(true); const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const load = useCallback(async () => { try { const next = await getCommerceCourierShippingRate(accessToken); setRate(next); setAmount(next.amountToman ?? ""); setActive(next.isActive); setState("ready"); } catch { setState("error"); } }, [accessToken]);
  useEffect(() => { let cancelled = false; void getCommerceCourierShippingRate(accessToken).then((next) => { if (!cancelled) { setRate(next); setAmount(next.amountToman ?? ""); setActive(next.isActive); setState("ready"); } }).catch(() => { if (!cancelled) setState("error"); }); return () => { cancelled = true; }; }, [accessToken]);
  const save = async () => { const parsed = Number(amount); if (!Number.isSafeInteger(parsed) || parsed < 0) return; setState("saving"); try { const next = await updateCommerceCourierShippingRate(accessToken, { amountToman: parsed, isActive: active }); setRate(next); setAmount(next.amountToman ?? ""); setState("ready"); } catch { setState("error"); } };
  return <section className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">نرخ ارسال با پیک</h2><p className="mt-1 text-xs text-muted-foreground">این مبلغ برای سفارش‌های جدیدِ کلینیک اعمال می‌شود. دریافت حضوری رایگان است.</p></div>{state === "loading" ? <span className="text-xs text-muted-foreground">در حال دریافت…</span> : state === "error" ? <button type="button" onClick={() => void load()} className="text-xs font-bold text-red-700">تلاش دوباره</button> : <div className="flex flex-wrap items-center gap-2"><input aria-label="نرخ پیک به تومان" className={`${field} w-40`} type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} /><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />فعال</label><button type="button" disabled={state === "saving" || !amount} onClick={() => void save()} className={button}>{state === "saving" ? "در حال ذخیره…" : "ذخیره نرخ"}</button></div>}</div>{rate && !rate.isActive && <p className="mt-3 text-xs text-amber-800">پیک غیرفعال است؛ مشتری فقط می‌تواند دریافت حضوری را انتخاب کند.</p>}</section>;
}

function StoreCatalogScreen() {
  const { authentication } = useDashboardSession();
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [refreshing, setRefreshing] = useState(true);
  const [mutating, setMutating] = useState(false);
  const refresh = useCallback(async () => {
    const next = await loadCommerceCatalog(apiClient, authentication.accessToken, catalogPage);
    if (next.status !== "ready") { if (next.status === "unauthorized") setState(next); setRefreshFailed(true); throw new CommerceCatalogApiError(next.status === "unauthorized" ? 403 : 503); }
    setState(next); setRefreshFailed(false);
  }, [authentication.accessToken, catalogPage]);
  const reload = async () => { setRefreshing(true); try { await refresh(); } catch { /* Keep the existing catalog visible with an explicit stale-data notice. */ } finally { setRefreshing(false); } };
  const requestPage = (page: number) => {
    if (refreshing || mutating) return;
    if (page === catalogPage) { void reload(); return; }
    setRefreshing(true); setCatalogPage(page);
  };
  useEffect(() => {
    let cancelled = false;
    void loadCommerceCatalog(apiClient, authentication.accessToken, catalogPage).then((result) => {
      if (!cancelled) {
        if (result.status === "ready") { setState(result); setRefreshFailed(false); }
        else { setState((current) => result.status === "unauthorized" || current.status !== "ready" ? result : current); setRefreshFailed(true); }
        setRefreshing(false);
      }
    });
    return () => { cancelled = true; };
  }, [authentication.accessToken, catalogPage]);
  return <div className="catalog-workspace flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-7"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-1 text-xs font-semibold text-primary">فروشگاه</p><h1 className="text-2xl font-bold tracking-normal">مدیریت محصولات</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">محصولات، قیمت‌ها و موجودی را مدیریت کنید؛ متن و تصویر هر محصول ویرایشگر جداگانه دارند.</p></div><button type="button" disabled={refreshing || mutating} onClick={() => void reload()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />{refreshing ? "در حال دریافت…" : "بازخوانی فهرست"}</button></header>
    {refreshFailed && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-950">دریافت فهرست تازه ناموفق بود. اطلاعات قبلی نمایش داده می‌شود؛ برای دیدن وضعیت فعلی دوباره بازخوانی کنید.</p>}
    {state.status === "loading" ? <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">در حال دریافت کاتالوگ…</p> : state.status === "ready" ? <StoreManagement key={authentication.user.id} data={state.data} accessToken={authentication.accessToken} refresh={refresh} reloading={refreshing} onBusy={setMutating} onPage={requestPage} /> : <Notice state={state.status} onRetry={() => void reload()} />}

  </div></div>;
}

export function StorePage() {
  const { authentication } = useDashboardSession();
  return <StoreCatalogScreen key={authentication.user.id} />;
}
