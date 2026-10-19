"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { CalendarDays } from "lucide-react";
import { ServicePage } from "@/components/shared/service-page";
import { appointmentStatusLabels } from "@/lib/appointment-labels";
import { appointmentErrorMessage, cancelPatientAppointment, getPatientAppointment, type PatientAppointment } from "@/lib/appointment-api";
import { formatPrice } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

export default function AppointmentDetailPage() {
  const router = useRouter(); const params = useParams<{ id: string }>(); const navigateScreen = useScreenNavigation(); const { authentication } = useAuthSession(); const [appointment, setAppointment] = useState<PatientAppointment | null>(null); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const load = () => { setError(null); void getPatientAppointment(authentication.accessToken, params.id).then(setAppointment, (reason: unknown) => setError(appointmentErrorMessage(reason))); };
  useEffect(load, [authentication.accessToken, params.id]);
  const cancel = async () => { if (!appointment || !confirm("آیا از لغو این نوبت مطمئن هستید؟")) return; setSaving(true); try { setAppointment(await cancelPatientAppointment(authentication.accessToken, appointment.id)); } catch (reason) { setError(appointmentErrorMessage(reason)); } finally { setSaving(false); } };
  const canChange = appointment?.status === "PENDING" || appointment?.status === "CONFIRMED";
  return <ServicePage title="جزئیات نوبت" description="زمان، وضعیت و اقدامات مربوط به همین مشاوره را بررسی کنید." icon={CalendarDays} backHref="/appointments" backLabel="نوبت‌های من"><div className="service-detail space-y-4">{!appointment && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت نوبت…</p>}{error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button onClick={load} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>}{appointment && <><div className="rounded-3xl border border-border bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-foreground">نوبت درمانی</h2>{[["تاریخ و ساعت", new Intl.DateTimeFormat("fa-IR", { dateStyle: "full", timeStyle: "short" }).format(new Date(appointment.startsAt))], ["وضعیت", appointmentStatusLabels[appointment.status] ?? appointment.status], ["هزینه ثبت‌شده", `${formatPrice(appointment.priceAmount)} ${appointment.currency === "IRR" ? "ریال" : appointment.currency === "TOMAN" ? "تومان" : appointment.currency}`], ["کد پیگیری", appointment.id]].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-border py-3 text-sm last:border-0"><span className="text-muted-foreground">{label}</span><span className="max-w-[60%] break-words text-left font-bold text-foreground">{value}</span></div>)}</div>{["CONFIRMED", "CHECKED_IN", "QUEUED", "IN_PROGRESS"].includes(appointment.status) && <Link href={`/chat?appointmentId=${appointment.id}`} className="service-primary w-full">بررسی و ورود به گفتگوی نوبت</Link>}<Link href={`/appointments/${appointment.id}/assessment-sharing`} className="block rounded-2xl border border-border bg-white p-4 text-sm font-bold text-primary">مدیریت اشتراک ارزیابی با پزشک همین نوبت</Link>{canChange && <div className="grid grid-cols-2 gap-3"><button disabled={saving} onClick={cancel} className="rounded-2xl border border-red-100 bg-red-50 py-4 text-sm font-bold text-red-600 disabled:opacity-50">لغو نوبت</button><button onClick={() => navigateScreen("BookStep2", { doctorServiceId: appointment.doctorServiceId, doctorId: appointment.doctorId, appointmentId: appointment.id })} className="rounded-2xl bg-muted py-4 text-sm font-bold text-foreground">تغییر زمان</button></div>}</>}</div></ServicePage>;
}
