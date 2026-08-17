"use client";

import { useState } from "react";
import {
  Check, ChevronDown, Download, Lock, Paperclip,
  Plus, Save, Send, Trash2, X,
} from "lucide-react";
import { PATIENTS } from "@/data/patients";
import { TIMELINE_EVENTS } from "@/data/activity";
import { PRODUCTS } from "@/data/store";
import { Avatar, StatusBadge } from "@/components/shared";
import { fm, p } from "@/lib/utils";

interface MedRow {
  name: string;
  dose: string;
  freq: string;
  dur: string;
  inst: string;
}

export function PrescriptionsPage() {
  const pt = PATIENTS[0];
  const [workTab, setWorkTab] = useState("rx");
  const [meds, setMeds] = useState<MedRow[]>([
    { name: "بروفن", dose: "۴۰۰mg", freq: "هر ۸ ساعت", dur: "۷ روز", inst: "با غذا مصرف شود" },
    { name: "ویتامین D3", dose: "۱۰۰۰ IU", freq: "روزانه", dur: "۳ ماه", inst: "صبح با آب مصرف شود" },
  ]);
  const WORK_TABS = [{ id: "rx", label: "نسخه دارویی" }, { id: "treatment", label: "برنامه درمانی" }, { id: "diet", label: "رژیم غذایی" }, { id: "exercise", label: "ورزش" }, { id: "files", label: "فایل‌ها" }, { id: "appts", label: "نوبت‌ها" }];
  const treatmentSessions = [
    { num: 1, goal: "کاهش التهاب حاد", status: "تکمیل", points: "BL23، KD3" },
    { num: 2, goal: "تقویت جریان Chi", status: "تکمیل", points: "GV4، BL25" },
    { num: 3, goal: "بهبود انعطاف کمر", status: "در حال انجام", points: "GB30، BL40" },
    { num: 4, goal: "تثبیت و پیشگیری", status: "برنامه‌ریزی", points: "KD7، SP6" },
  ];
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Patient sidebar */}
      <div className="w-64 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">بیمار فعلی</p>
          <div className="bg-secondary rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-secondary/80">
            <Avatar letter={pt.avatar} size="xs" /><span className="text-sm font-bold flex-1">{pt.name}</span><ChevronDown size={13} className="text-muted-foreground" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[["تشخیص", pt.diagnosis], ["مزاج", pt.constitution], ["آلرژی", "پنی‌سیلین"], ["آخرین ویزیت", pt.lastVisit], ["وزن", pt.weight + " کگ"], ["قد", pt.height + " سم"]].map(([l, v]) => (
            <div key={l}><p className="text-[0.65rem] text-muted-foreground uppercase tracking-wide">{l}</p><p className="text-xs font-semibold mt-0.5">{v}</p></div>
          ))}
          <div className="pt-2 border-t border-border">
            <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wide mb-2">تایم‌لاین اخیر</p>
            {TIMELINE_EVENTS.slice(0, 3).map((ev, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${ev.color}`}><ev.icon size={10} /></div>
                <p className="text-[0.65rem] text-muted-foreground leading-snug">{ev.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="border-b border-border bg-card flex-shrink-0 overflow-x-auto">
          <div className="flex px-5">
            {WORK_TABS.map(t => (
              <button key={t.id} onClick={() => setWorkTab(t.id)}
                className={`px-4 py-3.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${workTab === t.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {workTab === "rx" && (
            <div className="space-y-4">
              {meds.map((m, i) => (
                <div key={i} className="bg-secondary/50 border border-border rounded-2xl p-4">
                  <div className="grid grid-cols-5 gap-3 mb-2">
                    {[["نام دارو", m.name], ["دوز", m.dose], ["تناوب", m.freq], ["مدت", m.dur]].map(([l, v]) => (
                      <div key={l}><label className="text-[0.65rem] text-muted-foreground uppercase tracking-wide mb-1 block">{l}</label><input defaultValue={v} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></div>
                    ))}
                    <div className="flex items-end"><button onClick={() => setMeds(meds.filter((_, j) => j !== i))} className="p-2 border border-border rounded-lg hover:bg-red-50 transition-colors w-full flex items-center justify-center"><Trash2 size={14} className="text-muted-foreground" /></button></div>
                  </div>
                  <div><label className="text-[0.65rem] text-muted-foreground uppercase tracking-wide mb-1 block">دستورالعمل</label><input defaultValue={m.inst} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></div>
                </div>
              ))}
              <button onClick={() => setMeds([...meds, { name: "", dose: "", freq: "", dur: "", inst: "" }])} className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border text-muted-foreground rounded-2xl hover:border-primary hover:text-primary transition-colors text-sm font-semibold"><Plus size={16} />افزودن دارو</button>
            </div>
          )}
          {workTab === "treatment" && (
            <div className="space-y-3">
              {treatmentSessions.map((s, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${s.status === "تکمیل" ? "bg-emerald-100 text-emerald-700" : s.status === "در حال انجام" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{p(s.num)}</div>
                      <div><p className="font-bold text-sm">{s.goal}</p><p className="text-xs text-muted-foreground">نقاط: {s.points}</p></div>
                    </div>
                    <StatusBadge status={s.status === "تکمیل" ? "پایان یافته" : s.status === "در حال انجام" ? "در حال انجام" : "در انتظار تایید"} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">{["ورزش", "رژیم", "ویدیو"].map(l => <button key={l} className="py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors">+ {l}</button>)}</div>
                </div>
              ))}
              <button className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm font-semibold"><Plus size={16} />جلسه جدید</button>
            </div>
          )}
          {workTab === "diet" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[["صبحانه", "🌅", "bg-amber-50"], ["ناهار", "☀️", "bg-orange-50"], ["شام", "🌙", "bg-indigo-50"], ["میان‌وعده", "🍎", "bg-emerald-50"]].map(([m, ic, bg]) => (
                  <div key={m} className={`${bg} border border-border rounded-2xl p-4`}>
                    <p className="text-sm font-bold mb-3">{ic} {m}</p>
                    <div className="space-y-1.5">{["", "", ""].map((_, i) => <input key={i} placeholder="+ ماده غذایی" className="w-full bg-white/80 border border-border/50 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20" />)}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-2xl p-4"><p className="text-sm font-bold mb-3">✅ مجاز</p>{["انار", "سیب ترش", "کرفس"].map((f, i) => <div key={i} className="flex items-center gap-2 text-sm"><Check size={13} className="text-emerald-600" />{f}</div>)}<button className="text-xs text-primary font-semibold mt-2">+ افزودن</button></div>
                <div className="bg-card border border-border rounded-2xl p-4"><p className="text-sm font-bold mb-3">❌ ممنوع</p>{["غذای چرب", "قند زیاد", "فست فود"].map((f, i) => <div key={i} className="flex items-center gap-2 text-sm"><X size={13} className="text-red-500" />{f}</div>)}<button className="text-xs text-primary font-semibold mt-2">+ افزودن</button></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[["آب روزانه", "۸ لیوان", "💧"], ["مکمل‌ها", "ویتامین D3، امگا ۳", "💊"], ["یادداشت", "از آب سرد بپرهیزید", "📝"]].map(([l, v, ic]) => (
                  <div key={l} className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground mb-1">{ic} {l}</p><input defaultValue={v} className="w-full text-sm font-semibold bg-transparent outline-none" /></div>
                ))}
              </div>
            </div>
          )}
          {workTab === "exercise" && (
            <div className="space-y-4">
              {[{ name: "کشش کمر", reps: "۱۰ تکرار", dur: "۵ دقیقه", days: ["ش", "ی", "د", "س", "چ"] }, { name: "پل کمری", reps: "۱۵ تکرار", dur: "۸ دقیقه", days: ["ش", "س", "پ"] }, { name: "پیاده‌روی", reps: "—", dur: "۳۰ دقیقه", days: ["ش", "ی", "د", "س", "چ", "پ"] }].map((ex, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏃</div>
                    <div className="flex-1"><input defaultValue={ex.name} className="font-bold bg-transparent outline-none text-sm w-full" /><div className="flex gap-3 mt-1"><input defaultValue={ex.reps} className="text-xs text-muted-foreground bg-transparent outline-none w-24" /><input defaultValue={ex.dur} className="text-xs text-muted-foreground bg-transparent outline-none w-24" /></div></div>
                    <button className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-muted-foreground" /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">روزهای هفته:</p>
                    {["ش", "ی", "د", "س", "چ", "پ", "ج"].map(d => (
                      <span key={d} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer ${ex.days.includes(d) ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>{d}</span>
                    ))}
                  </div>
                </div>
              ))}
              <button className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm font-semibold"><Plus size={16} />افزودن ورزش</button>
            </div>
          )}
          {["files", "appts"].includes(workTab) && <div className="text-center py-16 text-muted-foreground"><Paperclip size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm">بارگذاری فایل یا مشاهده نوبت‌ها</p></div>}
        </div>
      </div>

      {/* Notes + products */}
      <div className="w-64 flex-shrink-0 border-r border-border flex flex-col overflow-y-auto bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3"><Lock size={14} className="text-muted-foreground" /><p className="text-xs font-bold">یادداشت خصوصی</p></div>
          <textarea rows={6} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none" defaultValue="بیمار با درد مزمن کمر مراجعه کرده است. پروتکل BL23 ادامه یابد." />
        </div>
        <div className="p-4 border-b border-border">
          <p className="text-xs font-bold mb-3">محصولات پیشنهادی</p>
          <div className="space-y-2">
            {PRODUCTS.filter(p => p.recommended).map(prod => (
              <label key={prod.id} className="flex items-center gap-2 p-2 border border-border rounded-xl cursor-pointer hover:bg-secondary/50">
                <input type="checkbox" className="accent-primary" defaultChecked={prod.featured} />
                <span className="text-base">{prod.img}</span>
                <div className="flex-1 min-w-0"><p className="text-[0.65rem] font-semibold truncate">{prod.name}</p><p className="text-[0.62rem] text-primary font-bold">{fm(prod.price)}</p></div>
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-2">
          <button className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Save size={13} />ذخیره و ارسال</button>
          <button className="w-full py-2 border border-border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-secondary"><Download size={13} />دانلود PDF</button>
          <button className="w-full py-2 border border-border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-secondary"><Send size={13} />ارسال به بیمار</button>
        </div>
      </div>
    </div>
  );
}
