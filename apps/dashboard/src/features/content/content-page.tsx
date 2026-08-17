"use client";

import { useState } from "react";
import { Edit, Eye, ImageIcon, PlayCircle, Plus, Send, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { p } from "@/lib/utils";

interface Article {
  title: string;
  status: string;
  date: string;
  views: string;
  cat: string;
}

interface Video {
  title: string;
  dur: string;
  views: string;
  status: string;
}

export function ContentPage() {
  const [cTab, setCTab] = useState<"articles" | "videos" | "banners" | "faq" | "push">("articles");
  const articles: Article[] = [
    { title: "۵ فایده طب سوزنی برای درد مزمن", status: "منتشرشده", date: "۱۴۰۳/۰۴/۱۰", views: p(1240), cat: "آموزشی" },
    { title: "طب سوزنی و بهبود کیفیت خواب", status: "منتشرشده", date: "۱۴۰۳/۰۳/۲۵", views: p(870), cat: "خواب" },
    { title: "آمادگی برای اولین جلسه", status: "پیش‌نویس", date: "۱۴۰۳/۰۴/۱۶", views: "—", cat: "راهنما" },
    { title: "مزاج دموی و درمان‌های توصیه‌شده", status: "منتشرشده", date: "۱۴۰۳/۰۴/۰۵", views: p(640), cat: "طب سنتی" },
  ];
  const videos: Video[] = [{ title: "حرکات کششی کمر", dur: "۸:۳۰", views: p(340), status: "منتشرشده" }, { title: "تمرین تنفس برای آرامش", dur: "۵:۱۵", views: p(180), status: "منتشرشده" }, { title: "آشنایی با طب سوزنی", dur: "۱۲:۰۰", views: p(520), status: "منتشرشده" }];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl p-1.5 w-fit shadow-sm">
        {([["articles", "مقالات"], ["videos", "ویدیوها"], ["banners", "بنرها"], ["faq", "سوالات"], ["push", "نوتیف پوش"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setCTab(id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${cTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>
      {cTab === "articles" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Plus size={16} />مقاله جدید</button></div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{["عنوان", "دسته", "وضعیت", "تاریخ", "بازدید", "اقدام"].map(h => <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {articles.map((a, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="px-5 py-4 text-sm font-semibold">{a.title}</td>
                    <td className="px-5 py-4"><span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-md">{a.cat}</span></td>
                    <td className="px-5 py-4"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{a.date}</td>
                    <td className="px-5 py-4 text-sm font-medium">{a.views}</td>
                    <td className="px-5 py-4"><div className="flex gap-1"><button className="p-1.5 hover:bg-secondary rounded-lg"><Edit size={13} className="text-muted-foreground" /></button><button className="p-1.5 hover:bg-secondary rounded-lg"><Eye size={13} className="text-muted-foreground" /></button><button className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-muted-foreground" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {cTab === "videos" && (
        <div className="grid grid-cols-3 gap-4">
          {videos.map((v, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md">
              <div className="h-36 bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center"><PlayCircle size={40} className="text-violet-500 opacity-60" /></div>
              <div className="p-4"><h3 className="font-bold text-sm mb-1">{v.title}</h3><div className="flex items-center gap-3 text-xs text-muted-foreground mb-2"><span>{v.dur}</span><span>{v.views} بازدید</span></div><StatusBadge status={v.status} /></div>
            </div>
          ))}
          <button className="bg-card border-2 border-dashed border-border rounded-2xl h-52 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer"><Plus size={24} className="mb-2" />آپلود ویدیو</button>
        </div>
      )}
      {cTab === "banners" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Plus size={16} />بنر جدید</button></div>
          <div className="grid grid-cols-2 gap-4">
            {[{ title: "بنر اصلی صفحه خانه", size: "۱۲۰۰×۴۰۰", status: "فعال" }, { title: "بنر بخش محصولات", size: "۸۰۰×۳۰۰", status: "فعال" }, { title: "بنر تخفیف ویژه", size: "۶۰۰×۲۰۰", status: "غیرفعال" }].map((b, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <div className="w-16 h-10 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0"><ImageIcon size={16} className="text-muted-foreground" /></div>
                <div className="flex-1"><p className="text-sm font-semibold">{b.title}</p><p className="text-xs text-muted-foreground">{b.size}</p></div>
                <StatusBadge status={b.status} />
                <button className="p-1.5 hover:bg-secondary rounded-lg"><Edit size={13} className="text-muted-foreground" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      {cTab === "faq" && (
        <div className="space-y-3 max-w-2xl">
          {[["طب سوزنی چقدر طول می‌کشد؟", "هر جلسه معمولاً ۳۰ تا ۶۰ دقیقه طول می‌کشد."], ["آیا طب سوزنی دردناک است؟", "سوزن‌های بسیار ظریف استفاده می‌شود و اکثر بیماران درد احساس نمی‌کنند."], ["چند جلسه برای نتیجه لازم است؟", "بسته به نوع بیماری، ۸ تا ۱۵ جلسه توصیه می‌شود."]].map(([q, a], i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between"><p className="font-semibold text-sm">{q}</p><div className="flex gap-1"><button className="p-1.5 hover:bg-secondary rounded-lg"><Edit size={12} className="text-muted-foreground" /></button><button className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={12} className="text-muted-foreground" /></button></div></div>
              <p className="text-sm text-muted-foreground mt-2">{a}</p>
            </div>
          ))}
          <button className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary hover:text-primary text-sm font-semibold"><Plus size={16} />سوال جدید</button>
        </div>
      )}
      {cTab === "push" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold">ارسال نوتیفیکیشن پوش</h3>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">عنوان</label><input className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">متن پیام</label><textarea rows={3} className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" /></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">مخاطبان</label><select className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none"><option>همه بیماران</option><option>بیماران فعال</option><option>بیمار خاص</option></select></div>
            <button className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Send size={14} />ارسال</button>
          </div>
        </div>
      )}
    </div>
  );
}
