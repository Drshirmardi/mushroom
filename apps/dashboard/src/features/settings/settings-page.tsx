"use client";

import {
  Bell, BellOff, CalendarDays, ChevronLeft, Clock, Cpu,
  CreditCard, Edit, Globe, Lock, User, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SettingsSection {
  icon: LucideIcon;
  label: string;
  desc: string;
}

export function SettingsPage() {
  const sections: SettingsSection[] = [
    { icon: User, label: "پروفایل پزشک", desc: "اطلاعات شخصی و تصویر" }, { icon: Clock, label: "ساعات کاری", desc: "روزها و بازه‌های زمانی" },
    { icon: CalendarDays, label: "برنامه کلینیک", desc: "تعطیلات و مرخصی" }, { icon: Wallet, label: "تعرفه مشاوره", desc: "قیمت حضوری و آنلاین" },
    { icon: CreditCard, label: "درگاه پرداخت", desc: "تنظیمات مالی" }, { icon: Bell, label: "اعلان‌ها", desc: "پیامک و نوتیفیکیشن" },
    { icon: Globe, label: "تنظیمات فروشگاه", desc: "ارسال و انبار" }, { icon: Lock, label: "امنیت", desc: "رمز و احراز هویت" },
    { icon: Cpu, label: "اتوماسیون", desc: "قوانین خودکار" }, { icon: BellOff, label: "مدیریت پیامک", desc: "الگوهای پیام" },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">ا</div>
        <div><h2 className="text-lg font-bold">دکتر سید ابوالفتح شیرمردی</h2><p className="text-sm text-muted-foreground">متخصص طب سوزنی — تهران</p></div>
        <button className="mr-auto flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-secondary"><Edit size={15} />ویرایش</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {sections.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer hover:border-primary/30 group transition-all flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors"><s.icon size={20} /></div>
            <div className="flex-1"><p className="font-bold text-sm">{s.label}</p><p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p></div>
            <ChevronLeft size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}
