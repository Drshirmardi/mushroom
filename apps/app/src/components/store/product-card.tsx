"use client";

import Link from "next/link";
import { Check, Heart } from "lucide-react";
import { Button } from "../ui/button";
import type { CommerceProduct } from "../../lib/commerce-catalog-api";
import { productImageUrl } from "../../lib/product-image";
import { ProductImage } from "./product-image";
import { ProductPrice } from "./store-ui";

type Props = {
  product: CommerceProduct;
  skuOverride?: CommerceProduct["skus"][number];
  saved: boolean;
  inCart: boolean;
  busy: boolean;
  onFavorite: (skuId: string) => void;
};

export function ProductCard({ product, skuOverride, saved, inCart, busy, onFavorite }: Props) {
  const sku = skuOverride ?? product.skus[0];
  if (!sku) return null;
  const href = `/store/products/${encodeURIComponent(product.id)}`;
  return <article className="store-product" aria-busy={busy || undefined}>
    <div className="store-product__media">
      <Link href={href} className="store-product__media-link" aria-label={`مشاهدهٔ ${product.title}`}>
        <ProductImage src={productImageUrl(product)} alt="" width={300} height={300} className="store-product__image" />
      </Link>
      <Button variant="ghost" className="store-product__favorite" disabled={busy}
        aria-label={`${saved ? "حذف از" : "افزودن به"} علاقه‌مندی‌ها: ${product.title}`}
        aria-pressed={saved} onClick={() => onFavorite(sku.id)}>
        <Heart aria-hidden="true" size={20} fill={saved ? "currentColor" : "none"} />
      </Button>
      {inCart && <span className="store-product__incart"><Check aria-hidden="true" size={12} />در سبد</span>}
    </div>
    <div className="store-product__body">
      <Link href={href} className="store-product__title"><h2>{product.title}</h2></Link>
      <ProductPrice amount={Number(sku.currentPriceToman)} />
    </div>
  </article>;
}
