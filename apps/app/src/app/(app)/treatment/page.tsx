"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  FileText,
  Leaf,
  Pill,
  Zap,
} from "lucide-react";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { useMedsStore } from "@/stores/meds";
import { useTasksStore } from "@/stores/tasks";
import type { Task } from "@/lib/types";

const PLAN_SECTIONS = [
  { id: "sessions", title: "جلسات درمانی", icon: Activity, color: "text-primary bg-accent", items: ["جلسه ۳: آکوپانکچر ستون فقرات - ۱۴ مرداد", "جلسه ۴: آکوپانکچر سردرد - ۲۱ مرداد"] },
  { id: "exercises", title: "تمرینات", icon: Zap, color: "text-amber-600 bg-amber-50", items: ["کشش گردن - ۱۰ دقیقه صبح", "پیاده‌روی آرام - ۲۰ دقیقه"] },
  { id: "diet", title: "رژیم غذایی", icon: Leaf, color: "text-green-600 bg-green-50", items: ["غلات کامل و سبزیجات تازه", "پرهیز از غذاهای سرد و تند"] },
];

const TIMELINE = [
  { icon: CheckCircle, color: "text-green-600 bg-green-50", title: "ارزیابی سلامت", date: "۱ مرداد", desc: "گزارش کامل وضعیت" },
  { icon: Calendar, color: "text-blue-600 bg-blue-50", title: "اولین مشاوره", date: "۵ مرداد", desc: "بررسی علائم" },
  { icon: FileText, color: "text-amber-600 bg-amber-50", title: "نسخه صادر شد", date: "۵ مرداد", desc: "۳ داروی گیاهی" },
  { icon: Activity, color: "text-primary bg-accent", title: "جلسه ۱", date: "۷ مرداد", desc: "آکوپانکچر گردن" },
  { icon: Activity, color: "text-primary bg-accent", title: "جلسه ۲", date: "۱۰ مرداد", desc: "آکوپانکچر کمر" },
];

export default function TreatmentPage() {
  const navigateScreen = useScreenNavigation();
  const meds = useMedsStore((s) => s.meds);
  const tasks = useTasksStore((s) => s.tasks);
  const toggleTask = useTasksStore((s) => s.toggleTask);
  const [tab, setTab] = useState<"prescription" | "plan" | "tasks" | "timeline">("prescription");
  const [expanded, setExpanded] = useState<string | null>("sessions");

  return (
    <div className="px-4 space-y-4">
      <div className="pt-3 pb-1"><h1 className="text-xl font-bold text-foreground">درمان من</h1><p className="text-sm text-muted-foreground mt-0.5">پیگیری کامل مسیر درمان</p></div>
      <button onClick={() => navigateScreen("ProgressReport")} className="w-full bg-gradient-to-br from-primary to-[#2d7a52] rounded-3xl p-5 text-white text-right">
        <div className="flex items-center justify-between mb-4"><div><p className="text-white/70 text-xs mb-0.5">پیشرفت کلی</p><h2 className="text-2xl font-black">{toP(35)}٪</h2></div><div className="text-left"><p className="text-white/70 text-xs">جلسه</p><p className="text-xl font-bold">{toP(3)}/{toP(10)}</p></div></div>
        <div className="flex items-center gap-0">
          {["ارزیابی", "مشاوره", "درمان", "بازیابی"].map((s, i) => (
            <div key={s} className="flex items-center flex-1"><div className="flex flex-col items-center"><div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${i < 2 ? "bg-white" : i === 2 ? "bg-white/40 border-2 border-white" : "bg-white/20"}`}>{i < 2 && <Check size={12} className="text-primary" strokeWidth={3} />}{i === 2 && <div className="w-2 h-2 bg-white rounded-full" />}</div><span className="text-[9px] text-white/80 mt-1">{s}</span></div>{i < 3 && <div className={`h-0.5 flex-1 mx-0.5 mb-4 ${i < 2 ? "bg-white/60" : "bg-white/20"}`} />}</div>
          ))}
        </div>
      </button>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[{ id: "prescription", label: "نسخه" }, { id: "plan", label: "برنامه" }, { id: "tasks", label: "کارهای امروز" }, { id: "timeline", label: "تاریخچه" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "prescription" && (
        <div className="space-y-3 pb-4">
          {meds.map((med) => (
            <button key={med.id} onClick={() => navigateScreen("MedicationDetail", { medId: med.id })} className="w-full bg-white rounded-2xl border border-border shadow-sm p-4 text-right">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0"><Pill size={18} className="text-amber-600" /></div>
                <div className="flex-1"><p className="font-bold text-sm text-foreground">{med.name}</p><p className="text-xs text-muted-foreground mt-0.5">{med.dose} · {med.time}</p><span className="text-[10px] text-primary font-semibold">{med.duration}</span></div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${med.taken ? "bg-primary" : "bg-muted border-2 border-border"}`}>{med.taken && <Check size={14} className="text-white" strokeWidth={3} />}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-2.5 pb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">{toP(tasks.filter((t: Task) => t.done).length)} از {toP(tasks.length)} انجام شد</p>
          </div>
          {tasks.map((task: Task) => (
            <motion.div key={task.id} layout onClick={() => toggleTask(task.id)}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${task.done ? "bg-accent border-primary/20" : "bg-white border-border shadow-sm"}`}>
              <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.done ? "bg-primary border-primary" : "border-border bg-white"}`}>
                {task.done && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={14} className="text-white" strokeWidth={3} /></motion.div>}
              </div>
              <span className={`text-sm font-medium flex-1 ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.text}</span>
            </motion.div>
          ))}
        </div>
      )}

      {tab === "plan" && (
        <div className="space-y-3 pb-4">
          {PLAN_SECTIONS.map(section => {
            const Icon = section.icon;
            const isOpen = expanded === section.id;
            return (
              <div key={section.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : section.id)} className="w-full flex items-center gap-3 p-4"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${section.color}`}><Icon size={17} /></div><span className="flex-1 text-right font-bold text-sm text-foreground">{section.title}</span>{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</button>
                <AnimatePresence>
                  {isOpen && <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden"><div className="px-4 pb-4 space-y-2 border-t border-border">{section.items.map((item, i) => <button key={i} onClick={() => navigateScreen(section.id === "exercises" ? "ExerciseDetail" : "SessionDetail")} className="w-full flex items-start gap-2 pt-2 text-right"><div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" /><span className="text-sm text-foreground/80 flex-1">{item}</span><ChevronLeft size={14} className="text-muted-foreground mt-0.5" /></button>)}</div></motion.div>}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-0 pb-4">
          {TIMELINE.map((event, i) => {
            const Icon = event.icon;
            return <div key={i} className="flex gap-3 pb-4"><div className="flex flex-col items-center"><div className={`w-9 h-9 rounded-2xl ${event.color} flex items-center justify-center flex-shrink-0`}><Icon size={17} /></div>{i < 4 && <div className="w-0.5 flex-1 bg-border mt-1 min-h-[20px]" />}</div><div className="flex-1 pt-1"><p className="text-sm font-bold text-foreground">{event.title}</p><p className="text-xs text-muted-foreground mt-0.5">{event.desc}</p><span className="text-[10px] text-primary font-semibold mt-0.5 block">{event.date}</span></div></div>;
          })}
        </div>
      )}
    </div>
  );
}
