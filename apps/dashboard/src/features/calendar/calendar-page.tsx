"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { dashboardAppointmentError, listAdminAppointments, type AdminAppointment } from "@/lib/appointment-api";

export function CalendarPage() {
  const { authentication } = useDashboardSession(); const [items, setItems] = useState<AdminAppointment[] | null>(null); const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => { setItems(null); setError(null); void listAdminAppointments(authentication.accessToken).then((value) => setItems(value.items), (reason: unknown) => setError(dashboardAppointmentError(reason))); }, [authentication.accessToken]);
  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, [load]);
  const groups = items?.reduce<Record<string, AdminAppointment[]>>((result, appointment) => { const day = new Intl.DateTimeFormat("fa-IR", { dateStyle: "full" }).format(new Date(appointment.startsAt)); (result[day] ??= []).push(appointment); return result; }, {}) ?? {};
  return <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-7"><div className="flex items-center justify-between"><div><h1 className="text-xl font-bold">تقویم نوبت‌ها</h1><p className="mt-1 text-sm text-muted-foreground">برنامهٔ واقعی نوبت‌های کلینیک</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold"><RefreshCw size={15} />به‌روزرسانی</button></div>{!items && !error && <p role="status" className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">در حال دریافت تقویم…</p>}{error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">{error}</p>}{items && <div className="space-y-4">{Object.entries(groups).map(([day, appointments]) => <section key={day} className="rounded-2xl border border-border bg-card"><h2 className="border-b border-border px-5 py-4 font-bold">{day}</h2><ul className="divide-y divide-border">{appointments.map((appointment) => <li key={appointment.id} className="flex items-center justify-between px-5 py-4 text-sm"><span>{new Intl.DateTimeFormat("fa-IR", { timeStyle: "short" }).format(new Date(appointment.startsAt))} · بیمار {appointment.patientId.slice(0, 8)}</span><span className="font-bold text-primary">{appointment.status}</span></li>)}</ul></section>)}{items.length === 0 && <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">نوبتی برای نمایش وجود ندارد.</p>}</div>}</div>;
}
