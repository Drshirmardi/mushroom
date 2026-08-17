"use client";

import { useRouter } from "next/navigation";
import {
  Award,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatPrice, toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { cartTotal, useCartStore } from "@/stores/cart";
import type { CartItem } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  const cart = useCartStore((s) => s.items);
  const setItems = useCartStore((s) => s.setItems);
  const total = cartTotal(cart);

  const doctorItems = cart.filter((c) => c.doctorRec);
  const userItems = cart.filter((c) => !c.doctorRec);
  const updateQty = (id: string, delta: number) => setItems((prev) => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter((c) => c.qty > 0));

  const CartRow = ({ item }: { item: CartItem }) => (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted"><img src={`https://images.unsplash.com/${item.img}?w=112&h=112&fit=crop&auto=format`} alt={item.name} className="w-full h-full object-cover" /></div>
      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground leading-tight">{item.name}</p><p className="text-primary text-xs font-bold mt-0.5">{formatPrice(item.price)} تومان</p></div>
      <div className="flex items-center gap-1.5 bg-muted rounded-xl p-1"><button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg flex items-center justify-center"><Minus size={12} /></button><span className="w-5 text-center text-xs font-bold">{toP(item.qty)}</span><button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg flex items-center justify-center"><Plus size={12} /></button></div>
    </div>
  );

  if (cart.length === 0) return <div><PageHeader title="سبد خرید" onBack={() => router.back()} /><EmptyState icon={ShoppingCart} title="سبد خرید خالی است" desc="محصولات مورد نظر را اضافه کنید." action="رفتن به فروشگاه" onAction={() => router.back()} /></div>;
  return (
    <div>
      <PageHeader title={`سبد خرید (${toP(cart.length)})`} onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        {doctorItems.length > 0 && <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-4"><div className="flex items-center gap-2 mb-3"><Award size={16} className="text-primary" /><p className="text-sm font-bold text-primary">توصیه‌های دکتر</p></div>{doctorItems.map((item) => <CartRow key={item.id} item={item} />)}</div>}
        {userItems.length > 0 && <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">انتخاب شما</p>{userItems.map((item) => <CartRow key={item.id} item={item} />)}</div>}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">جمع کل</span><span className="font-bold text-foreground">{formatPrice(total)} تومان</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">هزینه ارسال</span><span className="font-bold text-green-600">رایگان</span></div>
          <div className="flex justify-between text-sm border-t border-border pt-2"><span className="font-bold text-foreground">قابل پرداخت</span><span className="font-black text-primary text-base">{formatPrice(total)} تومان</span></div>
        </div>
        <button onClick={() => navigateScreen("CheckoutScreen")} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">ادامه و تکمیل خرید</button>
      </div>
    </div>
  );
}
