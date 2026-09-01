"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ShieldAlert } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { assessmentErrorMessage, getBookingEligibility, type BookingEligibility } from "@/lib/assessment-api";
import { bookingBlocker } from "@/lib/booking-eligibility";
import { directoryErrorMessage, listPatientDoctors, type PatientDoctor } from "@/lib/directory-api";
import { formatPrice, toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

const visitMode = (value: "IN_PERSON" | "ONLINE") => value === "IN_PERSON" ? "حضوری" : "آنلاین";
function BookStep1() {
  const router = useRouter(); const searchParams = useSearchParams(); const navigateScreen = useScreenNavigation(); const { authentication } = useAuthSession();
  const [selectedDoctorId, setSelectedDoctorId] = useState(searchParams.get("preselectedDoctor") || ""); const [selectedOfferingId, setSelectedOfferingId] = useState(""); const [decision, setDecision] = useState<BookingEligibility | null>(null); const [eligibilityError, setEligibilityError] = useState<string | null>(null); const [doctors, setDoctors] = useState<PatientDoctor[] | null>(null); const [directoryError, setDirectoryError] = useState<string | null>(null);
  useEffect(() => { let cancelled = false; void getBookingEligibility(authentication.accessToken).then((value) => { if (!cancelled) setDecision(value); }, (reason: unknown) => { if (!cancelled) setEligibilityError(assessmentErrorMessage(reason)); }); return () => { cancelled = true; }; }, [authentication.accessToken]);
  const blocker = decision ? bookingBlocker(decision) : null;
  useEffect(() => { let cancelled = false; if (!decision || blocker) return () => { cancelled = true; }; setDoctors(null); setDirectoryError(null); void listPatientDoctors(authentication.accessToken).then((value) => { if (!cancelled) setDoctors(value.items); }, (reason: unknown) => { if (!cancelled) setDirectoryError(directoryErrorMessage(reason)); }); return () => { cancelled = true; }; }, [authentication.accessToken, blocker, decision]);
  const selectDoctor = (doctor: PatientDoctor) => { setSelectedDoctorId(doctor.id); setSelectedOfferingId(doctor.offerings[0]?.id ?? ""); }; const canContinue = Boolean(selectedDoctorId && selectedOfferingId);
  return <div><PageHeader title="انتخاب پزشک و خدمت" onBack={() => router.back()} /><div className="space-y-3 px-4 pb-4">
    {!decision && !eligibilityError && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال بررسی شرایط رزرو…</p>}
    {eligibilityError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{eligibilityError}</p>}
    {blocker && <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><ShieldAlert className="mb-3" /><h2 className="font-bold">رزرو هنوز آماده نیست</h2><p className="mt-2 text-sm leading-6">{blocker.message}</p><button onClick={() => router.push(blocker.href)} className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white">{blocker.action}</button></div>}
    {decision && !blocker && <>
      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-muted/60 p-3"><div className="flex gap-1">{[1, 2, 3].map((step) => <div key={step} className={`h-1.5 w-6 rounded-full ${step === 1 ? "bg-primary" : "bg-muted"}`} />)}</div><span className="text-xs text-muted-foreground">مرحله ۱ از ۳: انتخاب پزشک و خدمت</span></div>
      {!doctors && !directoryError && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت پزشکان منتشرشده…</p>}
      {directoryError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{directoryError}</p>}
      {doctors?.length === 0 && <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">پزشک یا خدمت منتشرشده‌ای برای رزرو وجود ندارد.</p>}
      {doctors?.map((doctor) => <div key={doctor.id} className={`rounded-2xl border p-4 text-right ${selectedDoctorId === doctor.id ? "border-primary/40 bg-accent" : "border-border bg-white shadow-sm"}`}>
        <button onClick={() => selectDoctor(doctor)} className="flex w-full items-center gap-3 text-right"><div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">{doctor.displayName.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-foreground">{doctor.displayName}</p><p className="mt-0.5 text-xs text-muted-foreground">{doctor.specialties.map((specialty) => specialty.name).join("، ") || "تخصص ثبت نشده"}{typeof doctor.yearsExperience === "number" ? ` · ${toP(doctor.yearsExperience)} سال تجربه` : ""}</p></div>{selectedDoctorId === doctor.id && <Check size={18} className="text-primary" />}</button>
        {selectedDoctorId === doctor.id && <div className="mt-3 space-y-2 border-t border-primary/15 pt-3">{doctor.offerings.length ? doctor.offerings.map((offering) => <button key={offering.id} onClick={() => setSelectedOfferingId(offering.id)} className={`w-full rounded-xl border p-3 text-right ${selectedOfferingId === offering.id ? "border-primary bg-white" : "border-border bg-white/70"}`}><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-foreground">{offering.service.name}</p>{selectedOfferingId === offering.id && <Check size={16} className="text-primary" />}</div><p className="mt-1 text-xs text-muted-foreground">{visitMode(offering.visitMode)} · {toP(offering.durationMinutes)} دقیقه · {formatPrice(offering.priceAmount)} {offering.currency}</p></button>) : <p className="text-sm text-muted-foreground">خدمت قابل رزرو ندارد.</p>}</div>}
      </div>)}
      <button disabled={!canContinue} onClick={() => navigateScreen("BookStep2", { doctorId: selectedDoctorId, doctorServiceId: selectedOfferingId })} className={`mt-4 w-full rounded-2xl py-4 text-sm font-bold ${canContinue ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>ادامه</button>
    </>}
  </div></div>;
}
export default function BookStep1Page() { return <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">در حال بررسی شرایط رزرو…</p>}><BookStep1 /></Suspense>; }
