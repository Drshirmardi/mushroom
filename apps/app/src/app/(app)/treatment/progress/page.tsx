"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { PageHeader } from "@/components/shared/page-header";
import { toP } from "@/lib/format";

const IMPROVEMENTS = [
  { label: "کاهش درد", before: 8, after: 4, color: "bg-rose-500" },
  { label: "کیفیت خواب", before: 4, after: 7, color: "bg-blue-500" },
  { label: "سطح انرژی", before: 3, after: 6, color: "bg-amber-500" },
];

export default function ProgressReportPage() {
  const router = useRouter();
  return (
    <div>
      <PageHeader title="گزارش پیشرفت" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-primary rounded-3xl p-5 text-white text-center"><p className="text-white/70 text-sm mb-1">پیشرفت کلی</p><motion.p className="text-5xl font-black" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>{toP(35)}٪</motion.p><p className="text-white/70 text-sm mt-2">جلسه {toP(3)} از {toP(10)}</p></div>
        {IMPROVEMENTS.map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-bold text-foreground">{item.label}</p><span className="text-xs text-green-600 font-bold">+{toP(item.after - item.before)} بهبود</span></div>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground w-12">قبل</span><div className="flex-1 bg-muted rounded-full h-2"><div className={`${item.color} h-2 rounded-full opacity-40`} style={{ width: `${item.before * 10}%` }} /></div><span className="text-xs text-muted-foreground w-4">{toP(item.before)}</span></div>
              <div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground w-12">الان</span><div className="flex-1 bg-muted rounded-full h-2"><div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.after * 10}%` }} /></div><span className="text-xs font-bold text-foreground w-4">{toP(item.after)}</span></div>
            </div>
          </div>
        ))}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">نظر دکتر</p><p className="text-sm text-foreground/80 leading-7">"بیمار پیشرفت خوبی داشته است. ادامه برنامه فعلی توصیه می‌شود."</p><p className="text-xs text-muted-foreground mt-2">— دکتر سید ابوالفتح شیرمردی · ۱۰ مرداد</p></div>
      </div>
    </div>
  );
}
