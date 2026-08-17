"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

const DAYS = [
  { day: "شنبه", date: "۱۲", avail: true },
  { day: "یکشنبه", date: "۱۳", avail: true },
  { day: "دوشنبه", date: "۱۴", avail: false },
  { day: "سه‌شنبه", date: "۱۵", avail: true },
  { day: "چهارشنبه", date: "۱۶", avail: true },
  { day: "پنجشنبه", date: "۱۷", avail: true },
];
const TIMES = ["۹:۰۰", "۱۰:۰۰", "۱۱:۳۰", "۱۳:۰۰", "۱۵:۳۰", "۱۶:۳۰", "۱۷:۰۰", "۱۸:۳۰"];

function BookStep2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigateScreen = useScreenNavigation();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  return (
    <div>
      <PageHeader title="انتخاب زمان" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-muted/60 rounded-2xl p-3 flex items-center gap-2"><div className="flex gap-1">{[1, 2, 3].map(s => <div key={s} className={`w-6 h-1.5 rounded-full ${s <= 2 ? "bg-primary" : "bg-muted"}`} />)}</div><span className="text-xs text-muted-foreground">مرحله ۲ از ۳: انتخاب زمان</span></div>
        <div><p className="text-sm font-bold text-foreground mb-3">مرداد ۱۴۰۳</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {DAYS.map((d, i) => <button key={i} disabled={!d.avail} onClick={() => setSelectedDay(i)} className={`flex-shrink-0 flex flex-col items-center gap-1 w-14 py-3 rounded-2xl border transition-all ${!d.avail ? "opacity-40 bg-muted border-muted" : selectedDay === i ? "bg-primary border-primary text-white" : "bg-white border-border shadow-sm"}`}><span className={`text-[10px] font-semibold ${selectedDay === i ? "text-white/80" : "text-muted-foreground"}`}>{d.day}</span><span className={`text-base font-black ${selectedDay === i ? "text-white" : "text-foreground"}`}>{toP(d.date)}</span></button>)}
          </div>
        </div>
        {selectedDay !== null && <div><p className="text-sm font-bold text-foreground mb-3">ساعت‌های موجود</p><div className="grid grid-cols-4 gap-2">{TIMES.map(t => <button key={t} onClick={() => setSelectedTime(t)} className={`py-3 rounded-xl text-sm font-bold transition-all border ${selectedTime === t ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border shadow-sm"}`}>{toP(t)}</button>)}</div></div>}
        <button disabled={selectedDay === null || !selectedTime} onClick={() => navigateScreen("BookStep3", { doctorId: searchParams.get("doctorId") || "", day: selectedDay, time: selectedTime })} className={`w-full rounded-2xl py-4 font-bold text-sm transition-all ${selectedDay !== null && selectedTime ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-muted text-muted-foreground"}`}>ادامه</button>
      </div>
    </div>
  );
}

export default function BookStep2Page() {
  return (
    <Suspense fallback={null}>
      <BookStep2 />
    </Suspense>
  );
}
