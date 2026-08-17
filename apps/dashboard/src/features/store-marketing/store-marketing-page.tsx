"use client";

import { Eye, ImageIcon, Package, ShoppingCart, Star, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MKTG_DAILY } from "@/data/marketing";
import { p } from "@/lib/utils";

export function StoreMarketingPage() {
  const stats: { label: string; value: string; icon: LucideIcon; bg: string; trend?: string }[] = [
    { label: "بازدیدکنندگان", value: p(3150), icon: Eye, bg: "bg-primary/10 text-primary", trend: "+۱۲٪" },
    { label: "بازدید محصول", value: p(9030), icon: Package, bg: "bg-blue-100 text-blue-700", trend: "+۸٪" },
    { label: "کلیک بنر", value: p(675), icon: ImageIcon, bg: "bg-violet-100 text-violet-700", trend: "+۲۳٪" },
    { label: "نرخ تبدیل", value: "۲.۸٪", icon: TrendingUp, bg: "bg-emerald-100 text-emerald-700", trend: "+۰.۵" },
    { label: "سبد رها شده", value: p(142), icon: ShoppingCart, bg: "bg-red-100 text-red-600", trend: "-۱۵٪" },
    { label: "بهترین محصول", value: "روغن طبی", icon: Star, bg: "bg-amber-100 text-amber-700" },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}><s.icon size={16} /></div>
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            {s.trend && <p className={`text-[0.65rem] font-semibold mt-0.5 ${s.trend.startsWith("-") ? "text-red-500" : "text-emerald-600"}`}>{s.trend}</p>}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-card border border-border rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-border"><h2 className="font-bold">ترافیک هفتگی فروشگاه</h2></div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={MKTG_DAILY} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontFamily: "var(--font-vazirmatn),sans-serif", borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="visitors" name="بازدیدکننده" fill="#1B5E42" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" name="کلیک" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="conv" name="تبدیل" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-4">پرفروش‌ترین محصولات</h3>
            <div className="space-y-3">
              {[["روغن طب سوزنی", 38, "#1B5E42"], ["چای گیاهی", 28, "#7C3AED"], ["پچ حرارتی", 21, "#F97316"], ["بالشت طبی", 13, "#0891B2"]].map(([n, v, c], i) => (
                <div key={i}><div className="flex justify-between text-xs mb-1"><span>{n}</span><span className="font-bold">{p(v as number)}٪</span></div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v}%`, background: c as string }} /></div></div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-3">منابع ترافیک</h3>
            {[["مستقیم", "۴۵٪"], ["ربات تلگرام", "۲۸٪"], ["پیامک", "۱۸٪"], ["سایر", "۹٪"]].map(([l, v]) => (
              <div key={l} className="flex justify-between text-xs py-1.5 border-b border-border last:border-0"><span className="text-muted-foreground">{l}</span><span className="font-bold">{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
