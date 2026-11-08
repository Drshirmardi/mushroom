"use client";

import { useState } from "react";
import { Award, Barcode, ClipboardList, Factory, FlaskConical, Leaf, TriangleAlert } from "lucide-react";
import type { CommerceProduct } from "../../lib/commerce-catalog-api";

const text = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

/** Long editorial blocks stay readable without taking over the entire mobile sheet. */
const COLLAPSE_THRESHOLD = 420;

function SectionBody({ id, value }: { id: string; value: string }) {
  const [open, setOpen] = useState(false);
  const collapsible = value.length > COLLAPSE_THRESHOLD;
  const paragraphId = `${id}-text`;
  return (
    <>
      <p
        id={paragraphId}
        className={`max-w-[68ch] min-w-0 whitespace-pre-wrap break-words text-sm leading-[1.85] font-normal text-slate-600 @sm:text-[0.9375rem] ${collapsible && !open ? "line-clamp-5" : ""}`}
      >
        {value}
      </p>
      {collapsible && (
        <button
          type="button"
          className="mt-2 inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-[#087c91] transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087c91]"
          aria-expanded={open}
          aria-controls={paragraphId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "نمایش کمتر" : "نمایش بیشتر"}
        </button>
      )}
    </>
  );
}

/**
 * Show only actual approved or legacy public content supplied by the API.
 * No fabricated badges, benefits, availability, ratings, or usage instructions.
 */
export function ProductContentSections({
  product,
  skuCode: selectedSkuCode,
}: {
  product: CommerceProduct;
  skuCode?: string;
}) {
  const content = product.content ?? null;
  const brand = text(content?.brand) ?? text(product.brand);
  const manufacturer = text(content?.manufacturer);
  const shortDescription = text(content?.shortDescription) ?? text(product.shortDescription);
  const description = text(content?.description) ?? text(product.description);
  const ingredients = text(content?.ingredients);
  const usage = text(content?.usageInstructions);
  const warnings = text(content?.warnings);
  const contraindications = text(content?.contraindications);
  const skuCode = text(selectedSkuCode) ?? text(product.skus[0]?.code);

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

  return (
    <div className="min-w-0 pb-3 [font-family:var(--font-vazirmatn)]">
      {shortDescription && (
        <p className="mb-4 max-w-[68ch] min-w-0 break-words text-sm leading-[1.8] text-slate-600 @sm:text-[0.9375rem]">
          {shortDescription}
        </p>
      )}

      {specs.length > 0 && (
        <dl
          className="mb-5 grid min-w-0 grid-cols-1 gap-x-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-1 @sm:grid-cols-2 @sm:px-4"
          aria-label="مشخصات محصول"
        >
          {specs.map((spec) => (
            <div key={spec.key} className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-200/70 py-3 last:border-b-0">
              <dt className="inline-flex shrink-0 items-center gap-1.5 text-xs leading-6 font-normal text-slate-500">
                <spec.icon size={14} aria-hidden="true" className="shrink-0 text-[#087c91]" />
                {spec.label}
              </dt>
              <dd
                dir={spec.ltr ? "ltr" : undefined}
                className="min-w-0 text-end text-[0.8125rem] leading-6 font-medium text-slate-800 [overflow-wrap:anywhere] @sm:text-sm"
              >
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {sections.length > 1 && (
        <nav
          className="store-content-nav sticky top-12 z-20 -mx-2 mb-1 flex min-w-0 snap-x snap-proximity gap-2 overflow-x-auto border-b border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="بخش‌های اطلاعات محصول"
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex min-h-11 shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-xl bg-slate-100 px-3 text-xs leading-5 font-medium text-slate-600 transition-colors hover:bg-slate-200/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087c91] aria-[current=true]:bg-[#087c91] aria-[current=true]:text-white @sm:text-[0.8125rem]"
            >
              {section.title}
            </a>
          ))}
        </nav>
      )}

      <div className="min-w-0">
        {sections.map(({ id, label, title, value, icon: Icon }) => {
          const safety = id === "product-warnings" || id === "product-contraindications";
          return (
            <section
              key={id}
              id={id}
              className={safety
                ? "my-3 min-w-0 scroll-mt-24 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-3.5 @sm:p-4"
                : "min-w-0 scroll-mt-24 border-b border-slate-200/70 py-4 last:border-b-0 @sm:py-5"}
              aria-label={label}
            >
              <h3
                data-product-info-heading
                className={`flex min-w-0 items-center gap-2 text-[0.9375rem] leading-7 font-semibold @sm:text-base ${safety ? "text-amber-900" : "text-slate-900"}`}
              >
                <span
                  className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl ${safety ? "bg-amber-100 text-amber-800" : "bg-teal-50 text-[#087c91]"}`}
                >
                  <Icon size={17} aria-hidden="true" />
                </span>
                {title}
              </h3>
              <div className="mt-2">
                <SectionBody id={id} value={value} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
