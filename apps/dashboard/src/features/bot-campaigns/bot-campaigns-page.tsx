"use client";

import { Edit, Eye, Plus } from "lucide-react";
import { p } from "@/lib/utils";

interface Campaign {
  name: string;
  target: string;
  sent: string;
  opens: string;
  clicks: string;
  status: string;
}

export function BotCampaignsPage() {
  const campaigns: Campaign[] = [
    { name: "کاربران مزاج دموی — روغن طبی", target: "مزاج: دموی", sent: p(1240), opens: "۶۸٪", clicks: "۲۴٪", status: "تکمیل" },
    { name: "کاربران بدون خرید ۳۰ روز", target: "بدون خرید اخیر", sent: p(580), opens: "۵۲٪", clicks: "۱۸٪", status: "تکمیل" },
    { name: "پیشنهاد ویژه مزاج صفراوی", target: "مزاج: صفراوی", sent: "—", opens: "—", clicks: "—", status: "پیش‌نویس" },
    { name: "یادآوری نوبت بعدی", target: "دارای نوبت آینده", sent: p(87), opens: "۸۵٪", clicks: "۴۵٪", status: "فعال" },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex justify-end"><button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Plus size={16} />کمپین جدید</button></div>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{["نام کمپین", "هدف", "ارسال", "نرخ باز", "کلیک", "وضعیت", "اقدام"].map(h => <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="px-5 py-4 text-sm font-semibold">{c.name}</td>
                <td className="px-5 py-4"><span className="text-[0.65rem] bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">{c.target}</span></td>
                <td className="px-5 py-4 text-sm font-bold">{c.sent}</td>
                <td className="px-5 py-4 text-sm text-emerald-600 font-medium">{c.opens}</td>
                <td className="px-5 py-4 text-sm text-primary font-bold">{c.clicks}</td>
                <td className="px-5 py-4"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${c.status === "فعال" ? "bg-emerald-100 text-emerald-700" : c.status === "تکمیل" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{c.status}</span></td>
                <td className="px-5 py-4"><div className="flex gap-1"><button className="p-1.5 hover:bg-secondary rounded-lg"><Eye size={13} className="text-muted-foreground" /></button><button className="p-1.5 hover:bg-secondary rounded-lg"><Edit size={13} className="text-muted-foreground" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold mb-4">کمپین جدید — هدف‌گذاری هوشمند</h3>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="text-xs text-muted-foreground mb-1.5 block">فیلتر مزاج</label><select className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none"><option>همه</option><option>دموی</option><option>صفراوی</option><option>بلغمی</option><option>سوداوی</option></select></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">آخرین خرید</label><select className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none"><option>هر زمان</option><option>۳۰ روز اخیر</option><option>بیش از ۳۰ روز</option><option>هرگز</option></select></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">پلتفرم</label><select className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none"><option>همه</option><option>Telegram</option><option>Bale</option><option>Rubika</option></select></div>
        </div>
        <div className="mt-4"><label className="text-xs text-muted-foreground mb-1.5 block">متن پیام کمپین</label><textarea rows={3} className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none resize-none" placeholder="محصول جدید مناسب مزاج شما ..." /></div>
        <div className="flex gap-2 mt-3"><button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold">ارسال کمپین</button><button className="px-4 py-2 border border-border rounded-xl text-sm font-semibold">پیش‌نمایش</button></div>
      </div>
    </div>
  );
}
