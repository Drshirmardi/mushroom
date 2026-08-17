"use client";

import { useState } from "react";
import { Eye, Truck } from "lucide-react";
import { ORDERS } from "@/data/store";
import { StatusBadge } from "@/components/shared";
import { fm, p } from "@/lib/utils";

export function OrdersPage() {
  const [filter, setFilter] = useState("همه");
  const statuses = ["همه", "در انتظار پرداخت", "در حال آماده‌سازی", "ارسال شده", "تحویل داده شده", "لغو شده"];
  const filtered = filter === "همه" ? ORDERS : ORDERS.filter(o => o.status === filter);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map(s => <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>{s}</button>)}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/40">{["شماره سفارش", "مشتری", "تاریخ", "تعداد", "مبلغ", "وضعیت", "اقدام"].map(h => <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={o.id} className={`border-b border-border last:border-0 hover:bg-secondary/20 ${i % 2 === 1 ? "bg-secondary/10" : ""}`}>
                <td className="px-5 py-4 text-sm font-bold text-primary">{o.id}</td>
                <td className="px-5 py-4 text-sm font-semibold">{o.patient}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{o.date}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{p(o.items)} محصول</td>
                <td className="px-5 py-4 text-sm font-bold">{fm(o.total)}</td>
                <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
                <td className="px-5 py-4"><div className="flex gap-1"><button className="p-1.5 hover:bg-secondary rounded-lg"><Eye size={13} className="text-muted-foreground" /></button><button className="p-1.5 hover:bg-secondary rounded-lg"><Truck size={13} className="text-muted-foreground" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
