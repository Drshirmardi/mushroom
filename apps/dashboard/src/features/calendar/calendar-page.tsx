"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { APPTS } from "@/data/appointments";
import type { Appointment } from "@/data/appointments";
import { StatusBadge } from "@/components/shared";
import { p } from "@/lib/utils";

export function CalendarPage() {
  const [view, setView] = useState<"day" | "week" | "month">("month");
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const aptsByDay: Record<number, Appointment[]> = { 1: [APPTS[0]], 5: [APPTS[1], APPTS[2]], 10: [APPTS[3]], 15: [APPTS[4], APPTS[0]], 17: APPTS.slice(0, 6), 20: [APPTS[5], APPTS[6]], 25: [APPTS[8], APPTS[9], APPTS[10]] };
  const hours = ["۰۸:۰۰", "۰۹:۰۰", "۱۰:۰۰", "۱۱:۰۰", "۱۲:۰۰", "۱۳:۰۰", "۱۴:۰۰", "۱۵:۰۰", "۱۶:۰۰"];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl hover:bg-card border border-border"><ChevronRight size={17} /></button>
          <h2 className="text-base font-bold px-2">تیر ۱۴۰۳</h2>
          <button className="p-2 rounded-xl hover:bg-card border border-border"><ChevronLeft size={17} /></button>
          <button className="px-3 py-1.5 text-xs font-semibold bg-secondary rounded-lg mr-2">امروز</button>
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
          {(["day", "week", "month"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {v === "day" ? "روزانه" : v === "week" ? "هفتگی" : "ماهانه"}
            </button>
          ))}
        </div>
      </div>
      {view === "month" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
            {["ش", "ی", "د", "س", "چ", "پ", "ج"].map(d => <div key={d} className="py-3 text-center text-xs font-bold text-muted-foreground">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 2 }).map((_, i) => <div key={`e${i}`} className="h-28 border-b border-l border-border bg-secondary/10" />)}
            {days.map(day => {
              const apts = aptsByDay[day] ?? [];
              const isToday = day === 17;
              return (
                <div key={day} className={`h-28 border-b border-l border-border p-1.5 cursor-pointer hover:bg-secondary/30 transition-colors ${isToday ? "bg-primary/5" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${isToday ? "bg-primary text-white" : "text-foreground"}`}>{p(day)}</div>
                  <div className="space-y-0.5">
                    {apts.slice(0, 2).map((a, i) => <div key={i} className={`text-[0.62rem] px-1.5 py-0.5 rounded truncate ${a.type === "حضوری" ? "bg-teal-100 text-teal-700" : "bg-violet-100 text-violet-700"}`}>{a.time} {a.patient.split(" ").slice(-1)[0]}</div>)}
                    {apts.length > 2 && <p className="text-[0.58rem] text-muted-foreground px-1">+{p(apts.length - 2)} بیشتر</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {view === "day" && (
        <div className="bg-card border border-border rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-border"><h3 className="font-bold text-foreground">سه‌شنبه ۱۷ تیر ۱۴۰۳</h3></div>
          <div className="p-5 space-y-1">
            {hours.map(hr => {
              const apt = APPTS.find(a => a.time.startsWith(hr.slice(0, 2)));
              return <div key={hr} className="flex gap-4 min-h-[52px]"><span className="text-xs text-muted-foreground w-12 pt-1 flex-shrink-0">{hr}</span><div className="flex-1 border-t border-border pt-1">{apt && <div className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${apt.type === "حضوری" ? "bg-teal-100 text-teal-800" : "bg-violet-100 text-violet-800"}`}><span>{apt.patient}</span><StatusBadge status={apt.status} /></div>}</div></div>;
            })}
          </div>
        </div>
      )}
      {view === "week" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-border">
            {["ش ۱۳", "ی ۱۴", "د ۱۵", "س ۱۶", "چ ۱۷", "پ ۱۸", "ج ۱۹"].map((d, i) => (
              <div key={d} className={`py-3 text-center text-xs font-bold border-l border-border last:border-0 ${i === 4 ? "text-primary bg-primary/5" : "text-muted-foreground"}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-border" style={{ minHeight: 260 }}>
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} className="p-2 space-y-1.5">
                {col === 4 && APPTS.slice(0, 4).map((a, ai) => <div key={ai} className={`text-[0.62rem] px-2 py-1 rounded-lg font-medium ${a.type === "حضوری" ? "bg-teal-100 text-teal-700" : "bg-violet-100 text-violet-700"}`}><p>{a.time}</p><p className="truncate">{a.patient.split(" ").slice(-1)[0]}</p></div>)}
                {col === 1 && <div className="text-[0.62rem] px-2 py-1 rounded-lg bg-teal-100 text-teal-700"><p>۱۰:۰۰</p><p>احمدی</p></div>}
                {col === 3 && <div className="text-[0.62rem] px-2 py-1 rounded-lg bg-violet-100 text-violet-700"><p>۱۱:۳۰</p><p>رضایی</p></div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
