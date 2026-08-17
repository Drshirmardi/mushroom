"use client";

import { useRouter } from "next/navigation";
import { Check, Truck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { toP } from "@/lib/format";

const STEPS = [
  { label: "ثبت سفارش", done: true, date: "امروز ۱۰:۳۰" },
  { label: "تأیید و آماده‌سازی", done: true, date: "امروز ۱۱:۰۰" },
  { label: "تحویل به پست", done: false, date: "فردا" },
  { label: "در مسیر تحویل", done: false, date: "۲ روز دیگر" },
  { label: "تحویل داده شد", done: false, date: "۳-۵ روز دیگر" },
];

export default function OrderTrackingPage() {
  const router = useRouter();
  return (
    <div>
      <PageHeader title="پیگیری سفارش" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><div className="flex justify-between mb-3"><span className="text-sm text-muted-foreground">کد سفارش</span><span className="text-sm font-black text-primary">{toP("ORD-10024")}</span></div><div className="bg-amber-50 rounded-xl p-3 flex items-center gap-2"><Truck size={16} className="text-amber-600" /><span className="text-sm font-semibold text-amber-700">در حال آماده‌سازی</span></div></div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-4">وضعیت سفارش</p>
          {STEPS.map((step, i) => <div key={i} className="flex gap-3 pb-4 last:pb-0"><div className="flex flex-col items-center"><div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-primary" : "bg-muted border-2 border-border"}`}>{step.done ? <Check size={14} className="text-white" strokeWidth={3} /> : <div className="w-2 h-2 bg-border rounded-full" />}</div>{i < STEPS.length - 1 && <div className={`w-0.5 flex-1 mt-1 min-h-[16px] ${step.done ? "bg-primary" : "bg-border"}`} />}</div><div className="pt-1"><p className={`text-sm font-semibold ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p><p className="text-xs text-muted-foreground mt-0.5">{step.date}</p></div></div>)}
        </div>
      </div>
    </div>
  );
}
