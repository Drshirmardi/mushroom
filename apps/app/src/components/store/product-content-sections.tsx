"use client";

import { useState } from "react";
import { Award, Barcode, ClipboardList, Factory, FlaskConical, Leaf, TriangleAlert } from "lucide-react";

import type { CommerceProduct } from "../../lib/commerce-catalog-api";

const text = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

/** Long editorial blocks collapse behind "نمایش بیشتر" (Digikala-style). */
const COLLAPSE_THRESHOLD = 420;

function SectionBody({ id, value }: { id: string; value: string }) {
  const [open, setOpen] = useState(false);
  const collapsible = value.length > COLLAPSE_THRESHOLD;
  const paragraphId = `${id}-text`;
  return <>
    <p id={paragraphId} className={collapsible && !open ? "store-clamp" : undefined}>{value}</p>
    {collapsible && (
      <button type="button" className="store-more" aria-expanded={open} aria-controls={paragraphId} onClick={() => setOpen((current) => !current)}>
        {open ? "نمایش کمتر" : "نمایش بیشتر"}
      </button>
    )}
  </>;
}

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
  const skuCode = text(product.skus[0]?.code);
  const specs = [
    brand ? { key: "brand", label: "برند", value: brand, ltr: false, icon: Award } : null,
    manufacturer ? { key: "manufacturer", label: "تولیدکننده", value: manufacturer, ltr: false, icon: Factory } : null,
    skuCode ? { key: "sku", label: "کد کالا", value: skuCode, ltr: true, icon: Barcode } : null,
  ].filter((spec): spec is { key: string; label: string; value: string; ltr: boolean; icon: typeof Award } => spec !== null);
  const sections = [
    { id: "product-about", label: "درباره محصول", title: "دربارهٔ محصول", value: description, icon: Leaf },
    { id: "product-ingredients", label: "ترکیبات", title: "ترکیبات", value: ingredients, icon: FlaskConical },
    { id: "product-usage", label: "دستور مصرف", title: "دستور مصرف", value: usage, icon: ClipboardList },
    { id: "product-warnings", label: "هشدارها", title: "هشدارها", value: warnings, icon: TriangleAlert },
    { id: "product-contraindications", label: "موارد منع مصرف", title: "موارد منع مصرف", value: contraindications, icon: TriangleAlert },
  ].filter((section): section is { id: string; label: string; title: string; value: string; icon: typeof Leaf } => section.value !== null);

  return <>
    {shortDescription && (
      <p className="store-lede">{shortDescription}</p>
    )}
    {specs.length > 0 && (
      <dl className="store-facts" aria-label="مشخصات محصول">
        {specs.map((spec) => (
          <div key={spec.key}>
            <dt><spec.icon size={14} aria-hidden="true" />{spec.label}</dt>
            <dd dir={spec.ltr ? "ltr" : undefined} className={spec.ltr ? "store-facts__code" : undefined}>{spec.value}</dd>
          </div>
        ))}
      </dl>
    )}
    {sections.length > 1 && <nav className="store-content-nav" aria-label="بخش‌های اطلاعات محصول">
      {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
    </nav>}
    {sections.map(({ id, label, title, value, icon: Icon }) => <section key={id} id={id} className={`store-description${id === "product-warnings" || id === "product-contraindications" ? " store-description--warning" : ""}`} aria-label={label}>
      <h3><span className="store-section-icon"><Icon size={18} aria-hidden="true" /></span>{title}</h3>
      <SectionBody id={id} value={value} />
    </section>)}
  </>;
}
