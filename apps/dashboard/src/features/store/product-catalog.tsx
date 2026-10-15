"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, ChevronDown, FileText, ImagePlus, Package, Search, SlidersHorizontal, X } from "lucide-react";
import { updateCommerceInventory, updateCommerceProduct, updateCommerceSku, type CommerceCatalogData, type CommerceProduct, type CommerceSku } from "../../lib/commerce-catalog-api";
import { CONTENT_STATUS_LABEL } from "./product-content-draft";
import { catalogInteger, inventoryTotals, matchesProduct } from "./catalog-view";

const field = "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
const labels = { DRAFT: "پیش‌نویس", ACTIVE: "فعال", ARCHIVED: "بایگانی" };
const statusClasses = { DRAFT: "bg-slate-100 text-slate-700", ACTIVE: "bg-emerald-50 text-emerald-800", ARCHIVED: "bg-amber-50 text-amber-900" };
const fa = (value: number) => value.toLocaleString("fa-IR");
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
type Submit = (work: () => Promise<unknown>, success: string) => Promise<void>;

function SkuEditor({ sku, token, busy, submit }: { sku: CommerceSku; token: string; busy: boolean; submit: Submit }) {
  const [price, setPrice] = useState(sku.currentPriceToman);
  const [stock, setStock] = useState(String(sku.onHandQuantity));
  const previousPrice = useRef(sku.currentPriceToman);
  const previousStock = useRef(String(sku.onHandQuantity));
  useEffect(() => {
    const old = previousPrice.current;
    setPrice((current) => current === old ? sku.currentPriceToman : current);
    previousPrice.current = sku.currentPriceToman;
  }, [sku.currentPriceToman]);
  useEffect(() => {
    const old = previousStock.current;
    setStock((current) => current === old ? String(sku.onHandQuantity) : current);
    previousStock.current = String(sku.onHandQuantity);
  }, [sku.onHandQuantity]);
  const nextPrice = catalogInteger(price);
  const nextStock = catalogInteger(stock);
  return <section className="rounded-xl border border-border bg-card p-4" aria-label={`قیمت و موجودی ${sku.code}`}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold"><bdi dir="ltr">{sku.code}</bdi>{sku.title && <span className="mr-2 font-normal">{sku.title}</span>}</h4><span className="text-xs text-muted-foreground">{sku.isActive ? "نوع فروش فعال" : "نوع فروش غیرفعال"} · رزرو: {fa(sku.reservedQuantity)}</span></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <form onSubmit={(event) => { event.preventDefault(); if (nextPrice !== null) void submit(() => updateCommerceSku(token, sku.id, { currentPriceToman: nextPrice }), `قیمت ${sku.code} ذخیره شد.`); }} className="space-y-2">
        <label htmlFor={`price-${sku.id}`} className="block text-sm font-semibold">قیمت فروش <span className="font-normal text-muted-foreground">(تومان)</span></label>
        <input id={`price-${sku.id}`} className={field} type="number" dir="ltr" min="0" step="1" required disabled={busy} value={price} onChange={(event) => setPrice(event.target.value)} aria-invalid={nextPrice === null} aria-describedby={`price-help-${sku.id}`} />
        <p id={`price-help-${sku.id}`} className={`text-xs leading-6 ${nextPrice === null ? "text-red-700" : "text-muted-foreground"}`}>{nextPrice === null ? "قیمت باید عدد صحیح و غیرمنفی باشد." : "مبلغ به تومان است؛ تغییر فقط با ذخیرهٔ قیمت ثبت می‌شود."}</p>
        <button className={secondary} disabled={busy || nextPrice === null || String(nextPrice) === sku.currentPriceToman}>ذخیره قیمت</button>
      </form>
      <form onSubmit={(event) => { event.preventDefault(); if (nextStock !== null && nextStock >= sku.reservedQuantity) void submit(() => updateCommerceInventory(token, sku.id, nextStock), `موجودی ${sku.code} ذخیره شد.`); }} className="space-y-2">
        <label htmlFor={`stock-${sku.id}`} className="block text-sm font-semibold">موجودی فیزیکی</label>
        <input id={`stock-${sku.id}`} className={field} type="number" dir="ltr" min={sku.reservedQuantity} step="1" required disabled={busy} value={stock} onChange={(event) => setStock(event.target.value)} aria-describedby={`stock-help-${sku.id}`} aria-invalid={nextStock === null || nextStock < sku.reservedQuantity} />
        <p id={`stock-help-${sku.id}`} className="text-xs leading-6 text-muted-foreground">موجودی آزاد فعلی: {fa(Math.max(0, sku.onHandQuantity - sku.reservedQuantity))}؛ موجودی فیزیکی نمی‌تواند کمتر از رزرو باشد.</p>
        <button className={secondary} disabled={busy || nextStock === null || nextStock < sku.reservedQuantity || nextStock === sku.onHandQuantity}>ذخیره موجودی</button>
      </form>
    </div>
  </section>;
}

