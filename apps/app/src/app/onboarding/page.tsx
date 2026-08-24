"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { ConsentPolicyPanel } from "@/components/onboarding/consent-policy-panel";
import { MedicalDeclarationField, type MedicalDeclaration } from "@/components/onboarding/medical-declaration-field";
import { ProfileFields, type ProfileDraft } from "@/components/onboarding/profile-fields";

type IntakeDraft = {
  birthDate: string; sexAtBirth: string; heightCm: string; weightKg: string; bloodType: string;
  sleepDurationBand: string; exerciseFrequency: string; stressLevel: string; tobaccoUse: string;
  allergyReport: MedicalDeclaration; chronicConditionReport: MedicalDeclaration; currentMedicationReport: MedicalDeclaration;
};
const EMPTY_DECLARATION: MedicalDeclaration = { items: [] };
const SEX_OPTIONS = [["FEMALE", "زن"], ["MALE", "مرد"], ["INTERSEX", "اینترسکس"], ["UNKNOWN", "نمی‌دانم"], ["PREFER_NOT_TO_SAY", "ترجیح می‌دهم نگویم"]] as const;
const OPTIONAL_FIELDS = [
  { key: "bloodType", label: "گروه خونی", options: [["", "پاسخ نداده‌ام"], ["A_POSITIVE", "A+"], ["A_NEGATIVE", "A-"], ["B_POSITIVE", "B+"], ["B_NEGATIVE", "B-"], ["AB_POSITIVE", "AB+"], ["AB_NEGATIVE", "AB-"], ["O_POSITIVE", "O+"], ["O_NEGATIVE", "O-"], ["UNKNOWN", "نمی‌دانم"]] },
  { key: "sleepDurationBand", label: "مدت خواب شبانه", options: [["", "پاسخ نداده‌ام"], ["LESS_THAN_5_HOURS", "کمتر از ۵ ساعت"], ["FROM_5_TO_LESS_THAN_7_HOURS", "۵ تا کمتر از ۷ ساعت"], ["FROM_7_TO_9_HOURS", "۷ تا ۹ ساعت"], ["MORE_THAN_9_HOURS", "بیشتر از ۹ ساعت"], ["UNKNOWN", "نمی‌دانم"]] },
  { key: "exerciseFrequency", label: "دفعات ورزش", options: [["", "پاسخ نداده‌ام"], ["NONE", "ندارم"], ["ONCE_OR_TWICE_WEEKLY", "هفته‌ای ۱ یا ۲ بار"], ["THREE_OR_FOUR_TIMES_WEEKLY", "هفته‌ای ۳ یا ۴ بار"], ["DAILY", "روزانه"], ["UNKNOWN", "نمی‌دانم"]] },
  { key: "stressLevel", label: "سطح استرس", options: [["", "پاسخ نداده‌ام"], ["LOW", "کم"], ["MODERATE", "متوسط"], ["HIGH", "زیاد"], ["VERY_HIGH", "خیلی زیاد"], ["UNKNOWN", "نمی‌دانم"]] },
  { key: "tobaccoUse", label: "مصرف دخانیات", options: [["", "پاسخ نداده‌ام"], ["NEVER", "هرگز"], ["FORMER", "قبلاً"], ["CURRENT", "اکنون"], ["UNKNOWN", "نمی‌دانم"]] },
] as const;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProfileDraft>({ firstName: "", lastName: "", email: "", cityName: "" });
  const [intake, setIntake] = useState<IntakeDraft>({ birthDate: "", sexAtBirth: "", heightCm: "", weightKg: "", bloodType: "", sleepDurationBand: "", exerciseFrequency: "", stressLevel: "", tobaccoUse: "", allergyReport: EMPTY_DECLARATION, chronicConditionReport: EMPTY_DECLARATION, currentMedicationReport: EMPTY_DECLARATION });
  const [accepted, setAccepted] = useState(false);
  const steps = ["اطلاعات پایه", "اطلاعات خوداظهاری", "سبک زندگی", "رضایت"];
  const updateIntake = <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => setIntake((current) => ({ ...current, [key]: value }));

  return <main className="min-h-screen bg-[#e8ede8] py-6"><div className="mx-auto w-full max-w-2xl rounded-3xl bg-background shadow-xl">
    <div className="border-b border-border px-5 py-5"><p className="text-xs font-bold text-primary">پرونده اولیه</p><h1 className="mt-1 text-xl font-bold text-foreground">اطلاعات خوداظهاری بیمار</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">این اطلاعات تشخیص یا واقعیت بالینی تأییدشده نیستند.</p></div>
    <div className="flex gap-1 px-5 pt-5">{steps.map((label, index) => <button type="button" key={label} onClick={() => setStep(index)} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} aria-label={label} />)}</div>
    <div className="px-5 py-6">
      {step === 0 && <section className="space-y-5"><ProfileFields value={profile} onChange={setProfile} /><div><label className="mb-1 block text-xs font-bold text-muted-foreground">تاریخ تولد (میلادی) *</label><input type="date" value={intake.birthDate} onChange={(event) => updateIntake("birthDate", event.target.value)} className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div><fieldset><legend className="mb-2 text-xs font-bold text-muted-foreground">جنس در بدو تولد *</legend><div className="grid gap-2 sm:grid-cols-2">{SEX_OPTIONS.map(([value, label]) => <button type="button" key={value} onClick={() => updateIntake("sexAtBirth", value)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${intake.sexAtBirth === value ? "border-primary bg-primary text-white" : "border-border bg-muted"}`}>{label}</button>)}</div></fieldset></section>}
      {step === 1 && <section className="space-y-4"><MedicalDeclarationField label="آلرژی‌ها *" description="گزارش خود شماست و هشدار آلرژی تأییدشده محسوب نمی‌شود." value={intake.allergyReport} onChange={(value) => updateIntake("allergyReport", value)} /><MedicalDeclarationField label="بیماری‌های مزمن *" description="گزارش خود شماست و تشخیص پزشکی نیست." value={intake.chronicConditionReport} onChange={(value) => updateIntake("chronicConditionReport", value)} /><MedicalDeclarationField label="داروهای مصرفی *" description="گزارش خود شماست و نسخه یا داروی تأییدشده نیست." value={intake.currentMedicationReport} onChange={(value) => updateIntake("currentMedicationReport", value)} /></section>}
      {step === 2 && <section className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{([ ["heightCm", "قد (سانتی‌متر)"], ["weightKg", "وزن (کیلوگرم)"] ] as const).map(([key, label]) => <div key={key}><label className="mb-1 block text-xs font-bold text-muted-foreground">{label} (اختیاری)</label><input type="number" min={key === "heightCm" ? 20 : 0.5} max={key === "heightCm" ? 300 : 1000} step={key === "weightKg" ? "0.01" : "1"} value={intake[key]} onChange={(event) => updateIntake(key, event.target.value)} className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>)}</div>{OPTIONAL_FIELDS.map((field) => <div key={field.key}><label className="mb-1 block text-xs font-bold text-muted-foreground">{field.label} (اختیاری)</label><select value={intake[field.key]} onChange={(event) => updateIntake(field.key, event.target.value)} className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}</section>}
      {step === 3 && <ConsentPolicyPanel accepted={accepted} onAcceptedChange={setAccepted} />}
    </div>
    <div className="flex gap-3 border-t border-border px-5 py-4">{step > 0 && <button type="button" onClick={() => setStep((current) => current - 1)} className="rounded-2xl bg-muted px-5 py-3 text-sm font-bold text-foreground">قبلی</button>}<button type="button" onClick={() => setStep((current) => Math.min(current + 1, steps.length - 1))} className="mr-auto inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white">{step === steps.length - 1 ? "در انتظار سیاست منتشرشده" : "ادامه"}<ChevronRight size={16} /></button></div>
  </div></main>;
}
