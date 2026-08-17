"use client";

import { ChevronLeft, Play, User } from "lucide-react";
import { ASSESSMENT_TYPES } from "@/lib/data/assessments";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

export default function AssessmentPage() {
  const navigateScreen = useScreenNavigation();
  return (
    <div className="px-4 space-y-4">
      <div className="pt-3 pb-1">
        <h1 className="text-xl font-bold text-foreground">ارزیابی سلامت</h1>
        <p className="text-sm text-muted-foreground mt-0.5">انتخاب نوع ارزیابی</p>
      </div>

      {/* Last result */}
      <button onClick={() => navigateScreen("AssessmentResult")} className="w-full bg-white rounded-2xl border border-primary/20 shadow-sm p-4 text-right">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-primary">آخرین ارزیابی</p>
          <span className="text-[10px] text-muted-foreground">۵ مرداد</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center"><span className="text-xl font-black text-white">{toP(68)}</span></div>
          <div><p className="text-sm font-semibold text-foreground">ارزیابی فردی</p><p className="text-xs text-muted-foreground">امتیاز: {toP(68)}/۱۰۰ · نیاز به توجه</p></div>
          <ChevronLeft size={16} className="text-muted-foreground mr-auto" />
        </div>
      </button>

      {/* Featured - Individual */}
      <button onClick={() => navigateScreen("AssessmentWizard", { type: "individual" })} className="w-full bg-gradient-to-br from-primary to-[#2d7a52] rounded-3xl p-5 text-white text-right">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><User size={24} className="text-white" /></div>
          <div><p className="text-white/70 text-xs">پیشنهاد دکتر</p><h3 className="text-base font-bold">ارزیابی فردی جامع</h3></div>
        </div>
        <p className="text-white/70 text-sm">بررسی کامل وضعیت جسمی، روحی و سبک زندگی</p>
        <div className="mt-3 flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-2 w-fit"><Play size={13} className="fill-white text-white" /><span className="text-xs font-bold">شروع ارزیابی</span></div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        {ASSESSMENT_TYPES.slice(1).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => navigateScreen("AssessmentWizard", { type: t.id })} className={`bg-white rounded-2xl border p-4 text-right shadow-sm active:scale-[0.98] transition-transform ${t.color}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${t.color}`}><Icon size={19} /></div>
              <p className="text-sm font-bold text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
