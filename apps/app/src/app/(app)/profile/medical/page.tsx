"use client";

import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

const SECTIONS = [
  { title: "آلرژی‌ها", items: ["آلرژی به پنی‌سیلین"], color: "bg-red-50 border-red-200 text-red-800" },
  { title: "بیماری‌های مزمن", items: ["سردرد میگرنی", "کمردرد مزمن"], color: "bg-amber-50 border-amber-200 text-amber-800" },
  { title: "داروهای مصرفی", items: ["قرص آهن ۳۲۵ میلی‌گرم"], color: "bg-blue-50 border-blue-200 text-blue-800" },
];

export default function MedicalProfilePage() {
  const router = useRouter();
  return (
    <div>
      <PageHeader title="پروفایل پزشکی" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        {SECTIONS.map(section => (
          <div key={section.title} className={`rounded-2xl border p-4 ${section.color}`}>
            <div className="flex items-center justify-between mb-3"><p className="text-sm font-bold">{section.title}</p><button className="w-7 h-7 bg-white/60 rounded-lg flex items-center justify-center"><Plus size={14} /></button></div>
            {section.items.map(item => <div key={item} className="flex items-center justify-between py-1.5 border-b border-current/10 last:border-0"><span className="text-sm">{item}</span><button><Trash2 size={13} className="opacity-60" /></button></div>)}
          </div>
        ))}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          {[["گروه خونی", "A+"], ["قد", "۱۶۵ سانتی‌متر"], ["وزن", "۵۸ کیلوگرم"], ["BMI", "۲۱.۳ (نرمال)"]].map(([k, v]) => <div key={k} className="flex justify-between py-2 border-b border-border last:border-0"><span className="text-sm text-muted-foreground">{k}</span><span className="text-sm font-bold text-foreground">{v}</span></div>)}
        </div>
      </div>
    </div>
  );
}
