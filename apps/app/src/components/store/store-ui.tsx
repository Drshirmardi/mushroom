"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, Minus, Plus, ShoppingBag, Store, Trash2, Undo2 } from "lucide-react";
import { Button } from "../ui/button";
import { formatPrice, toP } from "../../lib/format";
import { ProductImage } from "./product-image";
import { productExtras } from "../../stores/product-extras";
import { TomanIcon } from "./toman-icon";

export function StoreHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="store-page-header"><Button variant="ghost" className="store-icon-button" onClick={onBack} aria-label="بازگشت"><ArrowRight aria-hidden="true" size={22} /></Button><h1>{title}</h1></header>;
}

export function ProductPrice({ amount, large = false }: { amount: number; large?: boolean }) {
  return <p className={`store-price ${large ? "store-price--large" : ""}`}><bdi dir="ltr">{formatPrice(amount)}</bdi><TomanIcon /><span className="sr-only">تومان</span></p>;
}

export function QuantityControl({ value, min = 1, max = 100, busy = false, label, onChange }: { value: number; min?: number; max?: number; busy?: boolean; label: string; onChange: (value: number) => void }) {
  const removing = min === 0 && value === 1;
  return <div className="store-quantity" role="group" aria-label={`تعداد ${label}`} aria-busy={busy || undefined}>
    <Button variant="secondary" className="store-icon-button" disabled={busy || value <= min} aria-label={`${removing ? "حذف" : "کاهش تعداد"} ${label}`} onClick={() => onChange(value - 1)}>{removing ? <Trash2 aria-hidden="true" size={18} /> : <Minus aria-hidden="true" size={18} />}</Button>
    <output aria-live="polite" aria-label="تعداد">{toP(value)}</output>
    <Button variant="secondary" className="store-icon-button" disabled={busy || value >= max} aria-label={`افزایش تعداد ${label}`} onClick={() => onChange(value + 1)}><Plus aria-hidden="true" size={18} /></Button>
  </div>;
}

export function StoreState({ title, description, error = false, pending = false, action, onAction }: { title: string; description?: string; error?: boolean; pending?: boolean; action?: string; onAction?: () => void }) {
  return <div className={`store-state ${error ? "store-state--error" : ""}`} role={error ? "alert" : "status"}>
    {!error && !pending && <ShoppingBag aria-hidden="true" size={28} />}<h2>{title}</h2>{description && <p>{description}</p>}
    {pending && <div className="store-skeleton" aria-hidden="true"><span /><span /></div>}
    {action && <Button variant="secondary" onClick={onAction}>{action}</Button>}
  </div>;
}

export function CartItem({ item, busy, removing, onChange, onUndo }: { item: { name: string; productId: string; price: number; qty: number; imageUrl?: string | null }; busy: boolean; removing: boolean; onChange: (quantity: number) => void; onUndo: () => void }) {
  const seller = productExtras(item.productId).seller;
  const href = `/store/products/${encodeURIComponent(item.productId)}`;
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
      <Link href={href} className="store-cart-item__title"><h2>{item.name}</h2></Link>
      <p className="store-cart-item__seller"><Store size={14} aria-hidden="true" />{seller.name}{seller.verified && <BadgeCheck size={14} aria-hidden="true" />}</p>
      <div className="store-cart-item__price"><ProductPrice amount={item.price * item.qty} /></div>
      <span className="store-cart-item__status" role="status">{busy ? "در حال به‌روزرسانی…" : ""}</span>
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
        <Undo2 size={16} aria-hidden="true" />انصراف
      </button>
    </div>}
  </motion.article>;
}
