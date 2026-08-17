"use client";

import { Check } from "lucide-react";
import { SectionCard } from "@/components/shared";
import type { Patient } from "@/data/patients";

export function TraditionalMedicineTab({ pt }: { pt: Patient }) {
  const [consti] = pt.constitution.split(" - ");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[{ label: "مزاج غالب", value: consti, color: "bg-amber-100 text-amber-800" }, { label: "مزاج ثانوی", value: pt.constitution.split(" - ")[1] ?? "—", color: "bg-orange-100 text-orange-800" }, { label: "تاریخ ارزیابی", value: "۱۴۰۳/۰۴/۱۰", color: "bg-blue-100 text-blue-700" }].map((s, i) => (
          <div key={i} className={`rounded-2xl p-5 ${s.color}`}><p className="text-xl font-bold mb-1">{s.value}</p><p className="text-xs font-medium">{s.label}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <SectionCard title="تحلیل پزشک">
          <p className="text-sm text-foreground leading-7">بیمار دارای مزاج {consti} غالب است. بر اساس طب سنتی ایرانی، توصیه می‌شود از غذاهای سرد و تر پرهیز شود و برنامه ورزشی منظم حفظ گردد.</p>
        </SectionCard>
        <SectionCard title="توصیه‌های سبک زندگی">
          <div className="space-y-2">
            {["خواب منظم ۸-۷ ساعت", "ورزش سبک صبحگاهی ۳۰ دقیقه", "کاهش غذاهای تند", "دمنوش بابونه و زنجبیل", "حمام گرم دو بار هفتگی"].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm"><Check size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />{item}</div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="توصیه‌های تغذیه‌ای">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs font-bold text-emerald-700 mb-2">✓ مجاز</p>{["انار", "سیب ترش", "کرفس", "گوشت سفید", "زیتون"].map((f, i) => <p key={i} className="text-xs py-0.5">{f}</p>)}</div>
            <div><p className="text-xs font-bold text-red-600 mb-2">✗ ممنوع</p>{["غذای چرب", "قند زیاد", "نوشیدنی سرد", "فست فود", "نمک زیاد"].map((f, i) => <p key={i} className="text-xs py-0.5">{f}</p>)}</div>
          </div>
        </SectionCard>
        <SectionCard title="داروهای سنتی">
          <div className="space-y-2">
            {[["عسل طبیعی", "روزانه ۱ قاشق"], ["سیاهدانه", "۰.۵ قاشق با عسل"], ["زعفران", "دمنوش ۳ بار هفته"]].map(([n, d], i) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0"><span className="font-medium">{n}</span><span className="text-xs text-muted-foreground">{d}</span></div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
