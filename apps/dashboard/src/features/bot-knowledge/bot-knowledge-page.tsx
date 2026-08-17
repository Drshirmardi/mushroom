"use client";

import { Check, Cpu, Eye, FileText, Plus, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { p } from "@/lib/utils";

interface KnowledgeDoc {
  name: string;
  type: string;
  size: string;
  date: string;
  status: string;
  icon: string;
}

export function BotKnowledgePage() {
  const docs: KnowledgeDoc[] = [
    { name: "پروتکل‌های درمانی", type: "PDF", size: "۲.۴ مگ", date: "۱۴۰۳/۰۴/۱۰", status: "پردازش‌شده", icon: "📄" },
    { name: "مقالات پزشکی", type: "مجموعه", size: "۱۸ مقاله", date: "۱۴۰۳/۰۴/۰۵", status: "پردازش‌شده", icon: "📚" },
    { name: "اطلاعات محصولات", type: "Excel", size: "۸۴ محصول", date: "۱۴۰۳/۰۳/۲۰", status: "پردازش‌شده", icon: "📊" },
    { name: "سوالات متداول", type: "متن", size: "۱۲۰ سوال", date: "۱۴۰۳/۰۴/۱۲", status: "پردازش‌شده", icon: "❓" },
    { name: "راهنمای رژیم‌های غذایی", type: "PDF", size: "۱.۱ مگ", date: "۱۴۰۳/۰۴/۱۵", status: "در حال پردازش", icon: "📄" },
  ];
  const stats: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "اسناد آپلود‌شده", value: p(docs.length), icon: FileText },
    { label: "توکن‌های پردازش‌شده", value: p(124800), icon: Cpu },
    { label: "دقت پاسخ‌دهی", value: "۹۱٪", icon: Check },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><s.icon size={18} /></div>
            <div><p className="text-lg font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold">منابع دانش</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Plus size={15} />آپلود سند</button>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{["سند", "نوع", "حجم", "تاریخ", "وضعیت", "اقدام"].map(h => <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {docs.map((d, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="text-xl">{d.icon}</span><span className="text-sm font-semibold">{d.name}</span></div></td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{d.type}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{d.size}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{d.date}</td>
                <td className="px-5 py-4"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${d.status === "پردازش‌شده" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{d.status}</span></td>
                <td className="px-5 py-4"><div className="flex gap-1"><button className="p-1.5 hover:bg-secondary rounded-lg"><Eye size={13} className="text-muted-foreground" /></button><button className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-muted-foreground" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-sm mb-3">تست پایگاه دانش</h3>
        <div className="flex gap-3">
          <input placeholder="سوال آزمایشی بنویسید..." className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none" />
          <button className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold">پرسش</button>
        </div>
      </div>
    </div>
  );
}
