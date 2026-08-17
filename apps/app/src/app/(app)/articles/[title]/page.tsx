"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Bookmark, ChevronLeft, Clock, Share2 } from "lucide-react";

export default function ArticleDetailPage() {
  const router = useRouter();
  const params = useParams<{ title: string }>();
  const title = params?.title || "فواید آکوپانکچر برای کاهش استرس و اضطراب";
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <div className="relative">
        <img src="https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=390&h=220&fit=crop&auto=format" alt="مقاله" className="w-full h-52 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 right-4"><button onClick={() => router.back()} className="w-9 h-9 bg-white/90 rounded-xl flex items-center justify-center"><ChevronLeft size={20} style={{ transform: "rotate(180deg)" }} /></button></div>
        <div className="absolute bottom-3 left-4 flex gap-2">
          <button onClick={() => setSaved(s => !s)} className={`w-9 h-9 rounded-xl flex items-center justify-center ${saved ? "bg-primary text-white" : "bg-white/90"}`}><Bookmark size={18} className={saved ? "fill-white" : ""} /></button>
          <button className="w-9 h-9 bg-white/90 rounded-xl flex items-center justify-center"><Share2 size={18} /></button>
        </div>
      </div>
      <div className="px-4 py-5 space-y-4 pb-8">
        <div className="flex items-center gap-2"><span className="bg-secondary text-primary text-xs font-bold px-3 py-1 rounded-full">درمان</span><span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={11} />۵ دقیقه مطالعه</span></div>
        <h1 className="text-xl font-bold text-foreground leading-relaxed">{title}</h1>
        <div className="flex items-center gap-3 py-3 border-y border-border">
          <div className="w-10 h-10 rounded-full overflow-hidden"><img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop" alt="دکتر" className="w-full h-full object-cover" /></div>
          <div><p className="text-sm font-bold text-foreground">دکتر سید ابوالفتح شیرمردی</p><p className="text-xs text-muted-foreground">متخصص طب سنتی</p></div>
          <span className="mr-auto text-xs text-muted-foreground">۱۰ مرداد</span>
        </div>
        {["آکوپانکچر یکی از قدیمی‌ترین روش‌های درمانی در طب سنتی چین است که قرن‌هاست برای کاهش درد و استرس استفاده می‌شود. این روش درمانی بر اساس نظریه جریان انرژی «چی» در بدن استوار است.",
          "تحقیقات علمی نشان داده‌اند که آکوپانکچر می‌تواند سطح کورتیزول را کاهش دهد و سیستم عصبی پاراسمپاتیک را فعال کند.",
          "بیماران پس از جلسات منظم، کیفیت خواب بهتر، اضطراب کمتر و رضایت بیشتر از زندگی گزارش می‌دهند."].map((p, i) => (
            <p key={i} className="text-sm text-foreground/80 leading-8">{p}</p>
          ))}
      </div>
    </div>
  );
}
