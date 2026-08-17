"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/shared/page-header";
import { WIZARD_CONFIGS } from "@/lib/data/assessments";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

export default function AssessmentWizardPage() {
  const router = useRouter();
  const params = useParams<{ type: string }>();
  const navigateScreen = useScreenNavigation();
  const type = params?.type || "individual";
  const [step, setStep] = useState(0);

  const config = WIZARD_CONFIGS[type] || WIZARD_CONFIGS.individual;
  const totalSteps = config.steps.length;

  const genericQuestions = [
    <div key={0} className="space-y-3">
      <p className="text-sm font-semibold text-foreground mb-2">اطلاعات پایه‌ای</p>
      {[{ l: "نام", v: "مریم احمدی" }, { l: "سن", v: "۳۵" }].map(f => (
        <div key={f.l}><label className="text-xs font-bold text-muted-foreground block mb-1">{f.l}</label>
          <input defaultValue={f.v} className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-right" dir="rtl" /></div>
      ))}
    </div>,
    <div key={1} className="space-y-2">
      <p className="text-sm font-semibold text-foreground mb-2">علائم را انتخاب کنید</p>
      {["درد مزمن", "سردرد", "بی‌خوابی", "اضطراب", "خستگی مزمن", "مشکلات گوارشی"].map(s => (
        <button key={s} className="w-full flex items-center justify-between p-3.5 rounded-2xl border bg-white border-border text-right text-sm font-medium text-foreground">{s}<div className="w-5 h-5 rounded-full border-2 border-border" /></button>
      ))}
    </div>,
    <div key={2} className="space-y-4">
      <p className="text-sm font-semibold text-foreground">شدت درد خود را از ۱ تا ۱۰ ارزیابی کنید</p>
      <div className="bg-white rounded-3xl border border-border p-5">
        <div className="flex justify-between mb-3">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <div key={n} className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${n <= 5 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{toP(n)}</div>)}</div>
        <p className="text-center text-sm font-bold text-primary">{toP(5)}/۱۰</p>
      </div>
    </div>,
  ];

  const mezajQuestions = [
    <div key={0} className="space-y-3">
      <p className="text-sm font-semibold text-foreground">ظاهر جسمی شما به کدام گزینه نزدیک‌تر است؟</p>
      {["قد بلند، لاغر، پوست خشک", "هیکل معمولی، پوست نرم و چرب", "هیکل تپل، پوست سرد و مرطوب", "قد کوتاه‌تر، هیکل محکم"].map(o => (
        <button key={o} className="w-full p-3.5 rounded-2xl border bg-white border-border text-right text-sm font-medium text-foreground">{o}</button>
      ))}
    </div>,
    <div key={1} className="space-y-3">
      <p className="text-sm font-semibold text-foreground">خلق‌وخوی غالب شما چیست؟</p>
      {["شاداب، پرانرژی و اجتماعی", "آرام، صبور و محافظه‌کار", "دقیق، فکری و تحلیل‌گر", "قاطع، رهبر و سریع‌تصمیم"].map(o => (
        <button key={o} className="w-full p-3.5 rounded-2xl border bg-white border-border text-right text-sm font-medium text-foreground">{o}</button>
      ))}
    </div>,
  ];

  const questions = type === "tradmed" ? mezajQuestions : genericQuestions;
  const currentQ = questions[Math.min(step, questions.length - 1)];
  const isLast = step === totalSteps - 1;

  return (
    <div>
      <PageHeader title={config.title} onBack={step === 0 ? () => router.back() : () => setStep(s => s - 1)} />
      <div className="px-4 space-y-5 pb-4">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>مرحله {toP(step + 1)} از {toP(totalSteps)}</span>
            <span>{config.steps[step]}</span>
          </div>
          <div className="bg-muted rounded-full h-2">
            <motion.div className="bg-primary rounded-full h-2" animate={{ width: `${((step + 1) / totalSteps) * 100}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            {currentQ}
          </motion.div>
        </AnimatePresence>
        <button onClick={() => isLast ? navigateScreen(type === "tradmed" ? "MezajDetail" : "AssessmentResult") : setStep(s => s + 1)}
          className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm active:scale-[0.98] transition-transform shadow-md shadow-primary/20">
          {isLast ? (type === "tradmed" ? "مشاهده مزاج من" : "مشاهده نتیجه") : "ادامه"}
        </button>
      </div>
    </div>
  );
}
