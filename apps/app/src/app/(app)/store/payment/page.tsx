"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, CreditCard, RotateCcw, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { formatPrice } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { cartTotal, useCartStore } from "@/stores/cart";

export default function PaymentPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  const total = cartTotal(useCartStore((s) => s.items));
  const clear = useCartStore((s) => s.clear);
  const [method, setMethod] = useState("wallet");
  const [loading, setLoading] = useState(false);
  const pay = () => { setLoading(true); setTimeout(() => { setLoading(false); clear(); navigateScreen("OrderSuccess"); }, 2000); };
  return (
    <div>
      <PageHeader title="پرداخت" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-primary/5 rounded-2xl p-4 text-center border border-primary/20"><p className="text-sm text-muted-foreground mb-1">مبلغ قابل پرداخت</p><p className="text-3xl font-black text-primary">{formatPrice(total)} <span className="text-base font-semibold">تومان</span></p></div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">روش پرداخت</p>
          {[{ id: "wallet", icon: Wallet, label: "کیف پول", sub: "موجودی: ۵۰۰,۰۰۰ تومان" }, { id: "card", icon: CreditCard, label: "کارت بانکی", sub: "درگاه شاپرک" }].map(m => <button key={m.id} onClick={() => setMethod(m.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border mb-2 last:mb-0 transition-all ${method === m.id ? "bg-accent border-primary/30" : "border-border"}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method === m.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}><m.icon size={18} /></div><div className="flex-1 text-right"><p className="text-sm font-bold text-foreground">{m.label}</p><p className="text-xs text-muted-foreground">{m.sub}</p></div>{method === m.id && <Check size={16} className="text-primary" strokeWidth={2.5} />}</button>)}
        </div>
        <button onClick={pay} disabled={loading} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20 flex items-center justify-center gap-2">
          {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RotateCcw size={18} /></motion.div> : `پرداخت ${formatPrice(total)} تومان`}
        </button>
      </div>
    </div>
  );
}
