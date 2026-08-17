"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Edit, Eye, Plus, Trash2 } from "lucide-react";
import { BANNERS } from "@/data/store";
import type { Banner } from "@/data/store";

interface StoreSection {
  label: string;
  enabled: boolean;
  icon: string;
}

export function StoreBuilderPage() {
  const [banners, setBanners] = useState<Banner[]>(BANNERS);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [sections, setSections] = useState<StoreSection[]>([
    { label: "محصولات ویژه", enabled: true, icon: "⭐" },
    { label: "پیشنهاد پزشک", enabled: true, icon: "👨‍⚕️" },
    { label: "محصولات تخفیف‌دار", enabled: true, icon: "🏷️" },
    { label: "تازه‌های فروشگاه", enabled: false, icon: "🆕" },
    { label: "پرفروش‌ترین‌ها", enabled: true, icon: "🔥" },
  ]);

  if (previewMode) return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setPreviewMode(false)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-secondary"><ChevronLeft size={15} />بازگشت</button>
        <h2 className="font-bold">پیش‌نمایش فروشگاه</h2>
        <span className="text-xs text-muted-foreground bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg">حالت پیش‌نمایش</span>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-primary p-8 text-white text-center">
          <p className="text-xs text-white/60 mb-1">فروشگاه کلینیک طب سوزنی دکتر شیرمردی</p>
          <h1 className="text-2xl font-bold mb-2">سلامت طبیعی با طب سنتی</h1>
          <p className="text-sm text-white/70">محصولات و مکمل‌های انتخابی پزشک</p>
        </div>
        {banners.filter(b => b.active).map(b => (
          <div key={b.id} className="flex items-center gap-8 p-8 border-b border-border">
            <div className="text-6xl">{b.img}</div>
            <div className="flex-1"><h2 className="text-lg font-bold mb-1">{b.title}</h2><p className="text-sm text-muted-foreground mb-4">{b.desc}</p><button className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold">{b.btn}</button></div>
          </div>
        ))}
        {sections.filter(s => s.enabled).map(s => (
          <div key={s.label} className="p-6 border-b border-border">
            <h3 className="font-bold mb-4">{s.icon} {s.label}</h3>
            <div className="flex gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="w-36 h-32 bg-secondary rounded-xl flex items-center justify-center text-2xl">🌿</div>)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <button onClick={() => setPreviewMode(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Eye size={16} />پیش‌نمایش فروشگاه</button>
      </div>

      {/* Banners */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold">بنرها و کارت‌های تبلیغاتی</h2>
          <button onClick={() => setEditing({ id: 0, title: "", desc: "", btn: "", img: "🌿", active: true, order: banners.length + 1, start: "", end: "" })} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Plus size={15} />بنر جدید</button>
        </div>
        <div className="divide-y divide-border">
          {banners.map(b => (
            <div key={b.id} className="flex items-center gap-5 px-5 py-4 hover:bg-secondary/20">
              <div className="text-3xl w-12 text-center">{b.img}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{b.title}</p>
                <p className="text-xs text-muted-foreground truncate">{b.desc}</p>
                <div className="flex items-center gap-3 mt-1 text-[0.65rem] text-muted-foreground"><span>از: {b.start}</span><span>تا: {b.end}</span><span className="font-bold text-primary">دکمه: {b.btn}</span></div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><ChevronUp size={14} /></button>
                  <button className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground"><ChevronDown size={14} /></button>
                </div>
                <button onClick={() => setBanners(prev => prev.map(x => x.id === b.id ? { ...x, active: !x.active } : x))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${b.active ? "bg-primary" : "bg-gray-300"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${b.active ? "left-0.5" : "right-0.5"}`} />
                </button>
                <button onClick={() => setEditing(b)} className="p-1.5 hover:bg-secondary rounded-lg"><Edit size={14} className="text-muted-foreground" /></button>
                <button onClick={() => setBanners(prev => prev.filter(x => x.id !== b.id))} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-muted-foreground" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Banner editor */}
      {editing && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-4">{editing.id === 0 ? "بنر جدید" : "ویرایش بنر"}</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[["عنوان", "title"], ["توضیح کوتاه", "desc"], ["متن دکمه", "btn"]].map(([l, k]) => (
              <div key={k}><label className="text-xs text-muted-foreground mb-1 block">{l}</label>
                <input defaultValue={editing[k as keyof Banner] as string} className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[["تاریخ شروع", "start"], ["تاریخ پایان", "end"], ["ایموجی/آیکون", "img"]].map(([l, k]) => (
              <div key={k}><label className="text-xs text-muted-foreground mb-1 block">{l}</label>
                <input defaultValue={editing[k as keyof Banner] as string} className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              if (editing.id === 0) setBanners(prev => [...prev, { ...editing, id: Date.now() }]);
              else setBanners(prev => prev.map(x => x.id === editing.id ? editing : x));
              setEditing(null);
            }} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold">ذخیره</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 border border-border rounded-xl text-sm font-semibold">انصراف</button>
          </div>
        </div>
      )}

      {/* Sections control */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-bold">بخش‌های صفحه فروشگاه</h2><p className="text-xs text-muted-foreground mt-0.5">فعال/غیرفعال کردن و ترتیب نمایش</p></div>
        <div className="divide-y divide-border">
          {sections.map((s, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex gap-1">
                <button className="p-1 hover:bg-secondary rounded text-muted-foreground"><ChevronUp size={13} /></button>
                <button className="p-1 hover:bg-secondary rounded text-muted-foreground"><ChevronDown size={13} /></button>
              </div>
              <span className="text-xl w-8">{s.icon}</span>
              <p className="flex-1 text-sm font-semibold">{s.label}</p>
              <button onClick={() => setSections(prev => prev.map((x, j) => j === i ? { ...x, enabled: !x.enabled } : x))}
                className={`relative w-10 h-5 rounded-full transition-colors ${s.enabled ? "bg-primary" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${s.enabled ? "left-0.5" : "right-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
