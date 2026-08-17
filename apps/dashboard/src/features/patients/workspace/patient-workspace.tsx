"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Edit, Eye, FileText, Lock, Play, Plus, Save } from "lucide-react";
import { APPTS } from "@/data/appointments";
import type { Patient } from "@/data/patients";
import { Avatar, SectionCard, StatusBadge, TypeBadge } from "@/components/shared";
import { fm, p } from "@/lib/utils";
import { HealthCharts } from "./health-charts";
import { MedicalTimeline } from "./medical-timeline";
import { TraditionalMedicineTab } from "./traditional-medicine-tab";
import { WalletTab } from "./wallet-tab";

const TABS = [
  { id: "overview", label: "اطلاعات کلی" }, { id: "medical", label: "پزشکی" }, { id: "history", label: "تاریخچه" },
  { id: "appointments", label: "نوبت‌ها" }, { id: "assessments", label: "ارزیابی‌ها" }, { id: "traditional", label: "طب سنتی" },
  { id: "prescriptions", label: "نسخه‌ها" }, { id: "treatment", label: "درمان" }, { id: "diet", label: "رژیم" },
  { id: "exercise", label: "ورزش" }, { id: "tracking", label: "سلامت" }, { id: "timeline", label: "تایم‌لاین" },
  { id: "orders", label: "سفارش‌ها" }, { id: "wallet", label: "کیف پول" }, { id: "messages", label: "پیام‌ها" },
  { id: "files", label: "فایل‌ها" }, { id: "notes", label: "یادداشت" }, { id: "analytics", label: "تحلیل" },
];

