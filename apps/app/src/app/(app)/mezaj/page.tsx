"use client";

import { useRouter } from "next/navigation";
import { Leaf, Moon, Sun, Wind } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MEZAJ_TYPES } from "@/lib/data/mezaj";
import { useScreenNavigation } from "@/lib/navigation";

export default function MezajDetailPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  const mezaj = MEZAJ_TYPES[3]; // sodavi
  return (
    <div>
      <PageHeader title="مزاج شما" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl p-6 text-white text-center">
          <div className="text-5xl mb-3">{mezaj.emoji}</div>
          <h2 className="text-2xl font-black mb-1">مزاج {mezaj.name}</h2>
          <p className="text-white/70 text-sm">{mezaj.desc}</p>
          <div className="mt-4 bg-white/10 rounded-2xl p-3"><p className="text-xs text-white/80">تاریخ تشخیص: ۵ مرداد ۱۴۰۳ · دکتر شیرمردی</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <p className="text-sm font-bold text-foreground mb-3">ویژگی‌های مزاج سوداوی</p>
          {["تفکر عمیق و تحلیل‌گری", "حافظه قوی و دقت بالا", "حساسیت عاطفی", "نیاز به برنامه‌ریزی منظم", "تأثیرپذیری از سرما و خشکی"].map((f, i) => (
            <div key={i} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" /><span className="text-sm text-foreground">{f}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <p className="text-sm font-bold text-foreground mb-3">توصیه‌های درمانی برای مزاج سوداوی</p>
          {[{ icon: Leaf, text: "مصرف غذاهای گرم و مرطوب مانند خورشت‌های سنتی" }, { icon: Sun, text: "ورزش منظم در محیط باز و آفتابی" }, { icon: Moon, text: "خواب کافی و منظم بین ۷ تا ۹ ساعت" }, { icon: Wind, text: "پرهیز از محیط‌های سرد و خشک" }].map((r, i) => {
            const Icon = r.icon;
            return <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0"><Icon size={16} className="text-primary mt-0.5 flex-shrink-0" /><span className="text-sm text-foreground">{r.text}</span></div>;
          })}
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
          <p className="text-xs font-bold text-amber-700 mb-2">نظر دکتر شیرمردی</p>
          <p className="text-sm text-amber-800 leading-7">با توجه به مزاج سوداوی شما، برنامه درمانی بر اساس گرم کردن بدن و افزایش رطوبت طراحی شده است.</p>
        </div>
        <button onClick={() => navigateScreen("BookStep1", { doctorId: "d3" })} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20">مشاوره با دکتر طب سنتی</button>
      </div>
    </div>
  );
}
