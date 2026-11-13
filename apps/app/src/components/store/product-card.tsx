'use client';

import Link from 'next/link';
import { StoreIcon } from './store-icon';

import { Button } from '../ui/button';
import type { CommerceProduct } from '../../lib/commerce-catalog-api';
import { formatPrice, toP } from '../../lib/format';
import { productImageUrl } from '../../lib/product-image';
import { ProductImage } from './product-image';
import { TomanIcon } from './toman-icon';

type Props = {
  product: CommerceProduct;
  skuOverride?: CommerceProduct['skus'][number];
  saved: boolean;
  inCart: boolean;
  busy: boolean;
  onFavorite: (skuId: string) => void;
  showFavorite?: boolean;
};

type InstallmentOffer = { count: number; amountToman: string };
type PriceOffer = { previous: bigint; percent: number };

/** Present only after the catalog API sends both installment fields. */
function installmentOffer(product: CommerceProduct): InstallmentOffer | null {
  const source = product as CommerceProduct & {
    installmentCount?: unknown;
    installmentAmountToman?: unknown;
  };
  const count = source.installmentCount;
  const amount = source.installmentAmountToman;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 2 || count > 36) return null;
  if (typeof amount !== 'string' || !/^\d+$/.test(amount) || amount === '0') return null;
  return { count, amountToman: amount };
}

/** Present only when a previous price higher than the current one is on the SKU. */
function priceOffer(sku: CommerceProduct['skus'][number]): PriceOffer | null {
  const previousText = (sku as { compareAtPriceToman?: unknown }).compareAtPriceToman;
  if (typeof previousText !== 'string' || !/^\d+$/.test(previousText)) return null;
  const previous = BigInt(previousText);
  const current = BigInt(sku.currentPriceToman);
  if (previous <= current) return null;
  const percent = Number(((previous - current) * 100n) / previous);
  if (percent < 1) return null;
  return { previous, percent };
}

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

  const href = `/store/products/${encodeURIComponent(product.id)}?sku=${encodeURIComponent(sku.id)}`;
  const variant = sku.title?.trim();
  const name = variant && !product.title.includes(variant) ? `${product.title} - ${variant}` : product.title;
  const merchant = product.brand?.trim() || product.category?.name || '';
  const installment = installmentOffer(product);
  const offer = priceOffer(sku);

  return (
    <article
      data-product-id={product.id}
      aria-busy={busy || undefined}
      className="store-product"
    >
      <div className="store-product__media">
        <Link href={href} aria-label={`مشاهدهٔ ${product.title}`} className="store-product__media-link">
          <ProductImage
            src={productImageUrl(product)}
            alt=""
            width={320}
            height={320}
            className="store-product__image"
          />
        </Link>

        {installment && (
          <div className="store-product__installment">
            <div className="store-product__installment-count">
              <bdi dir="ltr">{toP(installment.count)}</bdi>
              <small>قسط</small>
            </div>
            <div className="store-product__installment-amount">
              <bdi dir="ltr">{formatPrice(BigInt(installment.amountToman))}</bdi>
              <small>تومانی</small>
            </div>
          </div>
        )}

        {showFavorite && (
          <Button
            variant="ghost"
            className="store-product__favorite"
            disabled={busy}
            aria-label={`${saved ? 'حذف از' : 'افزودن به'} علاقه‌مندی‌ها: ${product.title}`}
            aria-pressed={saved}
            onClick={() => onFavorite(sku.id)}
          >
            <StoreIcon name={saved ? 'heartBold' : 'heart'} size={18} />
          </Button>
        )}

        {inCart && (
          <span className="store-product__incart">
            <StoreIcon name="check" size={12} />
            در سبد
          </span>
        )}
      </div>

      <div className="store-product__body">
        {merchant && (
          <p className="store-product__merchant">
            <StoreIcon name="store" size={16} />
            <span>{merchant}</span>
          </p>
        )}

        <Link href={href} className="store-product__title">
          <h2>{name}</h2>
        </Link>

        <div className="store-product__pricebox">
          {offer && (
            <div className="store-product__price-was">
              <span className="store-product__off">
                <bdi dir="ltr">{toP(offer.percent)} %</bdi>
              </span>
              <del>
                <bdi dir="ltr">{formatPrice(offer.previous)}</bdi>
              </del>
            </div>
          )}
          <p className="store-product__price-now">
            <bdi dir="ltr">{formatPrice(BigInt(sku.currentPriceToman))}</bdi>
            <TomanIcon />
            <span className="sr-only">تومان</span>
          </p>
        </div>
      </div>
    </article>
  );
}
