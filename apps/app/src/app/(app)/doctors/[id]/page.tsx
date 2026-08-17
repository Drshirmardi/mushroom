"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  Building2,
  Check,
  ChevronLeft,
  Clock,
  Globe,
  GraduationCap,
  Star,
} from "lucide-react";
import { DOCTORS } from "@/lib/data/catalog";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

const REVIEWS = [
  { name: "سارا م.", rating: 5, text: "دکتر شیرمردی بسیار دقیق و مهربان هستند. پس از ۵ جلسه درد کمرم به طور چشمگیری کاهش یافت.", date: "۸ مرداد", verified: true },
  { name: "علی ر.", rating: 5, text: "بهترین پزشک طب سنتی که تاکنون به او مراجعه کرده‌ام. توضیحات کامل و حوصله زیاد دارند.", date: "۲ مرداد", verified: true },
  { name: "نرگس ک.", rating: 4, text: "خوب بود ولی وقت انتظار زیاد بود. درمان خودش عالی بود.", date: "۲۵ تیر", verified: false },
];

export default function DoctorProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const navigateScreen = useScreenNavigation();
  const doctorId = params?.id || "d1";
  const doctor = DOCTORS.find(d => d.id === doctorId) || DOCTORS[0];
  const [tab, setTab] = useState<"about" | "reviews">("about");
  return (
    <div>
      <div className="relative">
        <div className="h-32 bg-gradient-to-b from-primary/30 to-accent" />
        <div className="px-4">
          <div className="flex items-end gap-4 -mt-12 mb-3">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
              <img src={`https://images.unsplash.com/${doctor.img}?w=192&h=192&fit=crop&auto=format`} alt={doctor.name} className="w-full h-full object-cover" />
            </div>
            <div className="pb-2 flex-1">
              <div className="flex items-start justify-between">
                <div><h2 className="text-lg font-bold text-foreground">{doctor.name}</h2><p className="text-sm text-muted-foreground">{doctor.specialty}</p></div>
                <button onClick={() => router.back()} className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center mt-1"><ChevronLeft size={20} style={{ transform: "rotate(180deg)" }} /></button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[{ label: "تجربه", val: doctor.exp }, { label: "امتیاز", val: `${doctor.rating} ⭐` }, { label: "بیمار", val: toP(doctor.sessions) }].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-border p-3 text-center shadow-sm"><p className="text-sm font-black text-primary">{s.val}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
            ))}
          </div>
          <div className="flex gap-2 mb-4">
            {[{ id: "about", label: "درباره" }, { id: "reviews", label: `نظرات (${toP(REVIEWS.length)})` }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as "about" | "reviews")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{t.label}</button>
            ))}
          </div>

          {tab === "about" && (
            <div className="space-y-4 pb-4">
              <div className="bg-white rounded-2xl border border-border p-4 shadow-sm"><p className="text-sm font-bold text-foreground mb-2">بیوگرافی</p><p className="text-sm text-foreground/70 leading-7">{doctor.bio}</p></div>
              <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><GraduationCap size={16} className="text-primary" />تحصیلات</p>
                {doctor.education.map((e, i) => <div key={i} className="flex items-start gap-2 py-2 border-b border-border last:border-0"><div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" /><p className="text-sm text-foreground">{e}</p></div>)}
              </div>
              <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Award size={16} className="text-primary" />گواهینامه‌ها</p>
                {doctor.certs.map((c, i) => <div key={i} className="flex items-start gap-2 py-2 border-b border-border last:border-0"><Check size={14} className="text-green-600 mt-0.5 flex-shrink-0" /><p className="text-sm text-foreground">{c}</p></div>)}
              </div>
              <div className="bg-white rounded-2xl border border-border p-4 shadow-sm space-y-2">
                {[{ icon: Building2, label: "کلینیک", val: doctor.clinic }, { icon: Clock, label: "ساعت کاری", val: doctor.hours }, { icon: Globe, label: "زبان‌ها", val: doctor.languages.join("، ") }].map(r => {
                  const Icon = r.icon;
                  return <div key={r.label} className="flex items-start gap-3"><Icon size={15} className="text-primary mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">{r.label}</p><p className="text-sm font-semibold text-foreground">{r.val}</p></div></div>;
                })}
              </div>
            </div>
          )}

          {tab === "reviews" && (
            <div className="space-y-3 pb-4">
              <div className="bg-primary/5 rounded-2xl p-4 flex items-center gap-4 border border-primary/10">
                <div className="text-center"><p className="text-3xl font-black text-primary">{doctor.rating}</p><div className="flex gap-0.5 mt-1">{[1, 2, 3, 4, 5].map(s => <Star key={s} size={11} className="text-amber-400 fill-amber-400" />)}</div></div>
                <div className="flex-1"><p className="text-sm font-bold text-foreground">{toP(REVIEWS.length)} نظر ثبت شده</p><p className="text-xs text-muted-foreground">از بیماران تأیید شده</p></div>
              </div>
              {REVIEWS.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center"><span className="text-xs font-bold text-primary">{r.name[0]}</span></div>
                    <div className="flex-1"><div className="flex items-center gap-1.5"><p className="text-sm font-bold text-foreground">{r.name}</p>{r.verified && <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-bold border border-green-100">تأیید شده</span>}</div></div>
                    <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} size={11} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted"} />)}</div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-7">{r.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{r.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-4">
        <button onClick={() => navigateScreen("BookStep1", { preselectedDoctor: doctorId })} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20">رزرو نوبت با این دکتر</button>
      </div>
    </div>
  );
}
