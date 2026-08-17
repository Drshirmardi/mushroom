"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { useScreenNavigation } from "@/lib/navigation";
import { useUiStore } from "@/stores/ui";

export default function AppointmentDetailPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  const setSheet = useUiStore((s) => s.setSheet);
  return (
    <div>
      <PageHeader title="جزئیات نوبت" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0"><img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=128&h=128&fit=crop" alt="دکتر" className="w-full h-full object-cover" /></div>
            <div><h2 className="text-base font-bold text-foreground">دکتر سید ابوالفتح شیرمردی</h2><p className="text-sm text-muted-foreground">متخصص طب سنتی</p><button onClick={() => navigateScreen("DoctorProfile", { doctorId: "d1" })} className="text-xs text-primary font-semibold mt-1">مشاهده پروفایل ←</button></div>
          </div>
          {[["تاریخ", "یکشنبه ۱۴ مرداد ۱۴۰۳"], ["ساعت", "۱۰:۰۰ صبح"], ["مکان", "کلینیک سبز زندگی - ولنجک"], ["نوع", "آکوپانکچر - جلسه سوم"]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2.5 border-b border-border last:border-0"><span className="text-sm text-muted-foreground">{k}</span><span className="text-sm font-bold text-foreground">{v}</span></div>
          ))}
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4"><p className="text-xs font-bold text-amber-700 mb-1">یادآوری مهم</p><p className="text-sm text-amber-800">۱۵ دقیقه قبل از ویزیت حاضر شوید. پوشیدن لباس راحت توصیه می‌شود.</p></div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setSheet({ type: "appointmentCancel" })} className="py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm border border-red-100">لغو نوبت</button>
          <button className="py-4 bg-muted text-foreground rounded-2xl font-bold text-sm">تغییر زمان</button>
        </div>
        <button className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20">مسیریابی به کلینیک</button>
      </div>
    </div>
  );
}
