"use client";

import { ArrowUpRight, BarChart2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { BOT_DAILY } from "@/data/bots";
import { p } from "@/lib/utils";

export function BotAnalyticsPage() {
  const stats = [
    { label: "کل کاربران", value: p(45700), sub: "+۲۸۰ این هفته" },
    { label: "ارزیابی تکمیل", value: p(8420), sub: "۹۱٪ نرخ تکمیل" },
    { label: "تبدیل به نوبت", value: p(1240), sub: "۱۴.۷٪ نرخ تبدیل" },
    { label: "فروش از ربات", value: "۲۸.۵م", sub: "تومان" },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3"><div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><BarChart2 size={16} /></div><span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600"><ArrowUpRight size={12} />۱۸٪</span></div>
            <p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground mt-0.5">{s.label}</p><p className="text-[0.65rem] text-muted-foreground/60 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-bold">فعالیت روزانه ربات‌ها</h2></div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={BOT_DAILY} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: "var(--font-vazirmatn),sans-serif", borderRadius: 10, fontSize: 11 }} />
              <Bar dataKey="users" name="کاربران" fill="#1B5E42" radius={[4, 4, 0, 0]} />
              <Bar dataKey="assessments" name="ارزیابی" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bookings" name="نوبت" fill="#F97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sales" name="فروش" fill="#0891B2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-4">توزیع مزاج کاربران</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={[{ name: "دموی", value: 35 }, { name: "صفراوی", value: 28 }, { name: "بلغمی", value: 22 }, { name: "سوداوی", value: 15 }]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                {["#EF4444", "#F97316", "#3B82F6", "#8B5CF6"].map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${p(v)}٪`, ""]} contentStyle={{ fontFamily: "var(--font-vazirmatn),sans-serif", borderRadius: 10, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {[["دموی", "#EF4444", "۳۵٪"], ["صفراوی", "#F97316", "۲۸٪"], ["بلغمی", "#3B82F6", "۲۲٪"], ["سوداوی", "#8B5CF6", "۱۵٪"]].map(([l, c, v]) => (
              <div key={l} className="flex items-center gap-1.5 text-xs"><div className="w-2 h-2 rounded-full" style={{ background: c }} /><span className="text-muted-foreground flex-1">{l}</span><span className="font-bold">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-4">قیف تبدیل ربات</h3>
          <div className="space-y-3">
            {[["شروع مکالمه", p(45700), "100%", "#1B5E42"], ["تکمیل ارزیابی", p(8420), "18.4%", "#7C3AED"], ["مشاهده محصولات", p(5840), "12.8%", "#F97316"], ["کلیک خرید", p(2120), "4.6%", "#0891B2"], ["خرید نهایی", p(890), "1.9%", "#D97706"], ["رزرو نوبت", p(1240), "2.7%", "#EF4444"]].map(([l, v, pct, c]) => (
              <div key={l}><div className="flex items-center justify-between text-xs mb-1"><span className="font-medium">{l}</span><div className="flex gap-4"><span className="text-muted-foreground">{v}</span><span className="font-bold w-12 text-left">{pct}</span></div></div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: pct, background: c }} /></div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
