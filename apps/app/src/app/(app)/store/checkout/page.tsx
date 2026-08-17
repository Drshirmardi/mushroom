"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { formatPrice } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { cartTotal, useCartStore } from "@/stores/cart";

export default function CheckoutPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  const total = cartTotal(useCartStore((s) => s.items));
  return (
    <div>
      <PageHeader title="تکمیل خرید" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">آدرس تحویل</p><div className="flex items-start gap-3 p-3 bg-muted rounded-xl"><MapPin size={16} className="text-primary flex-shrink-0 mt-0.5" /><p className="text-sm text-foreground flex-1">تهران، ولنجک، خیابان درخشنده، پلاک ۱۲</p><button className="text-xs text-primary font-bold">تغییر</button></div></div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">روش ارسال</p>
          {[{ label: "ارسال عادی پستی", sub: "۳-۵ روز کاری - رایگان", active: true }, { label: "ارسال سریع پیک", sub: "همان روز - ۲۵,۰۰۰ تومان", active: false }].map(m => <div key={m.label} className={`flex items-center gap-3 p-3 rounded-xl border mb-2 last:mb-0 ${m.active ? "border-primary/30 bg-accent" : "border-border"}`}><div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${m.active ? "border-primary" : "border-muted-foreground"}`}>{m.active && <div className="w-2 h-2 bg-primary rounded-full" />}</div><div><p className="text-sm font-bold text-foreground">{m.label}</p><p className="text-xs text-muted-foreground">{m.sub}</p></div></div>)}
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><div className="flex justify-between text-sm py-1.5 border-b border-border"><span className="text-muted-foreground">جمع سبد</span><span className="font-bold">{formatPrice(total)} تومان</span></div><div className="flex justify-between text-sm py-1.5"><span className="font-bold text-foreground">قابل پرداخت</span><span className="font-black text-primary">{formatPrice(total)} تومان</span></div></div>
        <button onClick={() => navigateScreen("PaymentScreen")} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">ادامه به درگاه پرداخت</button>
      </div>
    </div>
  );
}
