"use client";

import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { toP } from "@/lib/format";

const VISITS = [
  { doctor: "دکتر شیرمردی", date: "۱۰ مرداد", type: "آکوپانکچر" },
  { doctor: "دکتر میرزایی", date: "۲ مرداد", type: "تغذیه" },
  { doctor: "دکتر شیرمردی", date: "۲۵ تیر", type: "مشاوره" },
];

const TABS = ["ویزیت‌ها", "نسخه‌ها", "آزمایشات", "پرداخت‌ها"];

export default function MedicalHistoryPage() {
  const router = useRouter();
  return (
    <div>
      <PageHeader title="تاریخچه پزشکی" onBack={() => router.back()} />
      <div className="px-4 space-y-3 pb-4">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">آخرین ویزیت‌ها</p>
          {VISITS.map((v, i) => <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0"><div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center flex-shrink-0"><Calendar size={17} className="text-primary" /></div><div className="flex-1"><p className="text-sm font-bold text-foreground">{v.doctor}</p><p className="text-xs text-muted-foreground">{v.type} · {v.date}</p></div><button className="text-xs text-primary font-bold">نسخه</button></div>)}
        </div>
        {TABS.map(tab => <button key={tab} onClick={() => router.push("/profile/health-record")} className="w-full bg-white rounded-2xl border border-border shadow-sm p-4 flex items-center justify-between"><span className="text-sm font-bold text-foreground">{tab}</span><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{toP(12)} مورد</span><ChevronLeft size={15} className="text-muted-foreground" /></div></button>)}
      </div>
    </div>
  );
}
