"use client";

import { useState } from "react";
import { Edit, Plus, Trash2, X } from "lucide-react";
import { p } from "@/lib/utils";

interface AssessQuestion {
  id: number;
  q: string;
  type: string;
  options: string[];
  score: Record<string, Record<string, number>>;
}

interface ScoringRule {
  temperament: string;
  color: string;
  keys: string[];
}

export function BotAssessmentPage() {
  const [tab, setTab] = useState<"questions" | "scoring" | "results">("questions");
  const QUESTIONS: AssessQuestion[] = [
    { id: 1, q: "طبیعت بدن شما بیشتر چگونه است؟", type: "چندگزینه‌ای", options: ["گرم", "سرد", "معتدل"], score: { "گرم": { "دموی": 2, "صفراوی": 3 }, "سرد": { "بلغمی": 2, "سوداوی": 2 }, "معتدل": {} } },
    { id: 2, q: "کیفیت خواب شما معمولاً چطور است؟", type: "چندگزینه‌ای", options: ["خوب و عمیق", "سطحی و کم", "پرخواب"], score: {} },
    { id: 3, q: "گوارش شما چطور است؟", type: "چندگزینه‌ای", options: ["سریع", "کند", "معتدل"], score: {} },
    { id: 4, q: "سطح انرژی روزانه شما؟", type: "چندگزینه‌ای", options: ["زیاد", "کم", "متوسط"], score: {} },
    { id: 5, q: "وضعیت پوست شما؟", type: "چندگزینه‌ای", options: ["چرب", "خشک", "معتدل", "حساس"], score: {} },
  ];
  const SCORING: ScoringRule[] = [
    { temperament: "دموی", color: "bg-red-100 text-red-700", keys: ["گرم", "مرطوب", "سریع", "خوب"] },
    { temperament: "صفراوی", color: "bg-amber-100 text-amber-700", keys: ["گرم", "خشک", "سریع", "زیاد"] },
    { temperament: "بلغمی", color: "bg-blue-100 text-blue-700", keys: ["سرد", "مرطوب", "کند", "کم"] },
    { temperament: "سوداوی", color: "bg-violet-100 text-violet-700", keys: ["سرد", "خشک", "کند", "سطحی"] },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl p-1.5 w-fit shadow-sm">
        {([["questions", "سوالات"], ["scoring", "قوانین امتیازدهی"], ["results", "نتایج نمونه"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>
      {tab === "questions" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Plus size={16} />سوال جدید</button></div>
          {QUESTIONS.map((q, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{p(i + 1)}</div><input defaultValue={q.q} className="font-semibold text-sm bg-transparent outline-none border-b border-transparent hover:border-border focus:border-primary w-96 pb-0.5" /></div>
                <div className="flex gap-1"><button className="p-1.5 hover:bg-secondary rounded-lg"><Edit size={13} className="text-muted-foreground" /></button><button className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-muted-foreground" /></button></div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-1.5 text-xs font-medium">
                    <input type="radio" name={`q${i}`} className="accent-primary" readOnly />{opt}
                    <button className="text-muted-foreground hover:text-red-500 mr-1"><X size={11} /></button>
                  </div>
                ))}
                <button className="bg-secondary/60 border border-dashed border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-primary">+ گزینه</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "scoring" && (
        <div className="grid grid-cols-2 gap-5">
          {SCORING.map(s => (
            <div key={s.temperament} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-bold mb-4 ${s.color}`}>{s.temperament}</div>
              <p className="text-xs text-muted-foreground mb-3">کلیدواژه‌های امتیازدهی:</p>
              <div className="flex flex-wrap gap-2">
                {s.keys.map((k, i) => <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${s.color}`}>{k}</span>)}
                <button className={`px-2.5 py-1 rounded-lg text-xs border border-dashed border-current opacity-50 ${s.color}`}>+ کلید</button>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">امتیاز پایه: <span className="font-bold text-foreground">۰</span></p>
                <p className="text-xs text-muted-foreground">آستانه تشخیص: <span className="font-bold text-foreground">۵ امتیاز</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "results" && (
        <div className="max-w-lg">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-3">د</div>
              <h2 className="text-lg font-bold">مزاج غالب: دموی</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className="flex-1 max-w-32 h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: "78%" }} /></div>
                <span className="text-sm font-bold text-red-600">۷۸٪</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">ضریب اطمینان</p>
            </div>
            <div className="space-y-3">
              {[["توصیه سبک زندگی", "ورزش منظم صبحگاه، خواب کافی"], ["تغذیه پیشنهادی", "میوه‌های ترش، سبزیجات تازه"], ["محصولات", "روغن طب سوزنی، چای گیاهی"], ["مشاوره پزشک", "جلسه ارزیابی توصیه می‌شود"]].map(([l, v]) => (
                <div key={l} className="flex gap-3 p-3 bg-secondary/50 rounded-xl"><div className="w-1.5 rounded-full bg-red-400 self-stretch" /><div><p className="text-xs font-bold">{l}</p><p className="text-xs text-muted-foreground mt-0.5">{v}</p></div></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
