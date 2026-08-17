"use client";

import { useState } from "react";
import { Calendar, MapPin, Plus, Video } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { APPOINTMENTS } from "@/lib/data/appointments";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { useUiStore } from "@/stores/ui";

export default function AppointmentsPage() {
  const navigateScreen = useScreenNavigation();
  const setSheet = useUiStore((s) => s.setSheet);
  const [tab, setTab] = useState<"inperson" | "online">("inperson");
  const filtered = APPOINTMENTS.filter(a => tab === "online" ? a.online : !a.online);
  return (
    <div className="px-4 space-y-4">
      <div className="flex items-center justify-between pt-3 pb-1">
        <div><h1 className="text-xl font-bold text-foreground">ویزیت‌ها</h1><p className="text-sm text-muted-foreground mt-0.5">مدیریت نوبت‌های درمانی</p></div>
      </div>
      <div className="bg-muted rounded-2xl p-1 flex gap-1">
        {[{ id: "inperson" as const, label: "حضوری" }, { id: "online" as const, label: "آنلاین" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}>{t.label}</button>
        ))}
      </div>
      <button onClick={() => navigateScreen("BookStep1")} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">
        <Plus size={18} strokeWidth={2.5} />رزرو نوبت جدید
      </button>
      {filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="نوبتی ثبت نشده" desc="برای رزرو نوبت جدید دکمه بالا را لمس کنید." action="رزرو نوبت" onAction={() => navigateScreen("BookStep1")} />
      ) : (
        <div className="space-y-3 pb-4">
          {filtered.map(apt => (
            <div key={apt.id} className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
              <button onClick={() => navigateScreen("AppointmentDetail", { aptId: apt.id })} className="w-full p-4 text-right">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0"><img src={`https://images.unsplash.com/${apt.img}?w=96&h=96&fit=crop&auto=format`} alt={apt.doctor} className="w-full h-full object-cover" /></div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-sm text-foreground">{apt.doctor}</p><p className="text-xs text-muted-foreground mt-0.5">{apt.specialty}</p></div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${apt.statusColor}`}>{apt.status}</span>
                </div>
                <div className="bg-muted/60 rounded-2xl p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-foreground/70"><Calendar size={12} className="text-primary" /><span>{apt.date} · ساعت {toP(apt.time)}</span></div>
                  {!apt.online && <div className="flex items-center gap-2 text-xs text-foreground/70"><MapPin size={12} className="text-primary" /><span>کلینیک سبز زندگی - ولنجک</span></div>}
                  {apt.online && <div className="flex items-center gap-2 text-xs text-foreground/70"><Video size={12} className="text-primary" /><span>ویزیت آنلاین</span></div>}
                </div>
              </button>
              <div className={`grid border-t border-border ${apt.online ? "grid-cols-2" : "grid-cols-3"}`}>
                {apt.online ? (<><button onClick={() => setSheet({ type: "appointmentCancel" })} className="py-3.5 text-muted-foreground text-xs font-semibold border-l border-border">تغییر زمان</button><button onClick={() => navigateScreen("OnlineWaitingRoom")} className="py-3.5 text-white text-xs font-bold bg-primary">ورود به انتظار</button></>) : (<><button className="py-3.5 text-muted-foreground text-xs font-semibold border-l border-border">مسیریابی</button><button onClick={() => setSheet({ type: "appointmentCancel" })} className="py-3.5 text-muted-foreground text-xs font-semibold border-l border-border">لغو</button><button onClick={() => navigateScreen("AppointmentDetail", { aptId: apt.id })} className="py-3.5 text-primary text-xs font-bold">جزئیات</button></>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
