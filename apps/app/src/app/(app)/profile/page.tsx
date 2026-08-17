"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart2,
  Bell,
  Camera,
  ChevronLeft,
  Edit2,
  FileText,
  Package,
  Settings,
  Shield,
  Smile,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DEFAULT_MEZAJ, MEZAJ_TYPES } from "@/lib/data/mezaj";

type MenuEntry = { icon: LucideIcon; label: string; color: string; screen: string };

const MENU_SECTIONS: { title: string; items: MenuEntry[] }[] = [
  { title: "اطلاعات پزشکی", items: [
    { icon: FileText, label: "تاریخچه پزشکی", color: "bg-blue-50 text-blue-600", screen: "MedicalHistory" },
    { icon: Activity, label: "پروفایل پزشکی", color: "bg-green-50 text-green-600", screen: "MedicalProfile" },
    { icon: BarChart2, label: "پرونده سلامت", color: "bg-primary/10 text-primary", screen: "HealthRecord" },
    { icon: Smile, label: "ردیابی خلق‌وخو", color: "bg-purple-50 text-purple-600", screen: "MoodTracker" },
  ] },
  { title: "مالی", items: [
    { icon: Wallet, label: "کیف پول", color: "bg-amber-50 text-amber-600", screen: "WalletScreen" },
    { icon: Package, label: "سفارشات من", color: "bg-orange-50 text-orange-600", screen: "OrderHistory" },
  ] },
  { title: "تنظیمات", items: [
    { icon: Bell, label: "اعلان‌ها", color: "bg-indigo-50 text-indigo-600", screen: "NotifSettings" },
    { icon: Shield, label: "امنیت", color: "bg-slate-50 text-slate-600", screen: "SecurityScreen" },
    { icon: Settings, label: "حریم خصوصی", color: "bg-muted text-muted-foreground", screen: "SecurityScreen" },
  ] },
];

export default function ProfilePage() {
  const router = useRouter();
  const mezaj = MEZAJ_TYPES.find(m => m.id === DEFAULT_MEZAJ) || MEZAJ_TYPES[3];
  return (
    <div className="px-4 space-y-5">
      <div className="pt-3 pb-1"><h1 className="text-xl font-bold text-foreground">پروفایل</h1></div>
      {/* Profile card */}
      <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/profile/edit")} className="relative">
            <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden border-2 border-primary/20"><img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=144&h=144&fit=crop&auto=format" alt="مریم" className="w-full h-full object-cover" /></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-white"><Camera size={10} className="text-white" /></div>
          </button>
          <div><h2 className="text-lg font-bold text-foreground">مریم احمدی</h2><p className="text-sm text-muted-foreground">۳۵ ساله · تهران</p><div className="flex items-center gap-1 mt-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full" /><span className="text-xs text-green-600 font-semibold">بیمار فعال</span></div></div>
          <button onClick={() => router.push("/profile/edit")} className="mr-auto w-9 h-9 bg-muted rounded-xl flex items-center justify-center"><Edit2 size={15} className="text-muted-foreground" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          {[{ label: "جلسات", value: "۳" }, { label: "نسخه‌ها", value: "۲" }, { label: "سفارشات", value: "۵" }].map(s => <div key={s.label} className="text-center"><p className="text-lg font-black text-primary">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>)}
        </div>
      </div>

      {/* Mezaj card */}
      <button onClick={() => router.push("/mezaj")} className={`w-full rounded-2xl border p-4 text-right flex items-center gap-3 ${mezaj.color}`}>
        <div className={`w-12 h-12 ${mezaj.badge} rounded-2xl flex items-center justify-center text-xl flex-shrink-0`}>{mezaj.emoji}</div>
        <div className="flex-1"><p className="text-sm font-bold">مزاج {mezaj.name}</p><p className="text-xs opacity-80 mt-0.5">{mezaj.desc}</p></div>
        <ChevronLeft size={16} className="opacity-60" />
      </button>

      {/* Menu sections */}
      {MENU_SECTIONS.map(section => (
        <div key={section.title}>
          <h3 className="text-xs font-bold text-muted-foreground mb-2 px-1">{section.title}</h3>
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {section.items.map((item, i) => { const Icon = item.icon; return <button key={item.label} onClick={() => router.push(SCREEN_PATHS[item.screen] ?? "/")} className={`w-full flex items-center gap-3 p-4 active:bg-muted transition-colors ${i < section.items.length - 1 ? "border-b border-border" : ""}`}><div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}><Icon size={15} /></div><span className="flex-1 text-right text-sm font-semibold text-foreground">{item.label}</span><ChevronLeft size={15} className="text-muted-foreground" /></button>; })}
          </div>
        </div>
      ))}
      <button onClick={() => router.push("/onboarding")} className="w-full bg-accent text-primary rounded-2xl py-3 font-semibold text-sm border border-primary/20 mb-2">تکمیل پروفایل پزشکی</button>
      <button className="w-full bg-red-50 text-red-600 rounded-2xl py-4 font-bold text-sm border border-red-100 mb-4">خروج از حساب</button>
    </div>
  );
}

const SCREEN_PATHS: Record<string, string> = {
  MedicalHistory: "/profile/history",
  MedicalProfile: "/profile/medical",
  HealthRecord: "/profile/health-record",
  MoodTracker: "/trackers/mood",
  WalletScreen: "/profile/wallet",
  OrderHistory: "/store/orders",
  NotifSettings: "/profile/notifications",
  SecurityScreen: "/profile/security",
};
