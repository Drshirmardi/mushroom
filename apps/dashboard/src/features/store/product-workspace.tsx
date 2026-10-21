"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, Check, FileText, ImagePlus, Package, Save, Settings2, X } from "lucide-react";
import { CommerceCatalogApiError, createCommerceSku, updateCommerceInventory, updateCommerceProduct, updateCommerceSku, type CommerceCategory, type CommerceProduct } from "@/lib/commerce-catalog-api";
import { inventoryTotals, type ProductEditorState } from "./catalog-view";
import { ProductThumbnail } from "./product-thumbnail";
import ProductSkuEditor from "./product-sku-editor";

const ProductImageEditor = dynamic(() => import("./product-image-editor"), { ssr: false, loading: () => <p className="p-6" role="status">در حال آماده‌سازی تصویر…</p> });
const ProductContentEditor = dynamic(() => import("./product-content-editor"), { loading: () => <p className="p-6" role="status">در حال آماده‌سازی محتوا…</p> });
const tabs = [{ id: "base", label: "اطلاعات پایه", icon: Settings2 }, { id: "image", label: "تصویر", icon: ImagePlus }, { id: "content", label: "محتوا و جزئیات", icon: FileText }, { id: "inventory", label: "قیمت و موجودی", icon: Package }] as const;
type Tab = typeof tabs[number]["id"];
type Notice = { tone: "success" | "error" | "warning"; text: string } | null;
const labels = { DRAFT: "پیش‌نویس", ACTIVE: "فعال", ARCHIVED: "بایگانی" };
const field = "min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50";
const baseFrom = (product: CommerceProduct) => ({ title: product.title, slug: product.slug, categoryId: product.category.id });
const noEdits: ProductEditorState = { busy: false, dirty: false };

