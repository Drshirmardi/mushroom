"use client";

import { ImageOff, Store } from "lucide-react";

import type { CommerceCatalogData, CommerceProduct } from "@/lib/commerce-catalog-api";
import type { AdminBanner } from "@/lib/content-banners-api";
import { BannerImage, ProductImage } from "./media";

const toman = (value: string) => `${BigInt(value).toLocaleString("fa-IR")} تومان`;
export const storefrontSku = (product: CommerceProduct) => product.skus.find(sku => sku.isActive);

function stockOf(product: CommerceProduct) {
  const sku = storefrontSku(product);
  if (!sku) return { label: "بدون فروش", tone: "text-muted-foreground" };
  const free = Math.max(0, sku.onHandQuantity - sku.reservedQuantity);
  if (free <= 0) return { label: "ناموجود", tone: "text-red-600" };
  if (free <= 5) return { label: "رو به اتمام", tone: "text-amber-700" };
  return { label: `${free.toLocaleString("fa-IR")} عدد موجود`, tone: "text-emerald-700" };
}

const STATUS: Record<CommerceProduct["status"], { label: string; tone: string }> = {
  ACTIVE: { label: "فعال", tone: "bg-emerald-600 text-white" },
  DRAFT: { label: "پیش‌نویس", tone: "bg-amber-500 text-white" },
  ARCHIVED: { label: "آرشیو", tone: "bg-slate-500 text-white" },
};

function ProductCard({ product }: { product: CommerceProduct }) {
  const stock = stockOf(product);
  const price = storefrontSku(product)?.currentPriceToman;
  const status = STATUS[product.status];
  return <article className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="relative">
      <ProductImage productId={product.id} hasImage={Boolean(product.image)} refreshKey={product.image?.id} alt={product.title} className="aspect-square w-full" />
      <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${status.tone}`}>{status.label}</span>
    </div>
    <div className="space-y-1 p-3">
      <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5">{product.title}</h3>
      <p className="text-xs text-muted-foreground">{product.category.name}</p>
      <div className="flex items-end justify-between gap-2 pt-1">
        <span className="text-sm font-bold text-primary">{price ? toman(price) : "بدون قیمت"}</span>
        <span className={`text-[11px] font-semibold ${stock.tone}`}>{stock.label}</span>
      </div>
    </div>
  </article>;
}

export function StorefrontPreview({ catalog, banners }: { catalog: CommerceCatalogData; banners: AdminBanner[] | null }) {
  const published = (banners ?? []).filter(banner => banner.publicationStatus === "PUBLISHED" && banner.publishedAt && banner.contentPath);
  const products = catalog.products
    .filter(product => product.status === "ACTIVE" && product.category.isActive && product.skus.some(sku => sku.isActive))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1));
  const shown = products.slice(0, 12);

  return <section className="rounded-xl border border-border bg-card">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
      <div><h2 className="font-bold">ویترین فروشگاه</h2><p className="mt-1 text-sm text-muted-foreground">محصولات فعال این فهرست که شرایط نمایش در فروشگاه را دارند.</p></div>
      <span className="text-xs text-muted-foreground">{products.length.toLocaleString("fa-IR")} محصول قابل نمایش</span>
    </div>
    <div className="space-y-6 p-5">
      <div>
        <h3 className="mb-3 text-sm font-bold text-muted-foreground">بنرهای منتشرشده</h3>
        {banners === null ? <p role="status" className="text-sm text-muted-foreground">بنرها هنوز دریافت نشده‌اند.</p> : published.length === 0 ? <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground"><ImageOff size={16} />هنوز بنر منتشرشده‌ای وجود ندارد.</div>
          : <div className="flex gap-3 overflow-x-auto pb-2">
            {published.map(banner => <BannerImage key={banner.id} bannerId={banner.id} hasMedia alt={banner.title} refreshKey={banner.updatedAt} className="aspect-[2/1] w-64 flex-shrink-0 rounded-lg border border-border" />)}
          </div>}
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-muted-foreground">محصولات ویترین</h3>
          {products.length > shown.length && <span className="text-xs text-muted-foreground">نمایش {shown.length.toLocaleString("fa-IR")} از {products.length.toLocaleString("fa-IR")}</span>}
        </div>
        {shown.length === 0 ? <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground"><Store size={16} />هنوز محصولی برای نمایش وجود ندارد.</div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{shown.map(product => <ProductCard key={product.id} product={product} />)}</div>}
      </div>
    </div>
  </section>;
}
