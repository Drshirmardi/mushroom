"use client";

import { useState } from "react";
import { Eye, MessageSquare, ShoppingBag, Star, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CRM_CUSTOMERS } from "@/data/store";
import { Avatar, StatusBadge } from "@/components/shared";
import { fm, p } from "@/lib/utils";

const TYPE_COLOR: Record<string, string> = {
  "VIP": "bg-amber-100 text-amber-700",
  "بازگشتی": "bg-blue-100 text-blue-700",
  "جدید": "bg-emerald-100 text-emerald-700",
  "بالقوه": "bg-violet-100 text-violet-700",
};

export function StoreCrmPage() {
  const [filter, setFilter] = useState("همه");
  const types = ["همه", "VIP", "بازگشتی", "جدید", "بالقوه"];
  const filtered = filter === "همه" ? CRM_CUSTOMERS : CRM_CUSTOMERS.filter(c => c.type === filter);
  const total = CRM_CUSTOMERS.reduce((s, c) => s + c.total, 0);
  const stats: { label: string; value: string; icon: LucideIcon; bg: string }[] = [
    { label: "کل مشتریان", value: p(CRM_CUSTOMERS.length), icon: Users, bg: "bg-primary/10 text-primary" },
    { label: "مشتریان VIP", value: p(CRM_CUSTOMERS.filter(c => c.type === "VIP").length), icon: Star, bg: "bg-amber-100 text-amber-700" },
    { label: "کل فروش", value: (total / 1000000).toFixed(1) + " م", icon: Wallet, bg: "bg-emerald-100 text-emerald-700" },
    { label: "میانگین خرید", value: fm(Math.round(total / CRM_CUSTOMERS.filter(c => c.orders > 0).length)), icon: ShoppingBag, bg: "bg-violet-100 text-violet-700" },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}><s.icon size={18} /></div>
            <p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {types.map(t => <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>{t}</button>)}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{["مشتری", "نوع", "سفارش‌ها", "مجموع خرید", "دسته محبوب", "آخرین فعالیت", "وضعیت", "اقدام"].map(h => <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><Avatar letter={c.avatar} size="sm" /><span className="text-sm font-semibold">{c.name}</span></div></td>
                <td className="px-5 py-4"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${TYPE_COLOR[c.type] ?? "bg-gray-100 text-gray-500"}`}>{c.type}</span></td>
                <td className="px-5 py-4 text-sm font-bold">{p(c.orders)}</td>
                <td className="px-5 py-4 text-sm font-semibold text-primary">{c.total > 0 ? fm(c.total) : "—"}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{c.cat}</td>
                <td className="px-5 py-4 text-xs text-muted-foreground">{c.last}</td>
                <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                <td className="px-5 py-4"><div className="flex gap-1"><button className="p-1.5 hover:bg-secondary rounded-lg"><Eye size={13} className="text-muted-foreground" /></button><button className="p-1.5 hover:bg-secondary rounded-lg"><MessageSquare size={13} className="text-muted-foreground" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
