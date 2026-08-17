"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { toP } from "@/lib/format";

export default function ExerciseDetailPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  return (
    <div>
      <PageHeader title="جزئیات تمرین" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-amber-50 rounded-3xl overflow-hidden"><img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=390&h=180&fit=crop&auto=format" alt="تمرین" className="w-full h-44 object-cover" /><div className="p-4"><h2 className="text-lg font-bold text-foreground">کشش گردن</h2><p className="text-sm text-amber-700 mt-1">۱۰ دقیقه · روزانه صبح · سطح: آسان</p></div></div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">مراحل تمرین</p>
          {["در حالت نشسته، گردن را به آرامی به سمت چپ خم کنید.", "۱۵ ثانیه نگه دارید و به طرف مقابل تکرار کنید.", "این حرکت را ۵ بار برای هر طرف تکرار کنید.", "سپس گردن را به جلو و عقب کشش دهید."].map((step, i) => <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0"><div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{toP(i + 1)}</div><p className="text-sm text-foreground">{step}</p></div>)}
        </div>
        <button onClick={() => setDone(true)} className={`w-full rounded-2xl py-4 font-bold text-sm active:scale-[0.98] transition-all ${done ? "bg-green-50 text-green-700 border border-green-200" : "bg-primary text-white shadow-md shadow-primary/20"}`}>{done ? "✓ تمرین انجام شد!" : "شروع تمرین"}</button>
      </div>
    </div>
  );
}
