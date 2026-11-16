'use client';

import { useState } from 'react';
import { StoreIcon, type StoreIconName } from './store-icon';
import type { CommerceProduct } from '../../lib/commerce-catalog-api';

const text = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

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
        className={`max-w-[68ch] min-w-0 whitespace-pre-wrap break-words text-sm leading-[1.85] font-normal text-slate-600 @sm:text-[0.9375rem] ${collapsible && !open ? 'line-clamp-5' : ''}`}
      >
        {value}
      </p>
      {collapsible && (
        <button
          type="button"
          className="mt-2 inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-medium text-[var(--dp-brand)] transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-brand)]"
          aria-expanded={open}
          aria-controls={paragraphId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'نمایش کمتر' : 'نمایش بیشتر'}
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

  const specs: { key: string; label: string; value: string; ltr: boolean; icon: StoreIconName }[] = [
    ...(brand ? [{ key: 'brand', label: 'برند', value: brand, ltr: false, icon: 'star' as const }] : []),
    ...(manufacturer
      ? [{ key: 'manufacturer', label: 'تولیدکننده', value: manufacturer, ltr: false, icon: 'store' as const }]
      : []),
    ...(skuCode ? [{ key: 'sku', label: 'کد کالا', value: skuCode, ltr: true, icon: 'barcode' as const }] : []),
  ];

  const mainSpecs = specs.filter((spec) => spec.key !== 'sku');
  const skuSpec = specs.find((spec) => spec.key === 'sku');

  type ProductSection = { id: string; label: string; title: string; value: string; icon: StoreIconName };
  const sections: ProductSection[] = ([
    {
      id: 'product-about',
      label: 'درباره محصول',
      title: 'دربارهٔ محصول',
      value: description,
      icon: 'documentFile',
    },
    {
      id: 'product-ingredients',
      label: 'ترکیبات',
      title: 'ترکیبات',
      value: ingredients,
      icon: 'pillBox',
    },
    {
      id: 'product-usage',
      label: 'دستور مصرف',
      title: 'دستور مصرف',
      value: usage,
      icon: 'checklist',
    },
    {
      id: 'product-warnings',
      label: 'هشدارها',
      title: 'هشدارها',
      value: warnings,
      icon: 'errorTriangle',
    },
    {
      id: 'product-contraindications',
      label: 'موارد منع مصرف',
      title: 'موارد منع مصرف',
      value: contraindications,
      icon: 'errorTriangle',
    },
  ] as (Omit<ProductSection, 'value'> & { value: string | null })[]).filter(
    (section): section is ProductSection => section.value !== null,
  );

  return (
    <div className="min-w-0 pb-3 [font-family:var(--font-iranyekanx)]">
      {shortDescription && (
        <p className="mb-4 max-w-[68ch] min-w-0 break-words text-sm leading-[1.8] text-slate-600 @sm:text-[0.9375rem]">
          {shortDescription}
        </p>
      )}

      {specs.length > 0 && (
        <dl
          aria-label="مشخصات محصول"
          className="
      mb-5 w-full min-w-0 overflow-hidden
      rounded-[18px] border border-slate-200/80
      bg-white
      [font-family:var(--font-iranyekanx)]
    "
        >
          {mainSpecs.map((spec, index) => (
            <div
              key={spec.key}
              className={`
          flex min-w-0 flex-wrap items-center
          justify-between gap-x-3 gap-y-2
          px-3 py-3 sm:px-4
          ${index > 0 ? 'border-t border-slate-100' : ''}
        `}
            >
              <dt className="flex shrink-0 items-center gap-2 text-xs font-normal text-slate-500">
                <span
                  className="
              flex size-8 shrink-0 items-center justify-center
              rounded-[10px] bg-slate-100
              text-[var(--dp-brand)]
            "
                >
                  <StoreIcon name={spec.icon} size={16} />
                </span>
                {spec.label}
              </dt>

              <dd
                className="
            min-w-0 flex-1 text-end
            text-[13px] leading-6 font-medium
            text-slate-800
            [overflow-wrap:anywhere]
            sm:text-sm
          "
              >
                {spec.value}
              </dd>
            </div>
          ))}

          {skuSpec && (
            <div
              className={`
          flex min-w-0 flex-wrap items-center
          justify-between gap-x-3 gap-y-1
          bg-slate-50/70 px-3 py-2.5 sm:px-4
          ${mainSpecs.length > 0 ? 'border-t border-slate-100' : ''}
        `}
            >
              <dt className="text-[11px] leading-5 text-slate-400">کد کالا</dt>

              <dd
                dir="ltr"
                className="
            min-w-0 max-w-full
            text-[11px] leading-5
            font-normal text-slate-500
            [overflow-wrap:anywhere]
          "
              >
                {skuSpec.value}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="min-w-0">
        {sections.map(({ id, label, title, value, icon }) => {
          const safety = id === 'product-warnings' || id === 'product-contraindications';
          return (
            <section
              key={id}
              id={id}
              className={
                safety
                  ? 'my-3 min-w-0 scroll-mt-24 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-3.5 @sm:p-4'
                  : 'min-w-0 scroll-mt-24 border-b border-slate-200/70 py-4 last:border-b-0 @sm:py-5'
              }
              aria-label={label}
            >
              <h3
                data-product-info-heading
                className={`flex min-w-0 items-center gap-2 text-[0.9375rem] leading-7 font-medium @sm:text-base ${safety ? 'text-amber-900' : 'text-slate-900'}`}
              >
                <span
                  className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl ${safety ? 'bg-amber-100 text-amber-800' : 'bg-teal-50 text-[var(--dp-brand)]'}`}
                >
                  <StoreIcon name={icon} size={17} />
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
