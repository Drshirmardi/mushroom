"use client";

import { useState } from "react";
import {
  CheckSquare, Copy, Download, Edit, Filter, Hash, List, Plus, Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PATIENTS } from "@/data/patients";
import { Avatar, StatusBadge } from "@/components/shared";
import { p } from "@/lib/utils";

interface Assessment {
  id: number;
  name: string;
  type: string;
  questions: string;
  submissions: string;
  status: string;
}

export function AssessmentsPage() {
  const [view, setView] = useState<"list" | "builder" | "results">("list");
  const [typeFilter, setTypeFilter] = useState("همه");
  const types = ["همه", "فردی", "زوجی", "سبک زندگی", "پیگیری", "درد", "خواب", "استرس", "طب سنتی"];
  const assessments: Assessment[] = [
    { id: 1, name: "ارزیابی درد مزمن", type: "درد", questions: p(12), submissions: p(34), status: "منتشرشده" },
    { id: 2, name: "پرسشنامه کیفیت خواب", type: "خواب", questions: p(9), submissions: p(18), status: "منتشرشده" },
    { id: 3, name: "ارزیابی سطح اضطراب", type: "استرس", questions: p(15), submissions: p(7), status: "پیش‌نویس" },
    { id: 4, name: "ارزیابی زوجی سلامت", type: "زوجی", questions: p(20), submissions: p(5), status: "منتشرشده" },
    { id: 5, name: "سنجش مزاج طب سنتی", type: "طب سنتی", questions: p(18), submissions: p(12), status: "منتشرشده" },
    { id: 6, name: "ارزیابی سبک زندگی", type: "سبک زندگی", questions: p(10), submissions: p(9), status: "منتشرشده" },
  ];
  const filtered = typeFilter === "همه" ? assessments : assessments.filter(a => a.type === typeFilter);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl p-1.5 w-fit shadow-sm">
        {(["list", "builder", "results"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {v === "list" ? "لیست ارزیابی‌ها" : v === "builder" ? "ساخت ارزیابی" : "نتایج"}
          </button>
        ))}
      </div>
      {view === "list" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {types.map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>{t}</button>)}
            <button onClick={() => setView("builder")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold mr-auto"><Plus size={16} />ارزیابی جدید</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-bold text-sm">{a.name}</h3><span className="text-[0.65rem] bg-secondary text-muted-foreground px-2 py-0.5 rounded-md mt-1 inline-block">{a.type}</span></div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="flex items-center gap-5 text-xs text-muted-foreground mb-4"><span>{a.questions} سوال</span><span>{a.submissions} پاسخ</span></div>
                <div className="flex gap-2">
                  <button onClick={() => setView("results")} className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-secondary">نتایج</button>
                  <button className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-secondary">ویرایش</button>
                  <button className="p-2 border border-border rounded-xl hover:bg-secondary"><Copy size={13} className="text-muted-foreground" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {view === "builder" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <input placeholder="عنوان ارزیابی..." className="w-full text-lg font-bold bg-transparent outline-none placeholder:text-muted-foreground/40 mb-2" />
              <div className="flex items-center gap-3 mb-3"><select className="bg-secondary rounded-xl px-3 py-2 text-sm outline-none"><option>نوع</option>{types.slice(1).map(t => <option key={t}>{t}</option>)}</select></div>
              <textarea rows={2} placeholder="توضیح مختصر..." className="w-full text-sm bg-secondary rounded-xl px-4 py-3 outline-none resize-none placeholder:text-muted-foreground/50" />
            </div>
            {[1, 2].map(qi => (
              <div key={qi} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4"><span className="text-xs font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg">سوال {p(qi)}</span><div className="flex gap-1"><button className="p-1.5 hover:bg-secondary rounded-lg"><Copy size={13} className="text-muted-foreground" /></button><button className="p-1.5 hover:bg-secondary rounded-lg"><Trash2 size={13} className="text-muted-foreground" /></button></div></div>
                <input placeholder={`متن سوال ${p(qi)}...`} className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none mb-3" />
                <div className="space-y-2">{["گزینه الف", "گزینه ب", "گزینه ج"].map((opt, oi) => <div key={oi} className="flex items-center gap-2"><input type="radio" name={`q${qi}`} className="accent-primary" /><input defaultValue={opt} className="flex-1 bg-secondary rounded-lg px-3 py-1.5 text-sm outline-none" /></div>)}</div>
              </div>
            ))}
            <button className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border text-muted-foreground rounded-2xl hover:border-primary hover:text-primary text-sm font-semibold"><Plus size={16} />افزودن سوال</button>
          </div>
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold mb-3">نوع سوال</h3>
              <div className="grid grid-cols-2 gap-2">
                {([[CheckSquare, "چندگزینه‌ای", "bg-blue-100 text-blue-700"], [Hash, "عددی", "bg-orange-100 text-orange-700"], [List, "تک‌انتخابی", "bg-violet-100 text-violet-700"], [Edit, "متنی", "bg-teal-100 text-teal-700"]] as [LucideIcon, string, string][]).map(([Ic, l, c]) => (
                  <button key={l} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors ${c}`}><Ic size={16} /><span className="text-[0.65rem] font-bold">{l}</span></button>
                ))}
              </div>
            </div>
            <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold">انتشار ارزیابی</button>
          </div>
        </div>
      )}
      {view === "results" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-bold">نتایج ارزیابی درد مزمن</h2><div className="flex gap-2"><button className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-secondary"><Filter size={13} />فیلتر</button><button className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-secondary"><Download size={13} />خروجی</button></div></div>
          <table className="w-full">
            <thead><tr className="border-b border-border bg-secondary/30">{["بیمار", "تاریخ", "امتیاز", "ریسک", "توصیه", "مقایسه"].map(h => <th key={h} className="text-right px-5 py-3 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {PATIENTS.slice(0, 4).map((pt, i) => {
                const score = [72, 45, 88, 60][i];
                const risk = ["بالا", "متوسط", "بالا", "پایین"][i];
                return (
                  <tr key={pt.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar letter={pt.avatar} size="xs" /><span className="text-sm font-semibold">{pt.name}</span></div></td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">۱۴۰۳/۰۴/{p(10 + i * 2)}</td>
                    <td className="px-5 py-3.5"><div className="flex items-center gap-2"><div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} /></div><span className="text-sm font-bold">{p(score)}</span></div></td>
                    <td className="px-5 py-3.5"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${risk === "بالا" ? "bg-red-100 text-red-700" : risk === "متوسط" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{risk}</span></td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{["نیاز به پیگیری", "ادامه درمان", "ارجاع", "پایش ماهانه"][i]}</td>
                    <td className="px-5 py-3.5"><button className="text-xs text-primary font-semibold hover:underline">مقایسه</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