export function PatientWorkspace({ patient: pt }: { patient: Patient }) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-7 pt-5 pb-4 border-b border-border bg-card flex-shrink-0">
        <button onClick={() => router.push("/patients")} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-4"><ChevronLeft size={14} />بازگشت به لیست</button>
        <div className="flex items-start gap-5">
          <Avatar letter={pt.avatar} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1"><h2 className="text-xl font-bold">{pt.name}</h2><StatusBadge status={pt.status} /></div>
            <p className="text-sm text-muted-foreground mb-2">{pt.diagnosis}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              {[["📱", pt.phone], ["سن:", pt.age + " سال"], ["وزن:", pt.weight + " کگ"], ["قد:", pt.height + " سم"], ["ویزیت:", pt.visits + " جلسه"], ["مزاج:", pt.constitution], ["گروه خونی:", pt.bloodType], ["آخرین ویزیت:", pt.lastVisit]].map(([l, v], i) => (
                <span key={i}>{l} <span className="font-semibold text-foreground">{v}</span></span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold"><Plus size={13} />نوبت</button>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-secondary"><Edit size={13} />ویرایش</button>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50"><Lock size={13} />مسدود</button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[[fm(pt.revenue), "کل درآمد", "text-primary"], [pt.visits + " جلسه", "ویزیت", "text-blue-600"], ["۳ سفارش", "فروشگاه", "text-orange-600"], ["۸ نسخه", "نسخه‌ها", "text-violet-600"]].map(([v, l, c], i) => (
            <div key={i} className="bg-secondary/60 rounded-xl p-3"><p className={`text-sm font-bold ${c}`}>{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
          ))}
        </div>
      </div>
      <div className="border-b border-border bg-card flex-shrink-0 overflow-x-auto">
        <div className="flex px-7">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${tab === t.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-7">
        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-6">
            <SectionCard title="اطلاعات پزشکی">
              <div className="space-y-3">
                {[["تشخیص اصلی", pt.diagnosis], ["آلرژی‌ها", "پنی‌سیلین، گرده گل"], ["بیماری زمینه‌ای", "فشار خون (کنترل‌شده)"], ["داروهای جاری", "لیزینوپریل ۱۰mg روزانه"], ["گروه خونی", pt.bloodType]].map(([l, v]) => (
                  <div key={l} className="flex gap-3"><span className="text-xs text-muted-foreground w-32 flex-shrink-0 pt-0.5">{l}:</span><span className="text-sm">{v}</span></div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="آخرین یادداشت پزشک">
              <p className="text-sm leading-7">پروتکل درمانی با طب سوزنی در نقاط BL23، BL25، GV4 و KD3 ادامه دارد. پیشرفت خوبی مشاهده می‌شود.</p>
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3"><p className="text-xs font-bold text-amber-700 mb-1">⚠️ هشدار آلرژی</p><p className="text-xs text-amber-800">حساسیت به پنی‌سیلین — در تجویز دارو دقت شود</p></div>
            </SectionCard>
          </div>
        )}
        {tab === "timeline" && <MedicalTimeline />}
        {tab === "tracking" && <HealthCharts />}
        {tab === "traditional" && <TraditionalMedicineTab pt={pt} />}
        {tab === "wallet" && <WalletTab />}
        {tab === "history" && (
          <div className="space-y-3">
            {APPTS.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                <div className={`w-1.5 rounded-full self-stretch ${a.type === "حضوری" ? "bg-teal-500" : "bg-violet-500"}`} />
                <div className="flex-1"><div className="flex items-center justify-between mb-0.5"><p className="text-sm font-semibold">جلسه {p(i + 1)} — طب سوزنی</p><span className="text-xs text-muted-foreground">۱۴۰۳/۰{p(4 - Math.floor(i / 2))}/{p(17 - i * 4)}</span></div><p className="text-xs text-muted-foreground">نقاط: BL23، KD3، GV4</p></div>
                <TypeBadge type={a.type} /><StatusBadge status="پایان یافته" />
              </div>
            ))}
          </div>
        )}
        {tab === "appointments" && (
          <div className="space-y-3">
            {APPTS.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow">
                <span className="text-sm font-bold w-12">{a.time}</span><Avatar letter={a.avatar} size="sm" />
                <div className="flex-1"><p className="text-sm font-semibold">{a.patient}</p><p className="text-xs text-muted-foreground">۱۴۰۳/۰۴/۱۷</p></div>
                <TypeBadge type={a.type} /><StatusBadge status={a.status} />
                <div className="flex gap-1"><button className="p-1.5 hover:bg-secondary rounded-lg"><Play size={13} className="text-primary" /></button><button className="p-1.5 hover:bg-secondary rounded-lg"><Eye size={13} className="text-muted-foreground" /></button></div>
              </div>
            ))}
          </div>
        )}
        {tab === "notes" && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><Lock size={15} className="text-muted-foreground" /><h3 className="text-sm font-bold">یادداشت خصوصی پزشک</h3></div>
            <textarea rows={8} placeholder="این یادداشت فقط برای شما قابل مشاهده است..." className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Save size={14} />ذخیره</button>
          </div>
        )}
        {tab === "medical" && (
          <div className="grid grid-cols-2 gap-5">
            {[["اطلاعات پایه", [["نام کامل", pt.name], ["سن", pt.age + " سال"], ["جنسیت", "زن"], ["گروه خونی", pt.bloodType], ["قد", pt.height + " سم"], ["وزن", pt.weight + " کگ"]]], ["سابقه پزشکی", [["تشخیص", pt.diagnosis], ["آلرژی", "پنی‌سیلین"], ["بیماری زمینه‌ای", "فشار خون"], ["جراحی قبلی", "—"], ["داروهای جاری", "لیزینوپریل"], ["مصرف دخانیات", "خیر"]]]].map(([title, rows]) => (
              <SectionCard key={title as string} title={title as string}>
                <div className="space-y-2.5">
                  {(rows as [string, string][]).map(([l, v]) => (
                    <div key={l} className="flex gap-3 text-sm"><span className="text-muted-foreground w-28 flex-shrink-0">{l}:</span><span className="font-semibold">{v}</span></div>
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>
        )}
        {["prescriptions", "treatment", "diet", "exercise", "assessments", "orders", "messages", "files", "analytics"].includes(tab) && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">بخش {TABS.find(t => t.id === tab)?.label}</p>
            <p className="text-xs mt-1">اطلاعات در حال بارگذاری است</p>
          </div>
        )}
      </div>
    </div>
  );
}
