"use client";
import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, CalendarDays, ShieldAlert, Stethoscope } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage, ServiceSection, ServiceEmpty, ServiceSteps } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { getBookingEligibility } from "@/lib/assessment-api";
import { bookingBlocker } from "@/lib/booking-eligibility";
import { listPatientDoctors, type PatientDoctor } from "@/lib/directory-api";
import { formatPrice, toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { usePatientResource } from "@/lib/use-patient-resource";

function BookStep1() {
  const { authentication } = useAuthSession(); const token = authentication.accessToken;
  const eligibility = usePatientResource(useCallback(() => getBookingEligibility(token), [token]));
  const blocker = eligibility.data ? bookingBlocker(eligibility.data) : null;
  return <ServicePage title="رزرو مشاوره" description="پزشک و خدمت را انتخاب کنید؛ سپس زمان‌های آزاد و جزئیات هزینه را می‌بینید." icon={CalendarDays}>
    <ServiceSteps steps={["پزشک و خدمت", "روز و ساعت", "بررسی و پرداخت"]} current={0} />
    <PatientResourceState {...eligibility} retry={() => void eligibility.reload()} />
    {blocker && <ServiceEmpty icon={ShieldAlert} title="یک مرحله تا آماده‌شدن رزرو" description={blocker.message} href={blocker.href} action={blocker.action} />}
    {eligibility.data && !blocker && <DoctorSelection token={token} />}
    <p className="service-note mt-6">رزرو نهایی پس از بررسی زمان و تکمیل پرداخت ثبت می‌شود. پیش از آن می‌توانید انتخاب خود را تغییر دهید.</p>
  </ServicePage>;
}

function DoctorSelection({ token }: { token: string }) {
  const initial = useSearchParams().get("preselectedDoctor");
  const navigateScreen = useScreenNavigation();
  const doctors = usePatientResource(useCallback(() => listPatientDoctors(token), [token]));
  const [selectedDoctorId, setSelectedDoctorId] = useState(initial ?? "");
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const doctor = doctors.data?.items.find(item => item.id === selectedDoctorId);
  const selectedOffering = doctor?.offerings.find(item => item.id === selectedOfferingId);
  const selectDoctor = (item: PatientDoctor) => { setSelectedDoctorId(item.id); setSelectedOfferingId(item.offerings[0]?.id ?? ""); };
  return <ServiceSection title="پزشک و خدمت مناسب شما" description="پزشک را انتخاب کنید تا خدمات و هزینهٔ هر کدام نمایش داده شود.">
    <PatientResourceState {...doctors} retry={() => void doctors.reload()} />
    {doctors.data?.items.length === 0 && <ServiceEmpty icon={Stethoscope} title="فعلاً زمان رزروی ارائه نشده" description="پزشک یا خدمت قابل رزروی در فهرست فعلی وجود ندارد. برای دیدن تغییرات می‌توانید فهرست را دوباره دریافت کنید." />}
    {doctors.data?.items.map(item => <article key={item.id} className={`service-card ${selectedDoctorId === item.id ? "service-card--selected" : ""}`}>
      <button type="button" aria-pressed={selectedDoctorId === item.id} onClick={() => selectDoctor(item)} className="flex min-h-14 w-full items-center gap-3 text-start"><span className="service-doctor-avatar">{item.displayName.slice(0, 1)}</span><span className="min-w-0 flex-1"><strong className="block text-base">{item.displayName}</strong><span className="text-xs leading-6 text-muted-foreground">{item.specialties.map(specialty => specialty.name).join("، ") || "تخصص ثبت نشده"}{typeof item.yearsExperience === "number" ? `، ${toP(item.yearsExperience)} سال تجربه` : ""}</span></span>{selectedDoctorId === item.id && <Check size={19} className="text-primary" aria-hidden="true" />}</button>
      {selectedDoctorId === item.id && <div className="mt-4 space-y-2 border-t border-border pt-4"><p className="mb-2 text-xs font-bold text-muted-foreground">انتخاب خدمت</p>{item.offerings.map(offering => <button key={offering.id} type="button" aria-pressed={selectedOfferingId === offering.id} onClick={() => setSelectedOfferingId(offering.id)} className={`service-offering ${selectedOfferingId === offering.id ? "service-offering--selected" : ""}`}><span className="flex items-center justify-between gap-2"><strong>{offering.service.name}</strong>{selectedOfferingId === offering.id && <Check size={17} aria-hidden="true" />}</span><span className="mt-2 block text-xs leading-6 text-muted-foreground">{offering.visitMode === "IN_PERSON" ? "حضوری" : "آنلاین"}، {toP(offering.durationMinutes)} دقیقه</span><span className="mt-2 block font-bold">{formatPrice(offering.priceAmount)} {offering.currency === "IRR" ? "ریال" : offering.currency === "TOMAN" ? "تومان" : offering.currency}</span></button>)}{item.offerings.length === 0 && <p>خدمت قابل رزروی برای این پزشک ثبت نشده است.</p>}</div>}
    </article>)}
    {doctors.data && doctors.data.items.length > 0 && <><button type="button" disabled={!selectedOffering} onClick={() => navigateScreen("BookStep2", { doctorId: selectedDoctorId, doctorServiceId: selectedOfferingId })} className="service-primary w-full">انتخاب روز و ساعت<ArrowLeft size={18} aria-hidden="true" /></button>{!selectedOffering && <p className="text-center text-xs text-muted-foreground">برای ادامه، پزشک و یکی از خدمات او را انتخاب کنید.</p>}</>}
    <Link href="/appointments" className="service-text-action">نوبت‌های قبلی من</Link>
  </ServiceSection>;
}
export default function BookingPage() { return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">در حال دریافت شرایط رزرو…</p>}><BookStep1 /></Suspense>; }
