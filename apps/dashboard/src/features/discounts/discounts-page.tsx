"use client";

import { Plus } from "lucide-react";
import { p } from "@/lib/utils";

interface Coupon {
  code: string;
  type: string;
  value: string;
  used: number;
  limit: number;
  expiry: string;
  active: boolean;
}

export function DiscountsPage() {
  const coupons: Coupon[] = [
    { code: "WELCOME20", type: "درصدی", value: "۲۰٪", used: 12, limit: 50, expiry: "۱۴۰۳/۰۶/۳۱", active: true },
    { code: "ACUPUNEW", type: "مبلغ ثابت", value: "۵۰,۰۰۰ت", used: 5, limit: 20, expiry: "۱۴۰۳/۰۵/۱۵", active: true },
    { code: "SUMMER15", type: "درصدی", value: "۱۵٪", used: 20, limit: 20, expiry: "۱۴۰۳/۰۴/۳۱", active: false },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex justify-end"><button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Plus size={16} />کد تخفیف جدید</button></div>
      <div className="grid grid-cols-3 gap-5">
        {coupons.map(c => (
          <div key={c.code} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-mono text-sm font-bold">{c.code}</div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{c.active ? "فعال" : "غیرفعال"}</span>
            </div>
            <div className="text-2xl font-bold mb-1">{c.value}</div>
            <p className="text-xs text-muted-foreground mb-4">{c.type}</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>استفاده:</span><span className="font-semibold text-foreground">{p(c.used)} / {p(c.limit)}</span></div>
              <div className="flex justify-between"><span>انقضا:</span><span className="font-semibold text-foreground">{c.expiry}</span></div>
            </div>
            <div className="h-1.5 bg-secondary rounded-full mt-3 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(c.used / c.limit) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
