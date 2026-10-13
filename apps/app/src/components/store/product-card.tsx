import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "../ui/button";
import type { CommerceProduct } from "../../lib/commerce-catalog-api";
import { formatPrice } from "../../lib/format";

type Props = {
  product: CommerceProduct;
  saved: boolean;
  inCart: boolean;
  busy: boolean;
  authenticated: boolean;
  onAdd: (skuId: string) => void;
  onFavorite: (skuId: string) => void;
};

export function ProductCard({ product, saved, inCart, busy, authenticated, onAdd, onFavorite }: Props) {
  const sku = product.skus[0];
  if (!sku) return null;
  return <article className="store-product" aria-busy={busy || undefined}>
    <div className="store-product__media">
      <Link href={`/store/products/${encodeURIComponent(product.id)}`} className="store-product__media-link" aria-label={`مشاهدهٔ ${product.title}`}><span className="store-product__category">{product.category.name}</span></Link>
      <Button variant="secondary" className="store-product__favorite" disabled={busy}
        aria-label={`${saved ? "حذف از" : "افزودن به"} علاقه‌مندی‌ها: ${product.title}`}
        aria-pressed={saved} onClick={() => onFavorite(sku.id)}>
        <Heart aria-hidden="true" size={20} fill={saved ? "currentColor" : "none"} />
      </Button>
    </div>
    <div className="store-product__body">
      <Link href={`/store/products/${encodeURIComponent(product.id)}`} className="store-product__title"><h2>{product.title}</h2></Link>
      <p className="store-price"><bdi dir="ltr">{formatPrice(Number(sku.currentPriceToman))}</bdi><span>تومان</span></p>
      <Button busy={busy} aria-label={`افزودن به سبد: ${product.title}`} onClick={() => onAdd(sku.id)}>
        <ShoppingCart aria-hidden="true" size={18} /><span>{busy ? "در حال انجام…" : "افزودن"}</span>
      </Button>
      <p className="store-product__feedback" role="status">{busy ? "درخواست در حال انجام است…" : !authenticated ? "برای خرید وارد شوید" : inCart ? "در سبد خرید شما" : "قابل انتخاب"}</p>
    </div>
  </article>;
}
