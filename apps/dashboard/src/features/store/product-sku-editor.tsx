"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { components } from "@sabz-zendegi/api-client";
import type { CommerceProduct, CommerceSku } from "@/lib/commerce-catalog-api";
import { catalogInteger, type ProductEditorState } from "./catalog-view";

type SkuPatch = components["schemas"]["UpdateCommerceSkuDto"];
type SkuCreate = components["schemas"]["CreateCommerceSkuDto"];
type Actions = {
  save: (sku: CommerceSku, body: SkuPatch) => Promise<CommerceSku | undefined>;
  stock: (sku: CommerceSku, value: number) => Promise<number | undefined>;
  create: (body: SkuCreate) => Promise<CommerceSku | undefined>;
};
const field = "min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50";
const fieldsFrom = (sku: CommerceSku) => ({ code: sku.code, title: sku.title ?? "", price: sku.currentPriceToman, tax: sku.currentTaxToman, active: sku.isActive });

function SkuFields({ sku, busy, actions, onDirty }: { sku: CommerceSku; busy: boolean; actions: Actions; onDirty: (id: string, dirty: boolean) => void }) {
  const [draft, setDraft] = useState(() => fieldsFrom(sku));
  const [stock, setStock] = useState(String(sku.onHandQuantity));
  const changed = draft.code !== sku.code || draft.title !== (sku.title ?? "") || draft.price !== sku.currentPriceToman || draft.tax !== sku.currentTaxToman || draft.active !== sku.isActive;
  const stockChanged = stock !== String(sku.onHandQuantity);
  useEffect(() => { onDirty(sku.id, changed || stockChanged); }, [sku.id, changed, stockChanged, onDirty]);
  const price = catalogInteger(draft.price); const tax = catalogInteger(draft.tax); const quantity = catalogInteger(stock);
  const valid = !!draft.code.trim() && (draft.price === sku.currentPriceToman || price !== null) && (draft.tax === sku.currentTaxToman || tax !== null);

  return <section className="rounded-xl border border-border p-4" aria-label={`نوع فروش ${sku.code}`}>
    <div className="mb-4 flex flex-wrap justify-between gap-2"><h3 className="text-sm font-semibold"><bdi>{sku.code}</bdi></h3><p className="text-xs text-muted-foreground">{sku.reservedQuantity.toLocaleString("fa-IR")} رزرو · {Math.max(0, sku.onHandQuantity - sku.reservedQuantity).toLocaleString("fa-IR")} موجودی آزاد</p></div>
    <form className="space-y-4" onSubmit={event => {
      event.preventDefault(); if (busy || !valid || !changed) return;
      const body: SkuPatch = {};
      if (draft.code !== sku.code) body.code = draft.code.trim();
      if (draft.title !== (sku.title ?? "")) body.title = draft.title.trim() || null;
      if (draft.price !== sku.currentPriceToman && price !== null) body.currentPriceToman = price;
      if (draft.tax !== sku.currentTaxToman && tax !== null) body.currentTaxToman = tax;
      if (draft.active !== sku.isActive) body.isActive = draft.active;
      void actions.save(sku, body).then(updated => { if (updated) setDraft(fieldsFrom(updated)); });
    }}>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs">کد فروش<input required maxLength={80} dir="ltr" className={field} value={draft.code} onChange={event => setDraft(value => ({ ...value, code: event.target.value }))} /></label>
        <label className="space-y-1.5 text-xs">عنوان نوع فروش<input maxLength={240} className={field} value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} /></label>
        <label className="space-y-1.5 text-xs">قیمت فروش (تومان)<input required inputMode="numeric" dir="ltr" className={field} value={draft.price} onChange={event => setDraft(value => ({ ...value, price: event.target.value }))} aria-invalid={draft.price !== sku.currentPriceToman && price === null} /></label>
        <label className="space-y-1.5 text-xs">مالیات (تومان)<input required inputMode="numeric" dir="ltr" className={field} value={draft.tax} onChange={event => setDraft(value => ({ ...value, tax: event.target.value }))} aria-invalid={draft.tax !== sku.currentTaxToman && tax === null} /></label>
        <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={draft.active} onChange={event => setDraft(value => ({ ...value, active: event.target.checked }))} />نوع فروش فعال است</label>
      </fieldset>
      {!valid && <p role="alert" className="text-xs text-destructive">کد فروش لازم است؛ مبالغ جدید باید عدد صحیح، غیرمنفی و در محدودهٔ مجاز باشند.</p>}
      <button className="dashboard-button" disabled={busy || !valid || !changed}>ذخیرهٔ اطلاعات نوع فروش</button>
    </form>
    <form className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-4" onSubmit={event => {
      event.preventDefault(); if (busy || quantity === null || quantity < sku.reservedQuantity || !stockChanged) return;
      void actions.stock(sku, quantity).then(updated => { if (updated !== undefined) setStock(String(updated)); });
    }}><label className="min-w-0 flex-1 space-y-1.5 text-xs">موجودی فیزیکی<input required disabled={busy} inputMode="numeric" dir="ltr" className={field} value={stock} onChange={event => setStock(event.target.value)} aria-invalid={quantity === null || quantity < sku.reservedQuantity} /></label><button className="dashboard-button" disabled={busy || quantity === null || quantity < sku.reservedQuantity || !stockChanged}>ذخیرهٔ موجودی</button><p className="w-full text-xs leading-6 text-muted-foreground">موجودی فیزیکی شامل رزروهاست و نمی‌تواند از {sku.reservedQuantity.toLocaleString("fa-IR")} کمتر باشد. موجودی جداگانه ذخیره می‌شود.</p></form>
  </section>;
}

