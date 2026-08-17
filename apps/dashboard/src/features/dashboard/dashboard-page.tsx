"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Video, Stethoscope, UserPlus, Package,
  Wallet, TrendingUp, Play, Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { APPTS } from "@/data/appointments";
import { ACTIVITY_FEED } from "@/data/activity";
import { NOTIFS, NOTIF_ICON_FALLBACK, NOTIF_ICON_MAP } from "@/data/notifications";
import {
  MONTHLY_REV, WEEKLY_REV, DAILY_REV,
  PIE_DATA, PIE_COLORS, DISEASE_DATA, CONSTITUTION_DATA,
} from "@/data/revenue";
import type { RevenuePoint } from "@/data/revenue";
import { Avatar, KpiCard, StatusBadge, TypeBadge } from "@/components/shared";
import { fm, p } from "@/lib/utils";

type Period = "today" | "week" | "month" | "year";

export function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("month");
  const chartData: RevenuePoint[] = period === "today" ? DAILY_REV : period === "week" ? WEEKLY_REV : MONTHLY_REV;
  const xKey = period === "today" ? "h" : period === "week" ? "day" : "month";

  const KPIS: {
    title: string; value: string; icon: LucideIcon; iconBg: string;
    trend?: "up" | "down"; trendVal?: string; sub?: string;
  }[] = [
    { title: "نوبت‌های امروز", value: p(12), icon: CalendarDays, iconBg: "bg-primary/10 text-primary", trend: "up", trendVal: "+۲" },
    { title: "ویزیت آنلاین", value: p(5), icon: Video, iconBg: "bg-violet-100 text-violet-600", trend: "up", trendVal: "+۱" },
    { title: "ویزیت حضوری", value: p(7), icon: Stethoscope, iconBg: "bg-teal-100 text-teal-600" },
    { title: "بیماران جدید", value: p(3), icon: UserPlus, iconBg: "bg-blue-100 text-blue-600", trend: "up", trendVal: "۳۳٪" },
    { title: "سفارش‌های جدید", value: p(8), icon: Package, iconBg: "bg-orange-100 text-orange-600", trend: "up", trendVal: "+۵" },
    { title: "درآمد امروز", value: "۴.۲م", icon: Wallet, iconBg: "bg-emerald-100 text-emerald-700", sub: "تومان", trend: "up", trendVal: "۱۸٪" },
    { title: "درآمد ماهانه", value: "۸۴.۵م", icon: TrendingUp, iconBg: "bg-primary/10 text-primary", sub: "تومان", trend: "up", trendVal: "۱۲٪" },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-sm text-muted-foreground">سه‌شنبه ۱۷ تیر ۱۴۰۳ — آنلاین</p>
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 shadow-sm">
          {([["today", "امروز"], ["week", "هفته"], ["month", "ماه"], ["year", "سال"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{l}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 xl:grid-cols-7 gap-4">
        {KPIS.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      {/* Schedule + Activity + Requests */}
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-2 bg-card rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">برنامه امروز</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg">{p(12)} نوبت</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5" style={{ maxHeight: 340 }}>
            {APPTS.map(apt => {
              const isCurrent = apt.status === "در حال انجام";
              return (
                <div key={apt.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isCurrent ? "bg-emerald-50 border border-emerald-200" : "hover:bg-secondary"}`}>
                  <span className={`w-12 text-center text-xs font-bold flex-shrink-0 ${isCurrent ? "text-emerald-700" : "text-foreground"}`}>{apt.time}</span>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${apt.status === "پایان یافته" ? "bg-gray-300" : apt.status === "در حال انجام" ? "bg-emerald-500" : apt.status === "تایید شده" ? "bg-blue-500" : apt.status === "در انتظار تایید" ? "bg-amber-500" : "bg-red-400"}`} />
                  <Avatar letter={apt.avatar} size="xs" />
                  <p className={`flex-1 text-xs font-medium truncate ${apt.status === "لغو شده" ? "line-through text-muted-foreground" : "text-foreground"}`}>{apt.patient}</p>
                  <TypeBadge type={apt.type} />
                  <StatusBadge status={apt.status} />
                  <div className="flex gap-0.5">
                    {apt.status !== "پایان یافته" && apt.status !== "لغو شده" && <button className="p-1 rounded-lg hover:bg-primary/10 text-primary"><Play size={12} /></button>}
                    <button className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><Eye size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="col-span-1 bg-card rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">فید فعالیت</h2>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 340 }}>
            {ACTIVITY_FEED.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}><item.icon size={13} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-snug">{item.text}</p>
                  <p className="text-[0.62rem] text-muted-foreground/60 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Requests */}
        <div className="col-span-1 bg-card rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">درخواست‌های جدید</h2>
            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">{p(3)}</span>
          </div>
          <div className="flex-1 p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 300 }}>
            {NOTIFS.filter(n => !n.read).map(r => {
              const { icon: Icon, bg } = NOTIF_ICON_MAP[r.type] ?? NOTIF_ICON_FALLBACK;
              return (
                <div key={r.id} className="flex gap-2.5 p-2.5 rounded-xl hover:bg-secondary cursor-pointer transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}><Icon size={14} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-snug truncate">{r.text}</p>
                    <p className="text-[0.62rem] text-muted-foreground/60 mt-0.5">{r.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-3 py-2.5 border-t border-border">
            <button onClick={() => router.push("/notifications")} className="w-full py-1.5 text-xs text-primary font-bold hover:bg-primary/5 rounded-xl transition-colors">مشاهده همه</button>
          </div>
        </div>
      </div>

      {/* Revenue chart + donut */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-card rounded-2xl shadow-sm border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div><h2 className="font-bold text-foreground">تحلیل درآمد</h2><p className="text-xs text-muted-foreground mt-0.5">بر اساس نوع خدمات</p></div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {[["#1B5E42", "حضوری"], ["#7C3AED", "آنلاین"], ["#F97316", "فروشگاه"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}</div>
              ))}
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  {[["ip", "#1B5E42"], ["on", "#7C3AED"], ["st", "#F97316"]].map(([id, c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.15} /><stop offset="95%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => (v / 1000000).toFixed(0) + "م"} tick={{ fontSize: 10, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number, n: string) => [fm(v), n === "inPerson" ? "حضوری" : n === "online" ? "آنلاین" : "فروشگاه"]} contentStyle={{ fontFamily: "var(--font-vazirmatn),sans-serif", borderRadius: 10, fontSize: 11 }} />
                <Area type="monotone" dataKey="inPerson" stroke="#1B5E42" strokeWidth={2} fill="url(#ip)" />
                <Area type="monotone" dataKey="online" stroke="#7C3AED" strokeWidth={2} fill="url(#on)" />
                <Area type="monotone" dataKey="store" stroke="#F97316" strokeWidth={2} fill="url(#st)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
            <h3 className="font-bold text-foreground text-sm mb-3">سهم درآمدی</h3>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={38} outerRadius={55} dataKey="value" stroke="none">
                  {PIE_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${p(v)}٪`, ""]} contentStyle={{ fontFamily: "var(--font-vazirmatn),sans-serif", borderRadius: 10, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-1">
              {PIE_DATA.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} /><span className="text-muted-foreground">{d.name}</span></div>
                  <span className="font-bold text-foreground">{p(d.value)}٪</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-3">
            <h3 className="font-bold text-foreground text-sm">آمار کلی</h3>
            {[["نرخ بازگشت", "۷۸٪", "↑"], ["میانگین درمان", "۴.۲ هفته", "—"], ["تکمیل برنامه", "۸۵٪", "↑"], ["میانگین سفارش", "۴۲۵,۰۰۰ت", "↑"]].map(([l, v, t]) => (
              <div key={l} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">{l}</span>
                <span className={`font-bold ${t === "↑" ? "text-emerald-600" : "text-foreground"}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disease + Constitution */}
      <div className="grid grid-cols-2 gap-6">
        {[{ title: "شایع‌ترین بیماری‌ها", data: DISEASE_DATA, color: "#1B5E42" }, { title: "شایع‌ترین مزاج‌ها", data: CONSTITUTION_DATA, color: "#7C3AED" }].map(sec => (
          <div key={sec.title} className="bg-card border border-border rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-foreground text-sm mb-4">{sec.title}</h3>
            <div className="space-y-3">
              {sec.data.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-foreground font-medium">{d.name}</span><span className="text-muted-foreground">{p(d.value)}٪</span></div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.value}%`, background: sec.color, opacity: 0.7 + i * 0.07 }} /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
