"use client";

import { ChevronDown, Edit, Plus, Trash2 } from "lucide-react";
import { BOTS } from "@/data/bots";
import { p } from "@/lib/utils";

interface FlowBlock {
  type: string;
  label: string;
  color: string;
}

export function BotFlowsPage() {
  const FLOW_BLOCKS: FlowBlock[] = [
    { type: "trigger", label: "کاربر ربات را شروع کرد", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    { type: "message", label: "پیام خوش‌آمدگویی", color: "bg-blue-100 text-blue-800 border-blue-300" },
    { type: "question", label: "سوالات سلامت", color: "bg-violet-100 text-violet-800 border-violet-300" },
    { type: "assess", label: "ارزیابی مزاج", color: "bg-amber-100 text-amber-800 border-amber-300" },
    { type: "result", label: "نتیجه‌گیری", color: "bg-orange-100 text-orange-800 border-orange-300" },
    { type: "product", label: "محصولات پیشنهادی", color: "bg-teal-100 text-teal-800 border-teal-300" },
    { type: "booking", label: "رزرو نوبت", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
    { type: "end", label: "پایان مکالمه", color: "bg-gray-100 text-gray-800 border-gray-300" },
  ];
  const BLOCK_PALETTE = [
    { type: "پیام", icon: "💬" }, { type: "سوال", icon: "❓" },
    { type: "چندگزینه‌ای", icon: "📋" }, { type: "شرط", icon: "🔀" },
    { type: "فراخوانی API", icon: "⚡" }, { type: "ارسال محصول", icon: "🛍️" },
    { type: "رزرو نوبت", icon: "📅" }, { type: "انتقال به اپراتور", icon: "👨‍💼" },
    { type: "پایان مکالمه", icon: "🔚" },
  ];
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Palette */}
      <div className="w-52 flex-shrink-0 border-l border-border bg-card overflow-y-auto p-4">
        <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">بلوک‌ها</p>
        <div className="space-y-2">
          {BLOCK_PALETTE.map(b => (
            <div key={b.type} className="flex items-center gap-2.5 p-2.5 bg-secondary rounded-xl cursor-grab hover:bg-secondary/80 transition-colors">
              <span className="text-lg">{b.icon}</span>
              <span className="text-xs font-semibold">{b.type}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 py-3 border-b border-border bg-card flex items-center gap-3 flex-shrink-0">
          <select className="bg-secondary rounded-xl px-3 py-2 text-sm font-semibold outline-none">
            {BOTS.map(b => <option key={b.id}>{b.name}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">جریان اصلی</span>
          <div className="mr-auto flex gap-2">
            <button className="px-4 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-secondary">پیش‌نمایش</button>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold">انتشار</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-secondary/30 p-8">
          <div className="flex flex-col items-center gap-0 max-w-md mx-auto">
            {FLOW_BLOCKS.map((block, i) => (
              <div key={i} className="flex flex-col items-center w-full">
                <div className={`w-full border-2 rounded-2xl px-5 py-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow relative group ${block.color}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center text-sm font-bold">{p(i + 1)}</div>
                    <p className="font-bold text-sm flex-1">{block.label}</p>
                    <div className="hidden group-hover:flex gap-1">
                      <button className="p-1 rounded-lg bg-white/60 hover:bg-white"><Edit size={12} /></button>
                      <button className="p-1 rounded-lg bg-white/60 hover:bg-white"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {block.type === "question" && <p className="text-xs mt-2 opacity-70">سن، جنسیت، علائم، سبک زندگی</p>}
                  {block.type === "assess" && <p className="text-xs mt-2 opacity-70">محاسبه مزاج: دموی، صفراوی، بلغمی، سوداوی</p>}
                </div>
                {i < FLOW_BLOCKS.length - 1 && <div className="flex flex-col items-center my-1"><div className="w-px h-4 bg-border" /><ChevronDown size={16} className="text-muted-foreground" /><div className="w-px h-4 bg-border" /></div>}
              </div>
            ))}
            <button className="mt-4 flex items-center gap-2 px-5 py-2.5 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary hover:text-primary text-sm font-semibold"><Plus size={16} />افزودن بلوک</button>
          </div>
        </div>
      </div>
      {/* Properties */}
      <div className="w-56 flex-shrink-0 border-r border-border bg-card overflow-y-auto p-4">
        <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">تنظیمات جریان</p>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">نام جریان</label><input defaultValue="جریان اصلی" className="w-full bg-secondary rounded-lg px-3 py-1.5 text-xs outline-none" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">تریگر</label><select className="w-full bg-secondary rounded-lg px-3 py-1.5 text-xs outline-none"><option>شروع ربات</option><option>کلمه کلیدی</option><option>دکمه</option></select></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">وضعیت</label>
            <div className="flex items-center gap-2 mt-1"><div className="w-8 h-4 bg-primary rounded-full relative"><div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full" /></div><span className="text-xs font-semibold text-emerald-700">فعال</span></div>
          </div>
          <div className="pt-2 border-t border-border"><p className="text-xs font-bold mb-2">آمار جریان</p>{[["اجرا", "۳,۴۲۰"], ["تکمیل", "۲,۸۱۰"], ["رها", "۶۱۰"]].map(([l, v]) => <div key={l} className="flex justify-between text-xs py-1"><span className="text-muted-foreground">{l}</span><span className="font-bold">{v}</span></div>)}</div>
        </div>
      </div>
    </div>
  );
}
