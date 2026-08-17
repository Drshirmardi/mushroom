"use client";

import { useRouter } from "next/navigation";
import { Video } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

export default function OnlineWaitingRoomPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  return (
    <div>
      <PageHeader title="اتاق انتظار" onBack={() => router.back()} />
      <div className="px-4 space-y-5 pb-4 text-center">
        <div className="bg-primary rounded-3xl p-6 text-white">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 border-4 border-white/30"><img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=160&h=160&fit=crop" alt="دکتر" className="w-full h-full object-cover" /></div>
          <p className="text-white/70 text-sm">دکتر سید ابوالفتح شیرمردی</p>
          <p className="text-lg font-bold mt-0.5">مشاوره پیگیری</p>
        </div>
        <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground mb-2">جلسه در</p>
          <p className="text-4xl font-black text-primary">{toP("5:42")}</p>
          <p className="text-xs text-muted-foreground mt-2">دیگر شروع می‌شود</p>
          <div className="flex items-center justify-center gap-2 mt-4"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-xs text-green-600 font-semibold">دکتر متصل است</span></div>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-right">
          <p className="text-xs font-bold text-amber-700 mb-2">یادآوری قبل از جلسه</p>
          {["لیست علائم خود را آماده کنید", "داروها و نسخه‌های قبلی را در دسترس داشته باشید"].map((r, i) => <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" /><p className="text-xs text-amber-800">{r}</p></div>)}
        </div>
        <button onClick={() => navigateScreen("ConsultationSummary")} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20 flex items-center justify-center gap-2"><Video size={18} />ورود به جلسه</button>
      </div>
    </div>
  );
}
