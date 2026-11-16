"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { StoreIcon } from "./store-icon";
import { Button } from "../ui/button";
import { formatPrice, toP } from "../../lib/format";
import { HeartbeatLoader } from "../shared/heartbeat-loader";
import { LoadingState, type SkeletonVariant } from "../shared/skeletons";
import { ProductLoadingContent } from "./product-loading";
import { ProductImage } from "./product-image";

export function StoreHeader({ title, onBack, actions }: { title: string; onBack: () => void; actions?: ReactNode }) {
  return <header className="store-page-header"><Button variant="ghost" className="store-icon-button border-0 bg-transparent shadow-none hover:bg-transparent" onClick={onBack} aria-label="بازگشت"><StoreIcon name="arrowRight" size={22} /></Button><h1>{title}</h1>{actions && <div className="ms-auto flex shrink-0 items-center gap-2">{actions}</div>}</header>;
}

export function ProductPrice({ amount, large = false }: { amount: number | bigint; large?: boolean }) {
  return <p className={`store-price ${large ? "store-price--large" : ""}`}><bdi dir="ltr">{formatPrice(amount)}</bdi><span className="store-currency">تومان</span></p>;
}

export function QuantityControl({ value, min = 1, max = 100, busy = false, label, onChange }: { value: number; min?: number; max?: number; busy?: boolean; label: string; onChange: (value: number) => void }) {
  const removing = min === 0 && value === 1;
  return <div className="store-quantity" role="group" aria-label={`تعداد ${label}`} aria-busy={busy || undefined}>
    <Button variant="secondary" className="store-icon-button" disabled={busy || value <= min} aria-label={`${removing ? "حذف" : "کاهش تعداد"} ${label}`} onClick={() => onChange(value - 1)}><StoreIcon name={removing ? "delete" : "minus"} size={18} /></Button>
    <output aria-live="polite" aria-label="تعداد">{toP(value)}</output>
    <Button variant="secondary" className="store-icon-button" disabled={busy || value >= max} aria-label={`افزایش تعداد ${label}`} onClick={() => onChange(value + 1)}><StoreIcon name="plus" size={18} /></Button>
  </div>;
}

export function StoreState({ title, description, error = false, pending = false, variant = "list", action, onAction }: { title: string; description?: string; error?: boolean; pending?: boolean; variant?: SkeletonVariant; action?: string; onAction?: () => void }) {
  if (pending && variant === "product") return <ProductLoadingContent />;
  if (pending) return <LoadingState label={title} variant={variant} />;
  return <div className={`store-state ${error ? "store-state--error" : ""}`} role={error ? "alert" : "status"}>
    {!error && <StoreIcon name="shoppingBag" size={28} />}<h2>{title}</h2>{description && <p>{description}</p>}
    {action && <Button variant="secondary" onClick={onAction}>{action}</Button>}
  </div>;
}

export function CartItem({ item, busy, removing, onChange, onUndo }: { item: { name: string; productId: string; skuId?: string; variantTitle?: string | null; price: number | string; qty: number; imageUrl?: string | null }; busy: boolean; removing: boolean; onChange: (quantity: number) => void; onUndo: () => void }) {
  const href = `/store/products/${encodeURIComponent(item.productId)}${item.skuId ? `?sku=${encodeURIComponent(item.skuId)}` : ""}`;
  return <motion.article
    className="store-cart-item"
    aria-busy={busy || undefined}
    exit={{ x: "100%", opacity: 0, transition: { duration: 0.28, ease: "easeIn" } }}
  >
    <div className="store-cart-item__side">
      <Link href={href} className="store-cart-item__media" aria-label={`مشاهدهٔ ${item.name}`}>
        <ProductImage src={item.imageUrl ?? null} alt="" />
      </Link>
      <QuantityControl value={item.qty} min={0} busy={busy} label={item.name} onChange={onChange} />
    </div>
    <div className="store-cart-item__main">
      <Link href={href} className="store-cart-item__title min-w-0">
        <h2
          data-product-title
          className="line-clamp-2 break-words text-sm font-medium leading-snug text-foreground"
        >
          {item.name}
        </h2>
      </Link>
      {item.variantTitle && <p className="text-xs text-muted-foreground">{item.variantTitle}</p>}
      <div className="store-cart-item__price"><ProductPrice amount={BigInt(item.price) * BigInt(item.qty)} /></div>
      <span className="store-cart-item__status" role="status">{busy ? <><HeartbeatLoader />در حال به‌روزرسانی…</> : ""}</span>
    </div>
    {removing && <div className="store-cart-item__removing" role="alert">
      <p>کالای موردنظر شما حذف شد</p>
      <div className="store-undo-bar" aria-hidden="true"><span /></div>
      <button
        type="button"
        className="store-undo-cancel"
        onClick={onUndo}
        autoFocus
        onKeyDown={(event) => { if (event.key === "Escape") onUndo(); }}
      >
        <StoreIcon name="undo" size={16} />انصراف
      </button>
    </div>}
  </motion.article>;
}
