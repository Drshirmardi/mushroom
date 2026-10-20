"use client";

import { useState } from "react";
import { ArrowUpLeft, LayoutGrid, List, Package, Search, X } from "lucide-react";
import type { CommerceCatalogData, CommerceProduct } from "@/lib/commerce-catalog-api";
import { CONTENT_STATUS_LABEL } from "./product-content-draft";
import { inventoryTotals, matchesProduct } from "./catalog-view";
import { ProductThumbnail } from "./product-thumbnail";

const field = "min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labels = { DRAFT: "پیش‌نویس", ACTIVE: "فعال", ARCHIVED: "بایگانی" };
const fa = (value: number) => value.toLocaleString("fa-IR");

export function ProductCatalog({ data, busy, onEdit }: { data: CommerceCatalogData; busy: boolean; onEdit: (product: CommerceProduct) => void }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState(20);
  const products = data.products.filter(product => (category === "all" || product.category.id === category) && (status === "all" || product.status === status) && matchesProduct(product, query));
  const reset = () => { setQuery(""); setCategory("all"); setStatus("all"); setLimit(20); };

  return <section aria-label="فهرست محصولات" className="space-y-5">
    <div className="dashboard-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold">فهرست محصولات</h2><p role="status" className="mt-1 text-xs leading-6 text-muted-foreground">{fa(products.length)} نتیجه از {fa(data.products.length)} محصول این صفحه · برای مدیریت، محصول را انتخاب کنید.</p></div><div className="dashboard-segmented" role="group" aria-label="حالت نمایش محصولات"><button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label="نمای کارت‌های تصویردار" title="نمای کارتی"><LayoutGrid size={19} /></button><button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="نمای لیستی" title="نمای لیستی"><List size={20} /></button></div></div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="relative block"><span className="sr-only">جستجو در محصولات صفحهٔ فعلی</span><Search size={17} className="pointer-events-none absolute right-3 top-3.5 text-muted-foreground" aria-hidden="true" /><input className={`${field} pr-10`} value={query} onChange={event => { setQuery(event.target.value); setLimit(20); }} placeholder="نام، کد فروش یا دسته‌بندی در این صفحه…" type="search" /></label>
        <label><span className="sr-only">دسته‌بندی</span><select className={field} value={category} onChange={event => { setCategory(event.target.value); setLimit(20); }}><option value="all">همهٔ دسته‌بندی‌ها</option>{data.categories.map(item => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? " (غیرفعال)" : ""}</option>)}</select></label>
        <label><span className="sr-only">وضعیت محصول</span><select className={field} value={status} onChange={event => { setStatus(event.target.value); setLimit(20); }}><option value="all">همهٔ وضعیت‌ها</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {(query || category !== "all" || status !== "all") && <button type="button" onClick={reset} className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-medium"><X size={15} aria-hidden="true" />پاک کردن فیلترها</button>}
    </div>

    {products.length === 0 ? <div className="dashboard-card p-9 text-center"><Package size={32} className="mx-auto text-muted-foreground" aria-hidden="true" /><h3 className="mt-3 font-bold">{data.products.length ? "محصولی با این فیلترها پیدا نشد" : "هنوز محصولی ثبت نشده است"}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{data.products.length ? "فیلترها را تغییر دهید یا صفحهٔ بعدی محصولات را ببینید." : "از «محصول جدید» یک پیش‌نویس بسازید؛ سپس همهٔ بخش‌های آن را در پنجرهٔ محصول تکمیل کنید."}</p></div> : <div className={view === "grid" ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "space-y-3"}>
      {products.slice(0, limit).map(product => {
        const stock = inventoryTotals(product.skus);
        const activeSkus = product.skus.filter(sku => sku.isActive);
        const cheapest = activeSkus.reduce<string | null>((price, sku) => price === null || BigInt(sku.currentPriceToman) < BigInt(price) ? sku.currentPriceToman : price, null);
        return <article key={product.id} className={`dashboard-card overflow-hidden transition-shadow hover:shadow-md ${view === "list" ? "flex flex-row" : "flex flex-col"}`}>
          <button type="button" disabled={busy} onClick={() => onEdit(product)} aria-label={`باز کردن مدیریت ${product.title}`} className={`relative block shrink-0 overflow-hidden border-border ${view === "grid" ? "aspect-[4/3] w-full border-b" : "aspect-square w-24 self-start border-e sm:w-36"}`}>
            <ProductThumbnail product={product} sizes={view === "list" ? "144px" : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"} />
          </button>
          <div className={`flex min-w-0 flex-1 flex-col gap-3 p-4 ${view === "list" ? "lg:flex-row lg:items-center lg:gap-6" : ""}`}>
            <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`dashboard-badge ${product.status === "ARCHIVED" ? "dashboard-badge-accent" : ""}`}>{labels[product.status]}</span><span className="text-[11px] text-muted-foreground">{product.category.name}</span></div><h3><button type="button" disabled={busy} onClick={() => onEdit(product)} className="text-start text-sm font-semibold leading-7 [overflow-wrap:anywhere] hover:text-accent">{product.title}</button></h3><p className="mt-1 text-[11px] leading-6 text-muted-foreground">{product.content ? CONTENT_STATUS_LABEL[product.content.status] : "محتوا بررسی نشده"} · {fa(product.skus.length)} نوع فروش</p></div>
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3 text-xs lg:min-w-40"><div><p className="mb-1 text-muted-foreground">قیمت فروش</p><p className="font-semibold tabular-nums">{cheapest === null ? "نوع فروش فعال ندارد" : `${activeSkus.length > 1 ? "از " : ""}${BigInt(cheapest).toLocaleString("fa-IR")} تومان`}</p></div><p className="text-muted-foreground">{fa(stock.free)} آزاد / {fa(stock.reserved)} رزرو</p></div>
            <button type="button" disabled={busy} onClick={() => onEdit(product)} className="dashboard-button mt-auto w-full shrink-0 lg:w-auto">مدیریت محصول<ArrowUpLeft size={16} aria-hidden="true" /></button>
          </div>
        </article>;
      })}
    </div>}
    {products.length > limit && <div className="text-center"><button type="button" className="dashboard-button" onClick={() => setLimit(value => value + 20)}>نمایش ۲۰ محصول بعدی</button></div>}
  </section>;
}
