"use client";

import Link from "next/link";
import { resolveProductImage, useProductImageStore } from "../../stores/product-images";
import type { RecentProduct } from "../../stores/recently-viewed";
import { ProductPrice } from "./store-ui";

/** Compact display-only card for the recently-viewed rail. */
export function RecentCard({ item }: { item: RecentProduct }) {
  const overrides = useProductImageStore((state) => state.overrides);
  const href = `/store/products/${encodeURIComponent(item.productId)}`;
  return <article className="store-recent" aria-label={item.title}>
    <Link href={href} className="store-recent__media" aria-label={`مشاهدهٔ ${item.title}`}>
      <img src={resolveProductImage(item.productId, overrides)} alt="" loading="lazy" draggable={false} />
    </Link>
    <div className="store-recent__body">
      <Link href={href} className="store-recent__title"><h3>{item.title}</h3></Link>
      <ProductPrice amount={item.price} />
    </div>
  </article>;
}
