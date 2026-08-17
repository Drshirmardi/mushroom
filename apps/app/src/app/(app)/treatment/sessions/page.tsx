"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useScreenNavigation } from "@/lib/navigation";

export default function SessionDetailPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  return (
    <div>
      <PageHeader title="جزئیات جلسه" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-primary rounded-3xl p-5 text-white"><p className="text-white/70 text-xs">جلسه سوم</p><h2 className="text-xl font-bold mt-1">آکوپانکچر ستون فقرات</h2><p className="text-white/70 text-sm mt-2">یکشنبه ۱۴ مرداد · ساعت ۱۰:۰۰</p></div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3"><p className="text-sm font-bold text-foreground">اهداف جلسه</p>{["کاهش التهاب ستون فقرات", "بهبود گردش خون ناحیه کمری", "کاهش اسپاسم عضلانی"].map((g, i) => <div key={i} className="flex items-center gap-2"><div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center"><Check size={11} className="text-primary" strokeWidth={3} /></div><span className="text-sm text-foreground">{g}</span></div>)}</div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">مراقبت‌های بعد از جلسه</p><p className="text-sm text-foreground/80 leading-7">۲۴ ساعت از حرکات ناگهانی پرهیز کنید. نوشیدن آب فراوان توصیه می‌شود.</p></div>
        <button onClick={() => navigateScreen("BookStep1")} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20">رزرو جلسه بعدی</button>
      </div>
    </div>
  );
}
