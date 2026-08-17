"use client";

import { useRouter } from "next/navigation";
import { ClipboardList, MessageSquare, Plus, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BOTS } from "@/data/bots";
import { p } from "@/lib/utils";

export function BotCenterPage() {
  const router = useRouter();
  const stats: { label: string; value: string; icon: LucideIcon; bg: string }[] = [
    { label: "کل کاربران", value: p(45700), icon: Users, bg: "bg-primary/10 text-primary" },
    { label: "مکالمات فعال", value: p(284), icon: MessageSquare, bg: "bg-blue-100 text-blue-700" },
    { label: "ارزیابی تکمیل", value: p(1240), icon: ClipboardList, bg: "bg-violet-100 text-violet-700" },
    { label: "نرخ تبدیل", value: "۱۱٪", icon: TrendingUp, bg: "bg-emerald-100 text-emerald-700" },
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
      <div className="grid grid-cols-3 gap-5">
        {BOTS.map(bot => (
          <div key={bot.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl ${bot.color} flex items-center justify-center text-2xl`}>{bot.icon}</div>
                <div><p className="font-bold">{bot.name}</p><p className="text-xs text-muted-foreground">{bot.platform}</p></div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${bot.status === "فعال" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{bot.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[["کاربران", p(bot.users)], ["مکالمات", p(bot.convs)], ["تبدیل", bot.conv_rate]].map(([l, v]) => (
                <div key={l} className="bg-secondary/60 rounded-xl p-3 text-center"><p className="text-sm font-bold">{v}</p><p className="text-[0.62rem] text-muted-foreground">{l}</p></div>
              ))}
            </div>
            <p className="text-[0.65rem] text-muted-foreground mb-4">آخرین فعالیت: {bot.lastActivity}</p>
            <div className="flex gap-2">
              <button onClick={() => router.push("/bot-conversations")} className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-secondary">مکالمات</button>
              <button onClick={() => router.push("/bot-flows")} className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold">ویرایش جریان</button>
            </div>
          </div>
        ))}
        <button className="bg-card border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer min-h-[240px]">
          <Plus size={28} className="mb-2" />
          <p className="text-sm font-semibold">افزودن ربات جدید</p>
          <p className="text-xs mt-1">تلگرام، بله، روبیکا</p>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
          <h3 className="font-bold mb-4">پرسش‌های رایج کاربران</h3>
          <div className="space-y-3">
            {[["طب سوزنی برای کمردرد", "۳۴۲ بار"], ["چطور نوبت بگیرم؟", "۲۸۱ بار"], ["مزاج من چیست؟", "۲۴۰ بار"], ["محصولات ضد درد", "۱۹۸ بار"], ["قیمت ویزیت", "۱۷۲ بار"]].map(([q, c], i) => (
              <div key={i} className="flex justify-between items-center text-sm"><span className="font-medium">{q}</span><span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg">{c}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
          <h3 className="font-bold mb-4">موضوعات سلامت محبوب</h3>
          <div className="space-y-3">
            {[["کمردرد و ستون فقرات", 68, "#1B5E42"], ["سردرد و میگرن", 52, "#7C3AED"], ["سیستم تناسلی", 41, "#F97316"], ["اضطراب و افسردگی", 38, "#0891B2"], ["مشکلات گوارشی", 31, "#D97706"]].map(([l, v, c]) => (
              <div key={l as string}><div className="flex justify-between text-xs mb-1"><span>{l}</span><span className="font-bold">{p(v as number)}٪</span></div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v}%`, background: c as string }} /></div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
