"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, CheckCircle } from "lucide-react";
import { toP } from "@/lib/format";
import { useUiStore } from "@/stores/ui";

const STEPS = [
  { title: "خوش آمدید!", sub: "بیایید پرونده پزشکی شما را تکمیل کنیم", icon: "👋" },
  { title: "اطلاعات شخصی", sub: "اطلاعات پایه‌ای شما", icon: "👤" },
  { title: "مشخصات جسمی", sub: "قد، وزن و گروه خونی", icon: "📏" },
  { title: "سابقه پزشکی", sub: "آلرژی و بیماری‌های مزمن", icon: "📋" },
  { title: "سبک زندگی", sub: "خواب، ورزش و استرس", icon: "🌿" },
  { title: "همه چیز آماده است!", sub: "پرونده شما ایجاد شد", icon: "✅" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useUiStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({});

  const goNext = () => { if (step < STEPS.length - 1) setStep(s => s + 1); else { completeOnboarding(); router.push("/"); } };

  const stepContent = [
    <div key={0} className="space-y-4 text-center py-6">
      <div className="text-6xl">{STEPS[0].icon}</div>
      <p className="text-sm text-muted-foreground leading-7">در چند قدم ساده پرونده پزشکی خود را تکمیل کنید تا بهترین مراقبت را دریافت نمایید.</p>
      <div className="flex flex-col gap-2 mt-4 text-right">
        {["ارزیابی سلامت شخصی‌سازی شده", "توصیه‌های درمانی متناسب با مزاج", "ارتباط مستقیم با پزشک"].map(f => (
          <div key={f} className="flex items-center gap-2 bg-accent rounded-xl p-3">
            <Check size={14} className="text-primary" strokeWidth={3} />
            <span className="text-sm font-medium text-foreground">{f}</span>
          </div>
        ))}
      </div>
    </div>,
    <div key={1} className="space-y-3">
      {[{ l: "نام و نام‌خانوادگی", k: "name", v: "مریم احمدی" }, { l: "موبایل", k: "phone", v: "۰۹۱۲۳۴۵۶۷۸۹" }, { l: "سال تولد", k: "birth", v: "۱۳۶۷" }].map(f => (
        <div key={f.k}><label className="text-xs font-bold text-muted-foreground block mb-1">{f.l}</label>
          <input defaultValue={f.v} onChange={e => setData(d => ({ ...d, [f.k]: e.target.value }))} className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-right" dir="rtl" />
        </div>
      ))}
      <div>
        <label className="text-xs font-bold text-muted-foreground block mb-1">جنسیت</label>
        <div className="flex gap-2">
          {["زن", "مرد"].map(g => (
            <button key={g} onClick={() => setData(d => ({ ...d, gender: g }))} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${data.gender === g ? "bg-primary text-white border-primary" : "bg-muted border-border text-foreground"}`}>{g}</button>
          ))}
        </div>
      </div>
    </div>,
    <div key={2} className="space-y-3">
      {[{ l: "قد (سانتی‌متر)", k: "height", v: "۱۶۵" }, { l: "وزن (کیلوگرم)", k: "weight", v: "۵۸" }].map(f => (
        <div key={f.k}><label className="text-xs font-bold text-muted-foreground block mb-1">{f.l}</label>
          <input defaultValue={f.v} className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-right" dir="rtl" />
        </div>
      ))}
      <div>
        <label className="text-xs font-bold text-muted-foreground block mb-1">گروه خونی</label>
        <div className="grid grid-cols-4 gap-2">
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => (
            <button key={b} onClick={() => setData(d => ({ ...d, blood: b }))} className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${data.blood === b ? "bg-primary text-white border-primary" : "bg-muted border-border"}`}>{b}</button>
          ))}
        </div>
      </div>
    </div>,
    <div key={3} className="space-y-3">
      <p className="text-sm font-semibold text-foreground">آلرژی‌های شناخته‌شده</p>
      <div className="flex flex-wrap gap-2">
        {["پنی‌سیلین", "آسپرین", "لاتکس", "گرده گل", "کنجد", "ندارم"].map(a => {
          const sel = (data.allergies || []).includes(a);
          return <button key={a} onClick={() => setData(d => ({ ...d, allergies: sel ? (d.allergies || []).filter((x: string) => x !== a) : [...(d.allergies || []), a] }))}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${sel ? "bg-primary text-white border-primary" : "bg-muted border-border text-foreground"}`}>{a}</button>;
        })}
      </div>
      <p className="text-sm font-semibold text-foreground mt-2">بیماری‌های مزمن</p>
      <div className="flex flex-wrap gap-2">
        {["دیابت", "فشار خون", "قلبی", "تیروئید", "آرتروز", "ندارم"].map(d => {
          const sel = (data.diseases || []).includes(d);
          return <button key={d} onClick={() => setData(x => ({ ...x, diseases: sel ? (x.diseases || []).filter((v: string) => v !== d) : [...(x.diseases || []), d] }))}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${sel ? "bg-rose-500 text-white border-rose-500" : "bg-muted border-border text-foreground"}`}>{d}</button>;
        })}
      </div>
    </div>,
    <div key={4} className="space-y-4">
      {[{ label: "ساعت خواب شبانه", opts: ["کمتر از ۵", "۵ تا ۷", "۷ تا ۹", "بیشتر از ۹"], key: "sleep" },
      { label: "میزان ورزش هفتگی", opts: ["اصلاً نه", "۱-۲ بار", "۳-۴ بار", "روزانه"], key: "exercise" },
      { label: "سطح استرس", opts: ["کم", "متوسط", "زیاد", "خیلی زیاد"], key: "stress" }].map(q => (
        <div key={q.key}>
          <p className="text-sm font-semibold text-foreground mb-2">{q.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {q.opts.map(o => (
              <button key={o} onClick={() => setData(d => ({ ...d, [q.key]: o }))}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${data[q.key] === o ? "bg-primary text-white border-primary" : "bg-muted border-border text-foreground"}`}>{o}</button>
            ))}
          </div>
        </div>
      ))}
    </div>,
    <div key={5} className="text-center py-6 space-y-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 250 }}>
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-600" />
        </div>
      </motion.div>
      <h3 className="text-lg font-bold text-foreground">پرونده شما ساخته شد!</h3>
      <p className="text-sm text-muted-foreground leading-7">اطلاعات شما ثبت شد. اکنون می‌توانید از تمام امکانات برنامه استفاده کنید.</p>
      <div className="bg-primary/5 rounded-2xl p-4 text-right border border-primary/20">
        <p className="text-xs font-bold text-primary mb-2">مرحله بعد پیشنهادی:</p>
        <p className="text-sm text-foreground">ارزیابی اولیه سلامت خود را تکمیل کنید تا مزاج‌تان مشخص شود.</p>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-[#e8ede8] flex items-center justify-center">
      <div className="relative w-full max-w-[720px] h-[100dvh] bg-background flex flex-col shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-6 pb-4">
          <div className="mb-6">
            <div className="flex gap-1 mb-4">
              {STEPS.map((_, i) => <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
            </div>
            <p className="text-xs text-muted-foreground">مرحله {toP(step + 1)} از {toP(STEPS.length)}</p>
            <h2 className="text-xl font-bold text-foreground mt-1">{STEPS[step].title}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[step].sub}</p>
          </div>
          {stepContent[step]}
        </div>
        <div className="px-4 pb-6 pt-2 border-t border-border bg-background flex gap-3">
          {step > 0 && step < STEPS.length - 1 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-4 bg-muted text-foreground rounded-2xl font-bold text-sm">قبلی</button>
          )}
          <button onClick={goNext} className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">
            {step === STEPS.length - 1 ? "شروع استفاده" : "ادامه"}
          </button>
        </div>
      </div>
    </div>
  );
}
