"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { fm } from "@/lib/utils";

export function WalletTab() {
  const [showAdd, setShowAdd] = useState(false);
  const txns = [
    { type: "افزایش", amount: 500000, reason: "واریز توسط پزشک", date: "۱۴۰۳/۰۴/۱۰" },
    { type: "کاهش", amount: -245000, reason: "خرید محصول", date: "۱۴۰۳/۰۴/۱۲" },
    { type: "افزایش", amount: 1000000, reason: "پرداخت بیمار", date: "۱۴۰۳/۰۴/۱۴" },
    { type: "کاهش", amount: -850000, reason: "ویزیت حضوری", date: "۱۴۰۳/۰۴/۱۵" },
  ];
  const balance = txns.reduce((s, t) => s + t.amount, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-primary rounded-2xl p-5 text-white"><p className="text-sm text-white/70 mb-1">موجودی کیف پول</p><p className="text-2xl font-bold">{fm(balance)}</p></div>
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground mb-1">کل واریزی</p><p className="text-lg font-bold text-emerald-600">{fm(1500000)}</p></div>
          <div className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground mb-1">کل برداشت</p><p className="text-lg font-bold text-red-500">{fm(1095000)}</p></div>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90"><Plus size={15} />افزایش موجودی</button>
        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-secondary"><ArrowDownRight size={15} />کاهش موجودی</button>
      </div>
      {showAdd && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-3">افزایش موجودی دستی</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">مبلغ (تومان)</label><input className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">دلیل</label><input className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none" /></div>
          </div>
          <div className="flex gap-2"><button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold">ثبت</button><button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-semibold">انصراف</button></div>
        </div>
      )}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border"><h3 className="font-bold text-sm">تاریخچه تراکنش‌ها</h3></div>
        <div className="divide-y divide-border">
          {txns.map((t, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.amount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{t.amount > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</div>
              <div className="flex-1"><p className="text-sm font-semibold">{t.reason}</p><p className="text-xs text-muted-foreground">{t.date}</p></div>
              <span className={`text-sm font-bold ${t.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>{t.amount > 0 ? "+" : ""}{fm(Math.abs(t.amount))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
