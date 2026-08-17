"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { formatPrice } from "@/lib/format";

const TRANSACTIONS = [
  { label: "پرداخت ویزیت - دکتر شیرمردی", amount: -250000, date: "۱۰ مرداد", type: "out" },
  { label: "شارژ کیف پول", amount: 500000, date: "۸ مرداد", type: "in" },
  { label: "خرید روغن ماساژ", amount: -185000, date: "۵ مرداد", type: "out" },
];

export default function WalletPage() {
  const router = useRouter();
  return (
    <div>
      <PageHeader title="کیف پول" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-primary rounded-3xl p-6 text-white relative overflow-hidden"><div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-16 -translate-y-16" /><p className="text-white/70 text-sm mb-1">موجودی کیف پول</p><p className="text-4xl font-black">{formatPrice(500000)} <span className="text-base font-semibold">تومان</span></p><div className="flex gap-3 mt-5"><button className="flex-1 bg-white/20 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-1.5"><Plus size={15} />شارژ</button><button className="flex-1 bg-white/20 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-1.5"><ArrowLeft size={15} />انتقال</button></div></div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">تراکنش‌های اخیر</p>
          {TRANSACTIONS.map((t, i) => <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0"><div><p className="text-sm font-semibold text-foreground">{t.label}</p><p className="text-xs text-muted-foreground mt-0.5">{t.date}</p></div><span className={`text-sm font-black ${t.type === "in" ? "text-green-600" : "text-red-600"}`}>{t.type === "in" ? "+" : "-"}{formatPrice(Math.abs(t.amount))}</span></div>)}
        </div>
      </div>
    </div>
  );
}
