"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check, CreditCard, RotateCcw, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { formatPrice, toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

function BookStep3() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigateScreen = useScreenNavigation();
  const [payMethod, setPayMethod] = useState("wallet");
  const [loading, setLoading] = useState(false);
  const handlePay = () => { setLoading(true); setTimeout(() => { setLoading(false); navigateScreen("BookSuccess"); }, 1800); };
  return (
    <div>
      <PageHeader title="تأیید و پرداخت" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-muted/60 rounded-2xl p-3 flex items-center gap-2"><div className="flex gap-1">{[1, 2, 3].map(s => <div key={s} className="w-6 h-1.5 rounded-full bg-primary" />)}</div><span className="text-xs text-muted-foreground">مرحله ۳ از ۳: پرداخت</span></div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-2">
          <p className="text-sm font-bold text-foreground">خلاصه نوبت</p>
          {[["پزشک", "دکتر سید ابوالفتح شیرمردی"], ["تاریخ", "یکشنبه ۱۳ مرداد"], ["ساعت", toP(searchParams.get("time") || "۱۰:۰۰")], ["نوع", "حضوری"]].map(([k, v]) => <div key={k} className="flex justify-between text-sm"><span className="text-muted-foreground">{k}</span><span className="font-semibold text-foreground">{v}</span></div>)}
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <p className="text-sm font-bold text-foreground mb-3">روش پرداخت</p>
          {[{ id: "wallet", label: "کیف پول", sub: "موجودی: ۵۰۰,۰۰۰ تومان", icon: Wallet }, { id: "card", label: "کارت بانکی", sub: "درگاه شاپرک", icon: CreditCard }].map(m => <button key={m.id} onClick={() => setPayMethod(m.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border mb-2 last:mb-0 transition-all ${payMethod === m.id ? "bg-accent border-primary/30" : "border-border"}`}><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${payMethod === m.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}><m.icon size={17} /></div><div className="flex-1 text-right"><p className="text-sm font-bold text-foreground">{m.label}</p><p className="text-xs text-muted-foreground">{m.sub}</p></div>{payMethod === m.id && <Check size={16} className="text-primary" strokeWidth={2.5} />}</button>)}
        </div>
        <div className="bg-primary/5 rounded-2xl p-4 flex items-center justify-between"><span className="text-sm font-bold text-foreground">مبلغ قابل پرداخت</span><span className="text-lg font-black text-primary">{formatPrice(250000)} تومان</span></div>
        <button onClick={handlePay} disabled={loading} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RotateCcw size={18} /></motion.div> : "پرداخت و ثبت نوبت"}
        </button>
      </div>
    </div>
  );
}

export default function BookStep3Page() {
  return (
    <Suspense fallback={null}>
      <BookStep3 />
    </Suspense>
  );
}
