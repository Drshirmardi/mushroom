"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { appointmentErrorMessage, listPatientAppointments, type PatientAppointment } from "@/lib/appointment-api";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

const statusLabel: Record<PatientAppointment["status"], string> = { PENDING: "در انتظار تأیید", CONFIRMED: "تأیید شده", CHECKED_IN: "پذیرش شده", QUEUED: "در صف", IN_PROGRESS: "در حال ویزیت", COMPLETED: "تکمیل شده", NO_SHOW: "عدم مراجعه", CANCELLED: "لغو شده" };

export default function AppointmentsPage() {
  const navigateScreen = useScreenNavigation(); const { authentication } = useAuthSession(); const [items, setItems] = useState<PatientAppointment[] | null>(null); const [error, setError] = useState<string | null>(null);
  const reload = () => { setItems(null); setError(null); void listPatientAppointments(authentication.accessToken).then((value) => setItems(value.items), (reason: unknown) => setError(appointmentErrorMessage(reason))); };
  useEffect(reload, [authentication.accessToken]);
  return <div className="space-y-4 px-4"><div className="flex items-center justify-between pb-1 pt-3"><div><h1 className="text-xl font-bold text-foreground">ویزیت‌ها</h1><p className="mt-0.5 text-sm text-muted-foreground">مدیریت نوبت‌های درمانی</p></div><button onClick={reload} className="text-xs font-semibold text-primary">به‌روزرسانی</button></div><button onClick={() => navigateScreen("BookStep1")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-md shadow-primary/20"><Plus size={18} strokeWidth={2.5} />رزرو نوبت جدید</button>{!items && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت نوبت‌ها…</p>}{error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button onClick={reload} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>}{items?.length === 0 && <EmptyState icon={Calendar} title="نوبتی ثبت نشده" desc="برای رزرو نوبت جدید دکمه بالا را لمس کنید." action="رزرو نوبت" onAction={() => navigateScreen("BookStep1")} />}{items?.length ? <div className="space-y-3 pb-4">{items.map((appointment) => <button key={appointment.id} onClick={() => navigateScreen("AppointmentDetail", { aptId: appointment.id })} className="w-full rounded-3xl border border-border bg-white p-4 text-right shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-foreground">نوبت درمانی</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.startsAt))}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{statusLabel[appointment.status]}</span></div><p className="mt-3 text-xs text-muted-foreground">کد پیگیری: {toP(appointment.id.slice(0, 8))}</p></button>)}</div> : null}</div>;
}
