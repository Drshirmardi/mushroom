"use client";

import Link from "next/link";
import { ProductImage } from "./product-image";
import type { RecentProduct } from "../../stores/recently-viewed";
import { ProductPrice } from "./store-ui";

/** Compact display-only card for the recently-viewed rail. */
export function RecentCard({ item }: { item: RecentProduct }) {
  const href = `/store/products/${encodeURIComponent(item.productId)}`;
  return <article className="store-recent" aria-label={item.title}>
    <Link href={href} className="store-recent__media" aria-label={`مشاهدهٔ ${item.title}`}>
      <ProductImage src={item.imageUrl ?? null} alt="" />
    </Link>
    <div className="store-recent__body">
      <Link href={href} className="store-recent__title"><h3>{item.title}</h3></Link>
      <ProductPrice amount={item.price} />
    </div>
  </article>;
}