export default function ProductWorkspace({ product, categories, accessToken, initialTab = "base", externalBusy = false, onClose, onChanged, onBusy }: {
  product: CommerceProduct; categories: CommerceCategory[]; accessToken: string; initialTab?: Tab; externalBusy?: boolean;
  onClose: () => void; onChanged: () => Promise<void>; onBusy: (value: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previous = useRef(product);
  const working = useRef(false);
  const [current, setCurrent] = useState(product);
  const [draft, setDraft] = useState(() => baseFrom(product));
  const [tab, setTab] = useState<Tab>(initialTab);
  const [visited, setVisited] = useState<Tab[]>(["base", initialTab]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [imageState, setImageState] = useState(noEdits);
  const [contentState, setContentState] = useState(noEdits);
  const [inventoryState, setInventoryState] = useState(noEdits);
  const imageChanged = useCallback((state: ProductEditorState) => setImageState(state), []);
  const contentChanged = useCallback((state: ProductEditorState) => setContentState(state), []);
  const inventoryChanged = useCallback((state: ProductEditorState) => setInventoryState(state), []);
  const baseDirty = draft.title !== current.title || draft.slug !== current.slug || draft.categoryId !== current.category.id;
  const dirty = baseDirty || imageState.dirty || contentState.dirty || inventoryState.dirty;
  const editingBusy = saving || imageState.busy || contentState.busy;
  const busy = editingBusy || externalBusy;
  const blocked = imageState.blocked === true;
  const stock = inventoryTotals(current.skus);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    const old = previous.current;
    setDraft(value => value.title === old.title && value.slug === old.slug && value.categoryId === old.category.id ? baseFrom(product) : value);
    setCurrent(product); previous.current = product;
  }, [product]);
  useEffect(() => { onBusy(editingBusy); return () => onBusy(false); }, [editingBusy, onBusy]);

  const selectTab = (value: Tab) => {
    if (busy) return;
    setTab(value); setVisited(existing => existing.includes(value) ? existing : [...existing, value]);
    setConfirmDiscard(false);
  };
  const requestClose = () => {
    if (busy || blocked) {
      setNotice({ tone: "warning", text: blocked ? "نتیجهٔ عملیات تصویر هنوز مشخص نیست؛ ابتدا در بخش تصویر وضعیت را دریافت یا همان عملیات را تکرار کنید." : "ذخیره‌سازی در حال انجام است؛ منتظر نتیجه بمانید." });
      if (blocked) selectTab("image");
      return;
    }
    if (dirty) { setConfirmDiscard(true); return; }
    onClose();
  };

  async function mutate<T>(work: () => Promise<T>, message: string): Promise<T | undefined> {
    if (working.current || busy || blocked) return;
    working.current = true; setSaving(true); setNotice(null);
    try {
      const result = await work();
      setNotice({ tone: "success", text: message });
      try { await onChanged(); }
      catch { setNotice({ tone: "warning", text: `${message} دریافت فهرست تازه ناموفق بود؛ اطلاعات ذخیره‌شدهٔ همین پنجره حفظ شده است.` }); }
      return result;
    } catch (error) {
      const status = error instanceof CommerceCatalogApiError ? error.status : 0;
      setNotice({ tone: "error", text: [401, 403].includes(status) ? "اجازهٔ این تغییر را ندارید؛ تغییرهای شما حفظ شده‌اند." : status === 409 ? "شناسه یا کد تکراری است، یا این تغییر وضعیت مجاز نیست؛ اطلاعات را بررسی کنید." : [400, 422].includes(status) ? "اطلاعات معتبر نیست؛ فیلدها و موجودی رزروشده را بررسی کنید." : "ذخیره انجام نشد یا نتیجهٔ آن دریافت نشد؛ تغییرهای شما حفظ شده‌اند. پیش از تکرار، وضعیت سرور را بررسی کنید." });
      return undefined;
    } finally { working.current = false; setSaving(false); }
  }

  const lifecycle = (status: CommerceProduct["status"]) => void mutate(async () => {
    const updated = await updateCommerceProduct(accessToken, current.id, { status });
    setCurrent(updated); setConfirmArchive(false); return updated;
  }, status === "DRAFT" ? "محصول از بایگانی به پیش‌نویس برگشت؛ هنوز در فروشگاه فعال نیست." : status === "ACTIVE" ? "محصول فعال شد؛ نمایش محتوا همچنان تابع تأیید جداگانهٔ آن است." : "محصول بایگانی شد و از فروشگاه خارج شد.");

  const validBase = !!draft.title.trim() && draft.title.trim().length <= 240 && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(draft.slug.trim().toLowerCase()) && draft.slug.trim().length <= 260 && !!draft.categoryId;

  return <dialog ref={dialog} dir="rtl" aria-labelledby="product-workspace-title" onCancel={event => { event.preventDefault(); requestClose(); }} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, a[href], [tabindex]') ?? []).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0]; const last = controls.at(-1);
    if (!first || !last) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }} className="fixed inset-0 m-auto h-[calc(100dvh-2rem)] max-h-[900px] w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm open:flex open:flex-col">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6"><div className="min-w-0"><p className="text-[11px] text-muted-foreground">مدیریت محصول</p><h2 id="product-workspace-title" className="truncate text-base font-bold">{current.title}</h2></div><div className="flex items-center gap-2">{dirty && <span className="dashboard-badge dashboard-badge-accent hidden sm:inline-flex">ذخیره نشده</span>}<button type="button" autoFocus className="dashboard-icon" onClick={requestClose} aria-label="بستن مدیریت محصول"><X size={21} /></button></div></header>
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
      <aside className="shrink-0 border-b border-border bg-muted/25 p-4 sm:p-6 lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-e">
        <button type="button" disabled={busy} onClick={() => selectTab("image")} aria-label="مشاهده و مدیریت تصویر محصول" className="relative mx-auto block aspect-square w-full max-w-64 overflow-hidden rounded-xl border border-border"><ProductThumbnail product={current} sizes="256px" /></button>
        <h3 className="mt-4 text-sm font-semibold leading-7 [overflow-wrap:anywhere]">{current.title}</h3><p className="mt-1 text-xs text-muted-foreground">{current.category.name}</p><span className={`dashboard-badge mt-3 ${current.status === "ARCHIVED" ? "dashboard-badge-accent" : ""}`}>{labels[current.status]}</span>
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs"><div><dt className="text-muted-foreground">انواع فروش</dt><dd className="mt-1 font-semibold">{current.skus.length.toLocaleString("fa-IR")}</dd></div><div><dt className="text-muted-foreground">موجودی آزاد</dt><dd className="mt-1 font-semibold">{stock.free.toLocaleString("fa-IR")}</dd></div></dl>
        <p className="mt-4 text-[11px] leading-6 text-muted-foreground">هر بخش جداگانه ذخیره می‌شود. جابه‌جایی بین بخش‌ها تغییرهای واردشده را پاک نمی‌کند.</p>
      </aside>
      <div className="min-w-0 flex-1 lg:overflow-y-auto">
        <div className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-border bg-card p-2 sm:px-5" role="group" aria-label="بخش‌های مدیریت این محصول">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} disabled={busy} aria-pressed={tab === id} onClick={() => selectTab(id)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium disabled:opacity-50 ${tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Icon size={16} aria-hidden="true" />{label}{(id === "base" ? baseDirty : id === "image" ? imageState.dirty : id === "content" ? contentState.dirty : inventoryState.dirty) && <span aria-label="ذخیره نشده" className="size-1.5 rounded-full bg-accent" />}</button>)}</div>
        {notice && <p role={notice.tone === "success" ? "status" : "alert"} className={`mx-4 mt-4 rounded-lg border border-border p-3 text-xs leading-7 sm:mx-6 ${notice.tone === "error" ? "text-destructive" : "text-foreground"}`}>{notice.text}</p>}
        <div hidden={tab !== "base"} className="space-y-6 p-4 sm:p-6">
          <form className="space-y-5" onSubmit={event => {
            event.preventDefault(); if (!validBase || !baseDirty) return;
            void mutate(async () => {
              const updated = await updateCommerceProduct(accessToken, current.id, { ...(draft.title !== current.title ? { title: draft.title.trim() } : {}), ...(draft.slug !== current.slug ? { slug: draft.slug.trim().toLowerCase() } : {}), ...(draft.categoryId !== current.category.id ? { categoryId: draft.categoryId } : {}) });
              setCurrent(updated); setDraft(baseFrom(updated)); return updated;
            }, "اطلاعات پایهٔ محصول ذخیره شد.");
          }}><div><h3 className="text-base font-bold">اطلاعات پایه</h3><p className="mt-1 text-xs leading-6 text-muted-foreground">نام، آدرس و دسته‌بندی محصول را از همین‌جا ویرایش کنید.</p></div><fieldset disabled={busy || blocked} className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-xs sm:col-span-2">نام محصول<input required maxLength={240} className={field} value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} /></label><label className="space-y-2 text-xs">شناسهٔ آدرس<input required maxLength={260} dir="ltr" className={field} value={draft.slug} onChange={event => setDraft(value => ({ ...value, slug: event.target.value }))} /><span className="block leading-6 text-muted-foreground">حروف انگلیسی، عدد، خط تیره یا زیرخط</span></label><label className="space-y-2 text-xs">دسته‌بندی<select required className={field} value={draft.categoryId} onChange={event => setDraft(value => ({ ...value, categoryId: event.target.value }))}>{categories.filter(category => category.isActive || category.id === current.category.id).map(category => <option key={category.id} value={category.id}>{category.name}{!category.isActive ? " (غیرفعال)" : ""}</option>)}</select></label></fieldset><button className="dashboard-button dashboard-button-primary" disabled={busy || blocked || !validBase || !baseDirty}><Save size={16} aria-hidden="true" />ذخیرهٔ اطلاعات پایه</button></form>
          <div className="rounded-lg border border-border p-4"><h3 className="text-sm font-semibold">توضیحات و مشخصات</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-muted-foreground">{current.content?.shortDescription || current.description || "توضیحی ثبت نشده است."}</p><button type="button" disabled={busy} onClick={() => selectTab("content")} className="dashboard-button mt-3"><FileText size={15} />ویرایش محتوا و جزئیات</button></div>
          <section className="space-y-3 rounded-xl border border-border p-4" aria-label="وضعیت انتشار محصول"><h3 className="text-sm font-semibold">وضعیت انتشار</h3>
            {current.status === "ARCHIVED" ? <><p className="text-xs leading-7 text-muted-foreground">محصول بایگانی شده است. بازیابی، آن را به پیش‌نویس برمی‌گرداند؛ فعال‌سازی بعداً با انتخاب شما انجام می‌شود.</p><button type="button" disabled={busy || blocked} onClick={() => lifecycle("DRAFT")} className="dashboard-button"><ArchiveRestore size={16} />خروج از بایگانی</button></> : current.status === "DRAFT" ? <><p className="text-xs leading-7 text-muted-foreground">پس از ثبت نوع فروش فعال، محصول را فعال کنید. تأیید محتوا جداگانه انجام می‌شود.</p><button type="button" disabled={busy || blocked || !current.skus.some(sku => sku.isActive)} onClick={() => lifecycle("ACTIVE")} className="dashboard-button"><Check size={16} />فعال‌سازی محصول</button></> : confirmArchive ? <div role="alert" className="space-y-3"><p className="text-xs leading-7">این محصول از فروشگاه خارج شود؟ سوابق سفارش‌ها حفظ می‌شوند.</p><div className="flex flex-wrap gap-2"><button type="button" disabled={busy || blocked} onClick={() => lifecycle("ARCHIVED")} className="dashboard-button">تأیید بایگانی</button><button type="button" disabled={busy} onClick={() => setConfirmArchive(false)} className="dashboard-button">انصراف</button></div></div> : <button type="button" disabled={busy || blocked} onClick={() => setConfirmArchive(true)} className="dashboard-button"><Archive size={16} />بایگانی محصول</button>}
          </section>
        </div>
        <div hidden={tab !== "image"}>{visited.includes("image") && <ProductImageEditor product={current} embedded onClose={requestClose} onChanged={onChanged} onEditorStateChange={imageChanged} />}</div>
        <div hidden={tab !== "content"}>{visited.includes("content") && <ProductContentEditor product={current} accessToken={accessToken} embedded onClose={requestClose} onChanged={onChanged} onEditorStateChange={contentChanged} />}</div>
        <div hidden={tab !== "inventory"}>{visited.includes("inventory") && <ProductSkuEditor product={current} busy={busy || blocked} onEditorStateChange={inventoryChanged} actions={{
          save: (sku, body) => mutate(async () => { const updated = await updateCommerceSku(accessToken, sku.id, body); setCurrent(value => ({ ...value, skus: value.skus.map(item => item.id === updated.id ? updated : item) })); return updated; }, "اطلاعات نوع فروش ذخیره شد."),
          stock: (sku, value) => mutate(async () => { const updated = await updateCommerceInventory(accessToken, sku.id, value); setCurrent(product => ({ ...product, skus: product.skus.map(item => item.id === sku.id ? { ...item, onHandQuantity: updated.onHandQuantity, reservedQuantity: updated.reservedQuantity } : item) })); return updated.onHandQuantity; }, "موجودی ذخیره شد."),
          create: body => mutate(async () => { const created = await createCommerceSku(accessToken, current.id, body); setCurrent(value => ({ ...value, skus: [...value.skus, created] })); return created; }, "نوع فروش ساخته شد."),
        }} />}</div>
      </div>
    </div>
    <footer className="shrink-0 border-t border-border bg-card px-4 py-3 sm:px-6">{confirmDiscard ? <div className="flex flex-wrap items-center justify-between gap-3" role="alert"><p className="text-xs leading-7">تغییرهای ذخیره‌نشدهٔ این محصول کنار گذاشته شوند؟</p><div className="flex flex-wrap gap-2"><button type="button" disabled={busy || blocked} className="dashboard-button" onClick={() => { if (!busy && !blocked) onClose(); }}>بستن بدون ذخیره</button><button type="button" disabled={busy || blocked} className="dashboard-button dashboard-button-primary" onClick={() => setConfirmDiscard(false)}>ادامهٔ ویرایش</button></div></div> : <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground" role="status">{busy ? "در حال ذخیره و دریافت وضعیت…" : dirty ? "تغییرهای ذخیره‌نشده دارید." : "هر بخش را پس از ویرایش ذخیره کنید."}</p><button type="button" onClick={requestClose} className="dashboard-button">بستن</button></div>}</footer>
  </dialog>;
}
