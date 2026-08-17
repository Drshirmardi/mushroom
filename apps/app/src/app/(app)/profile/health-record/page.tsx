"use client";

import { useRouter } from "next/navigation";
import { Activity, BarChart2, Calendar, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DEFAULT_MEZAJ, MEZAJ_TYPES } from "@/lib/data/mezaj";
import { toP } from "@/lib/format";

const SECTIONS = [
  { icon: Calendar, label: "ویزیت‌ها", count: 12, color: "bg-blue-50 text-blue-600", items: ["دکتر شیرمردی - ۱۰ مرداد", "دکتر میرزایی - ۲ مرداد"] },
  { icon: FileText, label: "نسخه‌ها", count: 5, color: "bg-amber-50 text-amber-600", items: ["نسخه ۵ مرداد", "نسخه ۱ تیر"] },
  { icon: Activity, label: "ارزیابی‌ها", count: 3, color: "bg-purple-50 text-purple-600", items: ["ارزیابی فردی - ۵ مرداد", "ارزیابی درد - ۱ مرداد"] },
  { icon: BarChart2, label: "گزارش‌های سلامت", count: 8, color: "bg-green-50 text-green-600", items: ["گزارش پیشرفت - هفتگی"] },
];

export default function HealthRecordPage() {
  const router = useRouter();
  const mezaj = MEZAJ_TYPES.find(m => m.id === DEFAULT_MEZAJ) || MEZAJ_TYPES[3];
  return (
    <div>
      <PageHeader title="پرونده سلامت" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        {/* Health overview */}
        <div className="bg-primary rounded-3xl p-5 text-white">
          <div className="flex items-center justify-between mb-4"><div><p className="text-white/70 text-xs mb-0.5">خلاصه سلامت</p><h2 className="text-lg font-bold">مریم احمدی</h2></div><div className="text-left"><p className="text-white/70 text-xs">امتیاز</p><p className="text-2xl font-black">{toP(72)}</p></div></div>
          <div className="grid grid-cols-3 gap-2">
            {[{ l: "گروه خونی", v: "A+" }, { l: "مزاج", v: mezaj.name }, { l: "درمان", v: `${toP(3)}/${toP(10)}` }].map(item => <div key={item.l} className="bg-white/10 rounded-xl p-2.5 text-center"><p className="text-white font-black text-sm">{item.v}</p><p className="text-white/60 text-[10px] mt-0.5">{item.l}</p></div>)}
          </div>
        </div>
        {/* Sections */}
        <div className="space-y-3">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-border shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}><Icon size={17} /></div>
                  <p className="text-sm font-bold text-foreground flex-1">{s.label}</p>
                  <span className="text-xs text-muted-foreground">{toP(s.count)} مورد</span>
                </div>
                {s.items.map((item, i) => <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0"><div className="w-1.5 h-1.5 bg-primary/40 rounded-full" /><span className="text-sm text-foreground/70">{item}</span></div>)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
