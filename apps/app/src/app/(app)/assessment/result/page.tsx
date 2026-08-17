"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

const FINDINGS = [
  { title: "تحلیل درد", score: 6, color: "text-amber-600 bg-amber-50", desc: "درد متوسط در ناحیه کمر و گردن." },
  { title: "کیفیت خواب", score: 5, color: "text-blue-600 bg-blue-50", desc: "خواب ناکافی روند درمان را کند می‌کند." },
  { title: "سطح استرس", score: 7, color: "text-rose-600 bg-rose-50", desc: "استرس بالا نیاز به مدیریت فوری دارد." },
];

export default function AssessmentResultPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  return (
    <div>
      <PageHeader title="نتیجه ارزیابی" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-primary rounded-3xl p-6 text-white text-center">
          <p className="text-white/70 text-sm mb-1">امتیاز کلی سلامت</p>
          <motion.p className="text-5xl font-black" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>{toP(68)}</motion.p>
          <p className="text-white/80 text-sm mt-2">وضعیت: نیاز به توجه</p>
        </div>
        {FINDINGS.map(item => (
          <div key={item.title} className={`${item.color} rounded-2xl p-4 border border-current/10`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold">{item.title}</p>
              <span className="text-lg font-black">{toP(item.score)}/۱۰</span>
            </div>
            <p className="text-xs opacity-80">{item.desc}</p>
          </div>
        ))}
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-3">درمان‌های پیشنهادی</p>
          {["آکوپانکچر هفتگی", "مدیریت استرس و مدیتیشن", "بهبود بهداشت خواب", "تغذیه ضدالتهابی"].map((r, i) => (
            <div key={r} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{toP(i + 1)}</div>
              <span className="text-sm text-foreground">{r}</span>
            </div>
          ))}
        </div>
        <button onClick={() => navigateScreen("MezajDetail")} className="w-full bg-amber-50 text-amber-700 rounded-2xl py-4 font-bold text-sm border border-amber-200 flex items-center justify-center gap-2">
          <Sparkles size={18} />مشاهده مزاج شما
        </button>
        <button onClick={() => navigateScreen("BookStep1")} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20">رزرو مشاوره با دکتر</button>
      </div>
    </div>
  );
}
