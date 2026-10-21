"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { components } from "@sabz-zendegi/api-client";
import { useAuthSession } from "@/components/auth/session-gate";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { ServicePage, ServiceEmpty, ServiceSteps } from "@/components/shared/service-page";
import { availabilityDateRange, groupAvailability } from "@/lib/availability";
import { directoryErrorMessage, getPatientAvailability } from "@/lib/directory-api";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

function BookStep2() {
  const router = useRouter(); const searchParams = useSearchParams(); const navigateScreen = useScreenNavigation(); const { authentication } = useAuthSession(); const doctorId = searchParams.get("doctorId") ?? ""; const doctorServiceId = searchParams.get("doctorServiceId") ?? ""; const appointmentId = searchParams.get("appointmentId") ?? ""; const range = useMemo(() => availabilityDateRange(), []);
  const [items, setItems] = useState<components["schemas"]["PatientAvailabilityItemDto"][] | null>(null); const [error, setError] = useState<string | null>(null); const [selected, setSelected] = useState<components["schemas"]["PatientAvailabilityItemDto"] | null>(null);
  useEffect(() => { let cancelled = false; if (!doctorServiceId) { setError("برای مشاهدهٔ زمان‌ها ابتدا پزشک و خدمت را انتخاب کنید."); return () => { cancelled = true; }; } setItems(null); setError(null); void getPatientAvailability(authentication.accessToken, doctorServiceId, range.fromDate, range.toDate).then((value) => { if (!cancelled) setItems(value.items); }, (reason: unknown) => { if (!cancelled) setError(directoryErrorMessage(reason)); }); return () => { cancelled = true; }; }, [authentication.accessToken, doctorServiceId, range]);
  const days = items ? groupAvailability(items) : [];
  return <ServicePage title="انتخاب روز و ساعت" description="یکی از زمان‌های آزاد خدمت انتخاب‌شده را مشخص کنید. زمان نهایی در مرحلهٔ بررسی دوباره کنترل می‌شود." icon={CalendarDays} backHref={`/appointments/book?preselectedDoctor=${encodeURIComponent(doctorId)}`} backLabel="انتخاب پزشک"><ServiceSteps steps={["پزشک و خدمت", "روز و ساعت", "بررسی و پرداخت"]} current={1} /><div className="space-y-4">{!items && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت زمان‌های آزاد…</p>}{error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>}
{error && <Link href="/appointments/book" className="service-text-action">برگشت به انتخاب پزشک و خدمت</Link>}{items?.length === 0 && <ServiceEmpty title="زمان آزادی در این بازه پیدا نشد" description="می‌توانید پزشک یا خدمت دیگری را انتخاب کنید یا بعداً زمان‌های آزاد را دوباره بررسی کنید." href="/appointments/book" action="انتخاب پزشک یا خدمت دیگر" />}{days.map((day) => <section key={day.date}><p className="mb-3 text-sm font-bold text-foreground">{toP(day.date)}</p><div className="grid grid-cols-3 gap-2">{day.slots.map((slot) => <button key={slot.startsAt} aria-pressed={selected?.startsAt === slot.startsAt} onClick={() => setSelected(slot)} className={`rounded-xl border py-3 text-sm font-bold transition-all ${selected?.startsAt === slot.startsAt ? "border-primary bg-primary text-white" : "border-border bg-white text-foreground shadow-sm"}`}>{toP(slot.localStartTime)}</button>)}</div></section>)}<button disabled={!selected || !doctorId || !doctorServiceId} onClick={() => selected && navigateScreen("BookStep3", { doctorId, doctorServiceId, appointmentId, date: selected.localDate, time: selected.localStartTime, startsAt: selected.startsAt })} className={`w-full rounded-2xl py-4 text-sm font-bold transition-all ${selected && doctorId && doctorServiceId ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-muted text-muted-foreground"}`}>{appointmentId ? "بررسی تغییر زمان" : "بررسی نوبت و هزینه"}</button></div></ServicePage>;
}
export default function BookStep2Page() { return <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">در حال دریافت زمان‌های آزاد…</p>}><BookStep2 /></Suspense>; }
