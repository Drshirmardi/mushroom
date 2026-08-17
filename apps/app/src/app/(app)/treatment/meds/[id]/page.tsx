"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Pill, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MEDS } from "@/lib/data/catalog";
import { useMedsStore } from "@/stores/meds";

export default function MedicationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const med = MEDS.find(m => m.id === params?.id) || MEDS[0];
  const markMed = useMedsStore((s) => s.markMed);
  const [taken, setTaken] = useState(med.taken);
  return (
    <div>
      <PageHeader title="جزئیات دارو" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-4 mb-5"><div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0"><Pill size={30} className="text-amber-600" /></div><div><h2 className="text-lg font-bold text-foreground">{med.name}</h2><p className="text-sm text-muted-foreground">{med.dose} · {med.duration}</p></div></div>
          {[["زمان مصرف", med.time], ["مقدار", med.dose], ["دوره درمان", med.duration]].map(([k, v]) => <div key={k} className="flex items-center justify-between py-3 border-b border-border last:border-0"><span className="text-sm text-muted-foreground">{k}</span><span className="text-sm font-bold text-foreground">{v}</span></div>)}
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4"><p className="text-xs font-bold text-blue-700 mb-1">دستورالعمل مصرف</p><p className="text-sm text-blue-800">{med.notes}</p></div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4"><p className="text-xs font-bold text-amber-700 mb-1">عوارض احتمالی</p><p className="text-sm text-amber-800">{med.sideEffects}</p></div>
        <div className="grid grid-cols-3 gap-2">
          {[["شنبه", true], ["یکشنبه", true], ["دوشنبه", false], ["سه‌شنبه", true], ["چهارشنبه", false], ["پنجشنبه", false]].map(([d, done]) => <div key={d as string} className={`rounded-xl p-2 text-center border ${done ? "bg-green-50 border-green-200" : "bg-muted border-border"}`}><p className="text-[10px] text-muted-foreground">{d as string}</p>{done ? <Check size={14} className="text-green-600 mx-auto mt-0.5" strokeWidth={3} /> : <X size={14} className="text-muted-foreground mx-auto mt-0.5" />}</div>)}
        </div>
        <button onClick={() => { setTaken(!taken); markMed(med.id); }} className={`w-full rounded-2xl py-4 font-bold text-sm active:scale-[0.98] transition-all ${taken ? "bg-accent text-primary border border-primary/20" : "bg-primary text-white shadow-md shadow-primary/20"}`}>{taken ? "✓ مصرف شد - لغو علامت" : "علامت‌گذاری به عنوان مصرف شده"}</button>
        <button className="w-full bg-muted text-foreground rounded-2xl py-3 font-semibold text-sm">تنظیم یادآوری</button>
      </div>
    </div>
  );
}
