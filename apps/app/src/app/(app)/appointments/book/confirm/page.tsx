"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { appointmentErrorMessage, createPatientAppointment, reschedulePatientAppointment } from "@/lib/appointment-api";

function BookStep3() {
  const router = useRouter(); const searchParams = useSearchParams(); const { authentication } = useAuthSession(); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const doctorServiceId = searchParams.get("doctorServiceId") ?? ""; const startsAt = searchParams.get("startsAt") ?? ""; const appointmentId = searchParams.get("appointmentId") ?? "";
  const submit = async () => { if (!doctorServiceId || !startsAt) { setError("اطلاعات زمان رزرو کامل نیست. لطفاً دوباره انتخاب کنید."); return; } setLoading(true); setError(null); try { const appointment = appointmentId ? await reschedulePatientAppointment(authentication.accessToken, appointmentId, { doctorServiceId, startsAt }) : await createPatientAppointment(authentication.accessToken, { doctorServiceId, startsAt }, crypto.randomUUID()); router.replace(`/appointments/book/success?appointmentId=${encodeURIComponent(appointment.id)}&changed=${appointmentId ? "1" : ""}`); } catch (reason) { setError(appointmentErrorMessage(reason)); } finally { setLoading(false); } };
  return <div><PageHeader title={appointmentId ? "تأیید تغییر زمان" : "تأیید رزرو"} onBack={() => router.back()} /><div className="space-y-4 px-4 pb-4"><div className="flex items-center gap-2 rounded-2xl bg-muted/60 p-3"><div className="flex gap-1">{[1, 2, 3].map((step) => <div key={step} className="h-1.5 w-6 rounded-full bg-primary" />)}</div><span className="text-xs text-muted-foreground">مرحله ۳ از ۳: تأیید نوبت</span></div><div className="rounded-2xl border border-border bg-white p-4"><p className="text-sm font-bold text-foreground">خلاصه نوبت</p><div className="mt-3 flex justify-between text-sm"><span className="text-muted-foreground">زمان انتخاب‌شده</span><span className="font-semibold text-foreground">{startsAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(startsAt)) : "—"}</span></div></div><div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-foreground"><p className="font-bold">پرداخت در این مرحله لازم نیست.</p><p className="mt-1 text-muted-foreground">نوبت پس از ثبت در وضعیت در انتظار تأیید قرار می‌گیرد.</p></div>{error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}<button onClick={submit} disabled={loading || !doctorServiceId || !startsAt} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-md shadow-primary/20 disabled:opacity-50">{loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RotateCcw size={18} /></motion.div> : appointmentId ? "ثبت تغییر زمان" : "ثبت نوبت"}</button></div></div>;
}

export default function BookStep3Page() { return <Suspense fallback={null}><BookStep3 /></Suspense>; }
