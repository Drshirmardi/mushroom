"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { SuccessScreen } from "@/components/shared/success-screen";
import { painData } from "@/lib/data/charts";
import { toP } from "@/lib/format";

export default function PainTrackerPage() {
  const router = useRouter();
  const [pain, setPain] = useState(3);
  const [selectedLoc, setSelectedLoc] = useState("کمر");
  const [saved, setSaved] = useState(false);
  if (saved) return <div><PageHeader title="ثبت درد" onBack={() => setSaved(false)} /><SuccessScreen title="درد ثبت شد!" desc="اطلاعات درد برای دکتر شیرمردی ارسال شد." onDone={() => router.back()} /></div>;
  return (
    <div>
      <PageHeader title="ردیابی درد" onBack={() => router.back()} />
      <div className="px-4 space-y-5 pb-4">
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-4">شدت درد امروز</p>
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button key={n} onClick={() => setPain(n)} className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${pain === n ? "bg-primary text-white scale-125" : pain > n ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{toP(n)}</button>
            ))}
          </div>
          <div className={`mt-3 p-3 rounded-2xl text-center ${pain <= 3 ? "bg-green-50" : pain <= 6 ? "bg-amber-50" : "bg-red-50"}`}>
            <p className={`text-2xl font-black ${pain <= 3 ? "text-green-600" : pain <= 6 ? "text-amber-600" : "text-red-600"}`}>{toP(pain)}/۱۰</p>
            <p className={`text-xs font-semibold mt-1 ${pain <= 3 ? "text-green-700" : pain <= 6 ? "text-amber-700" : "text-red-700"}`}>{pain <= 3 ? "درد خفیف" : pain <= 6 ? "درد متوسط" : "درد شدید"}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-3">محل درد</p>
          <div className="flex flex-wrap gap-2">
            {["گردن", "کمر", "شانه", "سر", "زانو", "مچ دست"].map(loc => (
              <button key={loc} onClick={() => setSelectedLoc(loc)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedLoc === loc ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{loc}</button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-3">روند هفتگی</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={painData}>
              <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1b5e3b" stopOpacity={0.3} /><stop offset="95%" stopColor="#1b5e3b" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: "Vazirmatn" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} hide />
              <Tooltip contentStyle={{ fontFamily: "Vazirmatn", fontSize: 12, borderRadius: 12 }} formatter={(v) => [toP(v as number), "درد"]} />
              <Area type="monotone" dataKey="value" stroke="#1b5e3b" strokeWidth={2.5} fill="url(#pg)" dot={{ fill: "#1b5e3b", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <button onClick={() => setSaved(true)} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">ثبت درد امروز</button>
      </div>
    </div>
  );
}
