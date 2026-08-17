"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MONTHLY_REV, WEEKLY_REV } from "@/data/revenue";
import type { RevenuePoint } from "@/data/revenue";
import { fm, p } from "@/lib/utils";

export function RevenuePage() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const data: RevenuePoint[] = period === "monthly" ? MONTHLY_REV : WEEKLY_REV;
  const xKey = period === "monthly" ? "month" : "day";
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[{ label: "کل درآمد ماه", value: "۸۴.۵ م", sub: "تومان" }, { label: "درآمد ویزیت", value: "۶۲.۵ م", sub: "حضوری + آنلاین" }, { label: "درآمد فروشگاه", value: "۲۲ م", sub: "فروش محصولات" }, { label: "میانگین ویزیت", value: "۸۵۰,۰۰۰", sub: "تومان" }].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4"><TrendingUp size={20} /></div>
            <p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.label}</p><p className="text-[0.68rem] text-muted-foreground/60">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold">نمودار درآمد</h2>
          <div className="flex gap-1 bg-secondary rounded-xl p-1">
            {(["weekly", "monthly"] as const).map(t => <button key={t} onClick={() => setPeriod(t)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>{t === "weekly" ? "هفتگی" : "ماهانه"}</button>)}
          </div>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => (v / 1000000).toFixed(0) + "م"} tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number, n: string) => [fm(v), n === "inPerson" ? "حضوری" : n === "online" ? "آنلاین" : "فروشگاه"]} contentStyle={{ fontFamily: "var(--font-vazirmatn),sans-serif", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="inPerson" fill="#1B5E42" radius={[4, 4, 0, 0]} />
              <Bar dataKey="online" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              <Bar dataKey="store" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[{ title: "پرتقاضاترین خدمات", items: [["طب سوزنی کمر", 45, 38], ["طب سوزنی سردرد", 28, 24], ["طب سوزنی هورمونی", 22, 18], ["طب سوزنی زانو", 18, 15]] }, { title: "پرفروش‌ترین محصولات", items: [["روغن طب سوزنی", 34, 28], ["چای گیاهی", 29, 24], ["پچ حرارتی", 21, 17], ["بالشت طبی", 16, 13]] }].map(sec => (
          <div key={sec.title} className="bg-card border border-border rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">{sec.title}</h3></div>
            <div className="p-5 space-y-4">
              {sec.items.map(([name, count, pct], i) => (
                <div key={i}><div className="flex items-center justify-between mb-1.5 text-sm"><span className="font-medium">{name}</span><div className="flex gap-3"><span className="text-muted-foreground text-xs">{p(count as number)} مورد</span><span className="font-bold">{p(pct as number)}٪</span></div></div><div className="h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: ["#1B5E42", "#7C3AED", "#F97316", "#0891B2"][i] }} /></div></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
