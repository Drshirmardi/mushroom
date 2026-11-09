'use client';

import Link from 'next/link';
import { Check, Heart } from 'lucide-react';

import { Button } from '../ui/button';
import type { CommerceProduct } from '../../lib/commerce-catalog-api';
import { productImageUrl } from '../../lib/product-image';
import { ProductImage } from './product-image';
import { ProductPrice } from './store-ui';

type Props = {
  product: CommerceProduct;
  skuOverride?: CommerceProduct['skus'][number];
  saved: boolean;
  inCart: boolean;
  busy: boolean;
  onFavorite: (skuId: string) => void;
  showFavorite?: boolean;
};

export function ProductCard({
  product,
  skuOverride,
  saved,
  inCart,
  busy,
  onFavorite,
  showFavorite = true,
}: Props) {
  const sku = skuOverride ?? product.skus[0];

  if (!sku) return null;

  const href = `/store/products/${encodeURIComponent(
    product.id,
  )}?sku=${encodeURIComponent(sku.id)}`;

  const categoryHref = product.category
    ? `/store?view=all&category=${encodeURIComponent(product.category.id)}`
    : null;

  return (
    <article
      data-product-id={product.id}
      aria-busy={busy || undefined}
      className="
        store-product
        @container/card
        group
        relative flex h-full min-w-0 flex-col
        overflow-hidden rounded-xl border border-slate-200
        bg-white
        transition-colors duration-200
        hover:border-slate-300
        motion-reduce:transition-none
      "
    >
      {/* Product image */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-white">
        <Link
          href={href}
          aria-label={`مشاهدهٔ ${product.title}`}
          className="absolute inset-0 flex items-center justify-center p-0"
        >
          <ProductImage
            src={productImageUrl(product)}
            alt=""
            width={320}
            height={320}
            className="store-product__image block h-full w-full object-cover object-center"
          />
        </Link>

        {/* Wishlist */}
        {showFavorite && (
          <Button
            variant="ghost"
            className="
              store-product__favorite
              absolute end-2 top-2 z-10
              flex h-11 w-11 items-center justify-center
              rounded-xl
              border border-slate-200/80
              bg-white/95
              text-slate-500
              aria-pressed:text-rose-600
              focus-visible:outline-2
              focus-visible:outline-rose-600
            "
            disabled={busy}
            aria-label={`${saved ? 'حذف از' : 'افزودن به'} علاقه‌مندی‌ها: ${product.title}`}
            aria-pressed={saved}
            onClick={() => onFavorite(sku.id)}
          >
            <Heart
              aria-hidden="true"
              size={19}
              strokeWidth={1.8}
              fill={saved ? 'currentColor' : 'none'}
            />
          </Button>
        )}

        {/* Cart status */}
        {inCart && (
          <span
            className="
              absolute bottom-2 start-2 z-10
              inline-flex max-w-[calc(100%-1rem)]
              items-center gap-1
              rounded-lg
              bg-emerald-50/95
              px-2 py-1
              text-[10px] font-medium
              text-emerald-800
            "
          >
            <Check aria-hidden="true" size={12} />
            در سبد
          </span>
        )}
      </div>

      {/* Product information */}
      <div
        className="
          flex min-w-0 flex-1 flex-col
          gap-1.5
          p-2.5
          @min-[210px]/card:p-3
        "
      >
        {/* Product title */}
        <Link
          href={href}
          className="
            block min-w-0
            rounded-sm
            text-slate-800
            hover:text-sky-700
            focus-visible:outline-2
            focus-visible:outline-sky-600
          "
        >
          <h2
            className="
              line-clamp-2 min-h-[3.4em]
              text-[12px] leading-[1.7] font-medium
              [overflow-wrap:anywhere]
              @min-[210px]/card:text-[13px]
              @min-[260px]/card:text-sm
            "
          >
            {product.title}
          </h2>
        </Link>

        {/* Category */}
        {product.category?.name && categoryHref && (
          <Link
            href={categoryHref}
            className="
              block w-fit max-w-full
              truncate
              text-[11px] leading-5
              text-slate-500
              hover:text-sky-700
              focus-visible:outline-2
              focus-visible:outline-sky-600
            "
          >
            {product.category.name}
          </Link>
        )}

        {/* Selected SKU */}
        {sku.title && (
          <p
            title={sku.title}
            className="
              min-w-0 truncate
              text-[11px] leading-5
              text-slate-500
              @min-[210px]/card:text-xs
            "
          >
            {sku.title}
          </p>
        )}

        {/* Price */}
        <div
          className="
            mt-auto flex min-w-0
            flex-col justify-end
            border-t border-slate-100
            pt-2.5
          "
        >
          <ProductPrice amount={BigInt(sku.currentPriceToman)} />
        </div>
      </div>
    </article>
  );
}