export default function ProductSkuEditor({ product, busy, actions, onEditorStateChange }: { product: CommerceProduct; busy: boolean; actions: Actions; onEditorStateChange: (state: ProductEditorState) => void }) {
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState(""); const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0"); const [tax, setTax] = useState("0"); const [stock, setStock] = useState("0");
  const [dirtyRows, setDirtyRows] = useState<Record<string, boolean>>({});
  const onDirty = useCallback((id: string, dirty: boolean) => setDirtyRows(current => current[id] === dirty ? current : { ...current, [id]: dirty }), []);
  const dirty = Object.values(dirtyRows).some(Boolean) || !!(code || title || price !== "0" || tax !== "0" || stock !== "0");
  useEffect(() => { onEditorStateChange({ busy: false, dirty }); }, [dirty, onEditorStateChange]);
  const priceValue = catalogInteger(price); const taxValue = catalogInteger(tax); const stockValue = catalogInteger(stock);

  return <div className="space-y-4 p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold">انواع فروش، قیمت و موجودی</h2><p className="mt-1 text-xs leading-6 text-muted-foreground">هر کد فروش، قیمت و موجودی مستقل دارد.</p></div><button type="button" disabled={busy || product.status === "ARCHIVED"} className="dashboard-button" aria-expanded={creating} onClick={() => setCreating(value => !value)}><Plus size={16} aria-hidden="true" />{creating ? "بستن فرم جدید" : "نوع فروش جدید"}</button></div>
    {product.status === "ARCHIVED" && <p className="text-xs leading-6 text-muted-foreground">برای افزودن نوع فروش، ابتدا محصول را از بایگانی به پیش‌نویس برگردانید.</p>}
    {creating && <form className="space-y-4 rounded-xl border border-border p-4" onSubmit={event => {
      event.preventDefault(); if (busy || !code.trim() || priceValue === null || taxValue === null || stockValue === null) return;
      void actions.create({ code: code.trim(), ...(title.trim() ? { title: title.trim() } : {}), currentPriceToman: priceValue, currentTaxToman: taxValue, initialOnHandQuantity: stockValue }).then(created => { if (created) { setCode(""); setTitle(""); setPrice("0"); setTax("0"); setStock("0"); setCreating(false); } });
    }}><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs">کد فروش<input required maxLength={80} dir="ltr" className={field} value={code} onChange={event => setCode(event.target.value)} /></label><label className="space-y-1.5 text-xs">عنوان (اختیاری)<input maxLength={240} className={field} value={title} onChange={event => setTitle(event.target.value)} /></label><label className="space-y-1.5 text-xs">قیمت (تومان)<input required inputMode="numeric" dir="ltr" className={field} value={price} onChange={event => setPrice(event.target.value)} /></label><label className="space-y-1.5 text-xs">مالیات (تومان)<input required inputMode="numeric" dir="ltr" className={field} value={tax} onChange={event => setTax(event.target.value)} /></label><label className="space-y-1.5 text-xs">موجودی اولیه<input required inputMode="numeric" dir="ltr" className={field} value={stock} onChange={event => setStock(event.target.value)} /></label></fieldset><button className="dashboard-button dashboard-button-primary" disabled={busy || !code.trim() || priceValue === null || taxValue === null || stockValue === null}>ساخت نوع فروش</button></form>}
    {product.skus.map(sku => <SkuFields key={sku.id} sku={sku} busy={busy} actions={actions} onDirty={onDirty} />)}
    {!product.skus.length && <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">هنوز نوع فروشی ثبت نشده است. کد فروش، قیمت و موجودی اولیه را از همین بخش اضافه کنید.</p>}
  </div>;
}
