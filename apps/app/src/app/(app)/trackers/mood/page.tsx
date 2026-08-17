"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { moodData } from "@/lib/data/charts";
import { toP } from "@/lib/format";

const MOODS = [
  { emoji: "😞", label: "خیلی بد", val: 1 },
  { emoji: "😔", label: "بد", val: 2 },
  { emoji: "😐", label: "معمولی", val: 3 },
  { emoji: "🙂", label: "خوب", val: 4 },
  { emoji: "😊", label: "عالی", val: 5 },
];

export default function MoodTrackerPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [stress, setStress] = useState(4);
  const [energy, setEnergy] = useState(6);
  return (
    <div>
      <PageHeader title="ردیابی خلق‌وخو" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-4">حال امروز چطور هستید؟</p>
          <div className="flex justify-between">
            {MOODS.map(m => (
              <button key={m.val} onClick={() => setSelected(m.val)} className={`flex flex-col items-center gap-1.5 transition-all ${selected === m.val ? "scale-110" : "opacity-60"}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${selected === m.val ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"}`}>{m.emoji}</div>
                <span className="text-[10px] font-semibold text-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
        {[{ label: "ساعت خواب", value: sleep, set: setSleep, min: 0, max: 12, unit: "ساعت", color: "text-blue-600" }, { label: "سطح استرس", value: stress, set: setStress, min: 0, max: 10, unit: "/۱۰", color: "text-rose-600" }, { label: "سطح انرژی", value: energy, set: setEnergy, min: 0, max: 10, unit: "/۱۰", color: "text-amber-600" }].map(item => (
          <div key={item.label} className="bg-white rounded-3xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3"><p className="text-sm font-bold text-foreground">{item.label}</p><span className={`text-lg font-black ${item.color}`}>{toP(item.value)}<span className="text-xs">{item.unit}</span></span></div>
            <input type="range" min={item.min} max={item.max} value={item.value} onChange={e => item.set(Number(e.target.value))} className="w-full accent-[#1b5e3b] h-2 rounded-full cursor-pointer" />
          </div>
        ))}
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-3">روند هفتگی</p>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={moodData}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: "Vazirmatn" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: "Vazirmatn", fontSize: 11, borderRadius: 12 }} />
              <Line type="monotone" dataKey="mood" stroke="#1b5e3b" strokeWidth={2} dot={false} name="خلق" />
              <Line type="monotone" dataKey="sleep" stroke="#3b82f6" strokeWidth={2} dot={false} name="خواب" />
              <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} dot={false} name="انرژی" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <button onClick={() => router.back()} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm active:scale-[0.98] transition-transform">ثبت حال امروز</button>
      </div>
    </div>
  );
}
