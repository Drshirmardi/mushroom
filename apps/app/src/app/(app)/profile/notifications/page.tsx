"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";

const ITEMS = [
  { key: "meds", label: "یادآوری مصرف دارو", desc: "هر بار موقع مصرف" },
  { key: "apts", label: "یادآوری نوبت", desc: "۲۴ ساعت و ۱ ساعت قبل" },
  { key: "updates", label: "به‌روزرسانی درمان", desc: "تغییرات نسخه و برنامه" },
  { key: "offers", label: "پیشنهادات فروشگاه", desc: "تخفیف‌ها" },
  { key: "articles", label: "مقالات جدید", desc: "محتوای آموزشی" },
] as const;

type SettingsState = Record<(typeof ITEMS)[number]["key"], boolean>;

export default function NotifSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsState>({ meds: true, apts: true, updates: true, offers: false, articles: true });
  return (
    <div>
      <PageHeader title="تنظیمات اعلان" onBack={() => router.back()} />
      <div className="px-4 pb-4">
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {ITEMS.map((item, i) => <div key={item.key} className={`flex items-center gap-3 p-4 ${i < ITEMS.length - 1 ? "border-b border-border" : ""}`}><div className="flex-1"><p className="text-sm font-semibold text-foreground">{item.label}</p><p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p></div><button onClick={() => setSettings(s => ({ ...s, [item.key]: !s[item.key] }))} className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${settings[item.key] ? "bg-primary" : "bg-muted"}`}><div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${settings[item.key] ? "left-[26px]" : "left-0.5"}`} /></button></div>)}
        </div>
      </div>
    </div>
  );
}
