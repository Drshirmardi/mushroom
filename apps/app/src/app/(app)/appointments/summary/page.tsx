"use client";

import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

export default function ConsultationSummaryPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  return (
    <div>
      <PageHeader title="خلاصه مشاوره" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3"><CheckCircle size={22} className="text-green-600 flex-shrink-0" /><div><p className="text-sm font-bold text-green-700">جلسه با موفقیت برگزار شد</p><p className="text-xs text-green-600">مدت: ۳۲ دقیقه · ۱۰ مرداد ۱۴۰۳</p></div></div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">خلاصه جلسه</p><p className="text-sm text-foreground/80 leading-7">دکتر شیرمردی وضعیت کمر و گردن شما را بررسی کرد. با توجه به بهبود نسبی، برنامه درمانی ادامه خواهد داشت.</p></div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4"><p className="text-sm font-bold text-foreground mb-3">دستورالعمل‌های جدید</p>
          {["تمرینات کششی گردن را روزانه انجام دهید", "از ماساژ ناحیه کمر با روغن تجویزی استفاده کنید", "مصرف دمنوش آرامش‌بخش را ادامه دهید"].map((i, idx) => <div key={idx} className="flex items-start gap-2 py-2 border-b border-border last:border-0"><div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">{toP(idx + 1)}</div><p className="text-sm text-foreground">{i}</p></div>)}
        </div>
        <button onClick={() => navigateScreen("BookStep1")} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20">رزرو نوبت بعدی</button>
      </div>
    </div>
  );
}
