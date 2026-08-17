"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

export default function SecurityPage() {
  const router = useRouter();
  const [biometric, setBiometric] = useState(true);
  const [twofa, setTwofa] = useState(false);
  return (
    <div>
      <PageHeader title="امنیت" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {[{ label: "ورود با اثر انگشت", state: biometric, toggle: setBiometric }, { label: "تأیید دو مرحله‌ای", state: twofa, toggle: setTwofa }].map((item, i) => <div key={item.label} className={`flex items-center gap-3 p-4 ${i === 0 ? "border-b border-border" : ""}`}><div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center"><Lock size={17} className="text-slate-600" /></div><span className="flex-1 text-sm font-semibold text-foreground">{item.label}</span><button onClick={() => item.toggle(!item.state)} className={`w-12 h-6 rounded-full transition-all relative ${item.state ? "bg-primary" : "bg-muted"}`}><div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${item.state ? "left-[26px]" : "left-0.5"}`} /></button></div>)}
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {[{ label: "تغییر رمز عبور", danger: false }, { label: "جلسات فعال", danger: false }, { label: "حذف حساب", danger: true }].map((item, i) => <button key={item.label} className={`w-full flex items-center gap-3 p-4 active:bg-muted ${i < 2 ? "border-b border-border" : ""}`}><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.danger ? "bg-red-50 text-red-500" : "bg-muted text-muted-foreground"}`}><Lock size={17} /></div><span className={`flex-1 text-sm font-semibold ${item.danger ? "text-red-600" : "text-foreground"}`}>{item.label}</span><ChevronLeft size={15} className="text-muted-foreground" /></button>)}
        </div>
      </div>
    </div>
  );
}