export function ProductCatalog({ data, accessToken, busy, submit, editImage, editContent, addSku }: {
  data: CommerceCatalogData; accessToken: string; busy: boolean; submit: Submit;
  editImage: (product: CommerceProduct) => void; editContent: (product: CommerceProduct) => void; addSku: (product: CommerceProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [opened, setOpened] = useState<string | null>(null);
  const [archive, setArchive] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const products = data.products.filter((product) => (category === "all" || product.category.id === category) && (status === "all" || product.status === status) && matchesProduct(product, query));
  const reset = () => { setQuery(""); setCategory("all"); setStatus("all"); setLimit(20); };
  return <section aria-label="فهرست محصولات" className="space-y-4">
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold">فهرست محصولات</h2><p role="status" className="text-sm tabular-nums text-muted-foreground">{fa(products.length)} نتیجه از {fa(data.products.length)} محصول دریافت‌شده</p></div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="relative block"><span className="sr-only">جستجوی محصولات دریافت‌شده</span><Search size={18} className="pointer-events-none absolute right-3 top-3.5 text-muted-foreground" aria-hidden="true" /><input className={`${field} pr-10`} value={query} onChange={(event) => { setQuery(event.target.value); setLimit(20); }} placeholder="نام محصول، کد فروش یا دسته‌بندی…" type="search" /></label>
        <label><span className="sr-only">فیلتر دسته‌بندی</span><select className={field} value={category} onChange={(event) => { setCategory(event.target.value); setLimit(20); }}><option value="all">همه دسته‌بندی‌ها</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? " (غیرفعال)" : ""}</option>)}</select></label>
        <label><span className="sr-only">فیلتر وضعیت</span><select className={field} value={status} onChange={(event) => { setStatus(event.target.value); setLimit(20); }}><option value="all">همه وضعیت‌ها</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {(query || category !== "all" || status !== "all") && <button type="button" onClick={reset} className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"><X size={16} aria-hidden="true" />پاک کردن فیلترها</button>}
    </div>
    {products.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><Package size={32} className="mx-auto text-muted-foreground" aria-hidden="true" /><h3 className="mt-3 font-bold">{data.products.length ? "محصولی با این فیلترها پیدا نشد" : "هنوز محصولی ثبت نشده است"}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{data.products.length ? "نام، کد فروش یا فیلتر وضعیت را تغییر دهید." : "از «محصول جدید» یک پیش‌نویس بسازید؛ سپس قیمت، موجودی، تصویر و محتوا را تکمیل کنید."}</p></div> : <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-xs font-semibold text-muted-foreground lg:grid" aria-hidden="true"><span>محصول و وضعیت</span><span>قیمت فروش</span><span>موجودی آزاد / رزرو</span><span>مدیریت</span></div>
      {products.slice(0, limit).map((product) => {
        const stock = inventoryTotals(product.skus);
        const cheapest = product.skus.reduce<string | null>((price, sku) => price === null || BigInt(sku.currentPriceToman) < BigInt(price) ? sku.currentPriceToman : price, null);
        const expanded = opened === product.id;
        return <article key={product.id} className="border-b border-border last:border-0">
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] lg:items-center">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold leading-7">{product.title}</h3><span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClasses[product.status]}`}>{labels[product.status]}</span></div><p className="mt-1 text-xs leading-6 text-muted-foreground">{product.category.name} · {fa(product.skus.length)} نوع فروش</p><p className="mt-1 text-xs leading-6 text-muted-foreground">{product.content ? CONTENT_STATUS_LABEL[product.content.status] : "محتوای محصول را بررسی کنید"}</p></div>
            <div className="text-sm tabular-nums"><span className="text-xs text-muted-foreground lg:hidden">قیمت: </span>{cheapest === null ? <span className="text-muted-foreground">ثبت نشده</span> : <><span className="font-semibold">{product.skus.length > 1 ? "از " : ""}{money(cheapest)}</span><span className="mr-1 text-xs text-muted-foreground">تومان</span></>}</div>
            <div className="text-sm tabular-nums"><span className="font-bold">{fa(stock.free)}</span> آزاد <span className="text-muted-foreground">/ {fa(stock.reserved)} رزرو</span>{product.skus.length === 0 && <p className="mt-1 text-xs text-amber-800">نوع فروش ثبت نشده</p>}</div>
            <div className="flex flex-wrap gap-2"><button type="button" className={secondary} disabled={busy} aria-label={`مدیریت قیمت و موجودی ${product.title}`} aria-expanded={expanded} aria-controls={`product-stock-${product.id}`} onClick={() => { setOpened(expanded ? null : product.id); setArchive(null); }}><SlidersHorizontal size={16} aria-hidden="true" />مدیریت<ChevronDown size={14} aria-hidden="true" className={expanded ? "rotate-180" : ""} /></button><button type="button" className={secondary} disabled={busy} aria-label={`ویرایش محتوای ${product.title}`} onClick={() => editContent(product)}><FileText size={16} aria-hidden="true" />محتوا</button><button type="button" className={secondary} disabled={busy} aria-label={`مدیریت تصویر ${product.title}`} onClick={() => editImage(product)}><ImagePlus size={16} aria-hidden="true" />تصویر</button></div>
          </div>
          <div hidden={!expanded} id={`product-stock-${product.id}`} className="space-y-4 border-t border-border bg-secondary/25 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">قیمت و موجودی {product.title}</h3>{product.status !== "ARCHIVED" && <button type="button" className={secondary} disabled={busy} onClick={() => addSku(product)}>افزودن نوع فروش</button>}</div>
            {product.skus.map((sku) => <SkuEditor key={sku.id} sku={sku} token={accessToken} busy={busy} submit={submit} />)}
            {product.skus.length === 0 && <p className="text-sm leading-7 text-muted-foreground">ابتدا یک نوع فروش با کد، قیمت و موجودی ثبت کنید تا مدیریت محصول کامل شود.</p>}
            {product.status === "DRAFT" && <div className="flex flex-wrap items-center gap-3"><button type="button" className={secondary} disabled={busy || !product.skus.some((sku) => sku.isActive)} onClick={() => void submit(() => updateCommerceProduct(accessToken, product.id, { status: "ACTIVE" }), `${product.title} فعال شد.`)}>فعال‌سازی محصول</button><p className="text-xs leading-6 text-muted-foreground">فعال‌سازی محصول و تأیید محتوا دو مرحلهٔ مستقل هستند.</p></div>}
            {product.status === "ACTIVE" && (archive === product.id ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><span>محصول از فروشگاه خارج می‌شود. بایگانی شود؟</span><button className={secondary} disabled={busy} onClick={() => void submit(() => updateCommerceProduct(accessToken, product.id, { status: "ARCHIVED" }), `${product.title} بایگانی شد.`)}>تأیید بایگانی</button><button className={secondary} disabled={busy} onClick={() => setArchive(null)}>انصراف</button></div> : <button type="button" className={`${secondary} text-amber-900`} disabled={busy} onClick={() => setArchive(product.id)}><Archive size={16} aria-hidden="true" />بایگانی محصول</button>)}
          </div>
        </article>;
      })}
      {products.length > limit && <div className="border-t border-border p-4 text-center"><button type="button" className={secondary} onClick={() => setLimit((current) => current + 20)}>نمایش ۲۰ محصول بعدی</button></div>}
    </div>}
  </section>;
}
