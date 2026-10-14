"use client";

import type { CommerceProduct } from "../../lib/commerce-catalog-api";

const text = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

/**
 * Real approved/legacy product content (Phase B1C). Every section renders
 * only when the public API actually returns a value; missing, unapproved or
 * unavailable fields render nothing — never placeholders, ratings, sellers
 * or approval claims. Plain text is rendered as plain text (React-escaped).
 */
export function ProductContentSections({ product }: { product: CommerceProduct }) {
  const content = product.content ?? null;
  const brand = text(content?.brand) ?? text(product.brand);
  const manufacturer = text(content?.manufacturer);
  const shortDescription = text(content?.shortDescription) ?? text(product.shortDescription);
  const description = text(content?.description) ?? text(product.description);
  const ingredients = text(content?.ingredients);
  const usage = text(content?.usageInstructions);
  const warnings = text(content?.warnings);
  const contraindications = text(content?.contraindications);

  return <>
    {shortDescription && (
      <p className="mt-3 text-[15px] font-semibold leading-7 text-foreground">{shortDescription}</p>
    )}
    {(brand || manufacturer) && (
      <dl aria-label="برند و تولیدکننده" className="mt-3 space-y-1.5 rounded-2xl border border-border bg-white p-4">
        {brand && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">برند</dt>
            <dd className="font-bold text-foreground">{brand}</dd>
          </div>
        )}
        {manufacturer && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">تولیدکننده</dt>
            <dd className="font-bold text-foreground">{manufacturer}</dd>
          </div>
        )}
      </dl>
    )}
    {description && (
      <section className="store-description" aria-label="درباره محصول"><h3>دربارهٔ محصول</h3><p>{description}</p></section>
    )}
    {ingredients && (
      <section className="store-description" aria-label="ترکیبات"><h3>ترکیبات</h3><p>{ingredients}</p></section>
    )}
    {usage && (
      <section className="store-description" aria-label="دستور مصرف"><h3>دستور مصرف</h3><p>{usage}</p></section>
    )}
    {warnings && (
      <section className="store-description" aria-label="هشدارها"><h3>هشدارها</h3><p>{warnings}</p></section>
    )}
    {contraindications && (
      <section className="store-description" aria-label="موارد منع مصرف"><h3>موارد منع مصرف</h3><p>{contraindications}</p></section>
    )}
  </>;
}
