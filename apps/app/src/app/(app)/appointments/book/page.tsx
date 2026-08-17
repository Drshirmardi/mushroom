"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DOCTORS } from "@/lib/data/catalog";
import { useScreenNavigation } from "@/lib/navigation";

function BookStep1() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigateScreen = useScreenNavigation();
  const [selected, setSelected] = useState(searchParams.get("preselectedDoctor") || "");
  return (
    <div>
      <PageHeader title="انتخاب پزشک" onBack={() => router.back()} />
      <div className="px-4 space-y-3 pb-4">
        <div className="bg-muted/60 rounded-2xl p-3 flex items-center gap-2 mb-4"><div className="flex gap-1">{[1, 2, 3].map(s => <div key={s} className={`w-6 h-1.5 rounded-full ${s === 1 ? "bg-primary" : "bg-muted"}`} />)}</div><span className="text-xs text-muted-foreground">مرحله ۱ از ۳: انتخاب پزشک</span></div>
        {DOCTORS.map(d => (
          <button key={d.id} onClick={() => setSelected(d.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-right transition-all ${selected === d.id ? "bg-accent border-primary/40" : "bg-white border-border shadow-sm"}`}>
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"><img src={`https://images.unsplash.com/${d.img}?w=112&h=112&fit=crop&auto=format`} alt={d.name} className="w-full h-full object-cover" /></div>
            <div className="flex-1 min-w-0"><p className="font-bold text-sm text-foreground">{d.name}</p><p className="text-xs text-muted-foreground mt-0.5">{d.specialty} · {d.exp}</p><div className="flex items-center gap-1 mt-1"><Star size={11} className="text-amber-400 fill-amber-400" /><span className="text-xs font-semibold text-foreground">{d.rating}</span></div></div>
            {selected === d.id && <Check size={18} className="text-primary" strokeWidth={2.5} />}
          </button>
        ))}
        <button disabled={!selected} onClick={() => navigateScreen("BookStep2", { doctorId: selected })} className={`w-full rounded-2xl py-4 font-bold text-sm mt-4 transition-all ${selected ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-muted text-muted-foreground"}`}>ادامه</button>
      </div>
    </div>
  );
}

export default function BookStep1Page() {
  return (
    <Suspense fallback={null}>
      <BookStep1 />
    </Suspense>
  );
}
