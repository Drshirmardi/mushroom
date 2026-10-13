import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { formatPrice, toP } from "../../lib/format";

export function StoreHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="store-page-header"><Button variant="ghost" className="store-icon-button" onClick={onBack} aria-label="بازگشت"><ArrowRight aria-hidden="true" size={22} /></Button><h1>{title}</h1></header>;
}

export function ProductPrice({ amount, large = false }: { amount: number; large?: boolean }) {
  return <p className={`store-price ${large ? "store-price--large" : ""}`}><bdi dir="ltr">{formatPrice(amount)}</bdi><span>تومان</span></p>;
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

export function CartItem({ item, busy, onChange }: { item: { name: string; productId: string; price: number; qty: number }; busy: boolean; onChange: (quantity: number) => void }) {
  return <article className="store-cart-item" aria-busy={busy || undefined}>
    <div className="store-cart-item__heading"><span className="store-cart-item__media" aria-hidden="true"><ShoppingBag size={24} /></span><div><Link href={`/store/products/${encodeURIComponent(item.productId)}`}><h2>{item.name}</h2></Link><ProductPrice amount={item.price} /></div></div>
    <div className="store-cart-item__controls"><QuantityControl value={item.qty} min={0} busy={busy} label={item.name} onChange={onChange} /><span className="store-cart-item__status" role="status">{busy ? "در حال به‌روزرسانی…" : ""}</span></div>
  </article>;
}
