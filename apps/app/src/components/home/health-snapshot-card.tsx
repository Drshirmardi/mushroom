"use client";

import { Activity, ChevronLeft, Heart, Sparkles } from "lucide-react";
import { toP } from "@/lib/format";
import { MEZAJ_TYPES } from "@/lib/data/mezaj";
import { useScreenNavigation } from "@/lib/navigation";
import { DEFAULT_MEZAJ } from "@/lib/data/mezaj";

export function HealthSnapshotCard({ mezaj = DEFAULT_MEZAJ }: { mezaj?: string }) {
  const navigateScreen = useScreenNavigation();
  const m = MEZAJ_TYPES.find((x) => x.id === mezaj) || MEZAJ_TYPES[3];
  return (
    <button type="button" onClick={() => navigateScreen("HealthRecord")} className="w-full bg-white rounded-3xl border border-border shadow-sm p-4 text-right">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-foreground">خلاصه سلامت</span>
        <ChevronLeft size={16} className="text-muted-foreground" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "مزاج", val: m.name, icon: Sparkles, color: "text-amber-600 bg-amber-50" },
          { label: "گروه خونی", val: "A+", icon: Heart, color: "text-red-500 bg-red-50" },
          { label: "درمان", val: `${toP(3)}/${toP(10)}`, icon: Activity, color: "text-primary bg-accent" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex flex-col items-center gap-1.5 bg-muted/60 rounded-2xl py-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.color}`}><Icon size={15} /></div>
              <span className="text-xs font-black text-foreground">{item.val}</span>
              <span className="text-[9px] text-muted-foreground">{item.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 bg-primary/5 rounded-xl p-2.5">
        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
          <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=48&h=48&fit=crop" alt="دکتر" className="w-full h-full object-cover" />
        </div>
        <span className="text-xs text-foreground">دکتر شیرمردی · نوبت یکشنبه ۱۴ مرداد</span>
        <span className="mr-auto text-[10px] text-primary font-bold">← جزئیات</span>
      </div>
    </button>
  );
}
