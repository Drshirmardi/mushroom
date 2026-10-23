"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, RefreshCw } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { dashboardAppointmentError, type AdminAppointmentStatus } from "@/lib/appointment-api";
import { changeVisit, listVisits, visitLabels, visitTime, type Visit } from "@/lib/visits-api";
import { fromTehranInput, toTehranInput } from "@/lib/tehran-time";

const tabs = [{ value: "ALL", label: "همه" }, { value: "IN_PROGRESS", label: "در حال ویزیت" }, { value: "QUEUED", label: "منتظر ویزیت" }, { value: "CONFIRMED", label: "تأییدشده" }, { value: "CHECKED_IN", label: "پذیرش‌شده" }, { value: "PENDING", label: "در انتظار تأیید" }, { value: "COMPLETED", label: "پایان‌یافته" }, { value: "CANCELLED", label: "لغوشده" }, { value: "NO_SHOW", label: "عدم مراجعه" }] as const;

export function AppointmentsPage({ initialStatus = "ALL" }: { initialStatus?: AdminAppointmentStatus | "ALL" }) {
  const { authentication } = useDashboardSession();
  const physician = !authentication.user.roles.includes("ADMIN") && authentication.user.roles.includes("DOCTOR");
  const [status, setStatus] = useState<AdminAppointmentStatus | "ALL">(initialStatus);
  const [date, setDate] = useState(() => initialStatus === "QUEUED" ? "" : toTehranInput(new Date().toISOString()).slice(0, 10));
  const [items, setItems] = useState<Visit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const load = useCallback(() => {
    const key = ++generation.current;
    const from = date ? fromTehranInput(`${date}T00:00`) : undefined;
    const to = from ? new Date(Date.parse(from) + 86_400_000 - 1).toISOString() : undefined;
    void listVisits(authentication.accessToken, physician, { status: status === "ALL" ? undefined : status, page, from, to }).then(value => {
      if (key === generation.current) { setItems(value.items); setTotal(value.total); setError(null); }
    }, reason => { if (key === generation.current) setError(dashboardAppointmentError(reason)); }).finally(() => { if (key === generation.current) setLoading(false); });
  }, [authentication.accessToken, physician, status, date, page]);
  useEffect(() => { load(); const timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, 15_000); return () => { generation.current++; clearInterval(timer); }; }, [load]);
  const act = async (visit: Visit, action: "confirm" | "check-in") => {
    setBusy(visit.id); setError(null);
    try { await changeVisit(authentication.accessToken, physician, visit.id, action); load(); }
    catch (reason) { setError(dashboardAppointmentError(reason)); }
    finally { setBusy(null); }
  };
  return <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-7">
    <header className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-bold">{physician ? "ویزیت‌های من" : "نوبت‌ها و ویزیت‌ها"}</h1><p className="mt-1 text-sm text-muted-foreground">نوبت را باز کنید؛ گفتگو، یادداشت و اقدامات ویزیت در همان صفحه در دسترس‌اند.</p></div><button type="button" onClick={() => { setLoading(true); setError(null); load(); }} disabled={loading} aria-label="تازه‌سازی نوبت‌ها" className="rounded-xl border border-border p-3 disabled:opacity-50"><RefreshCw size={18} /></button></header>
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"><label className="text-xs font-bold">روز نوبت، به وقت تهران<input type="date" value={date} onChange={event => { setDate(event.target.value); setPage(1); setItems(null); setLoading(true); setError(null); }} className="mt-2 block rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label><button type="button" onClick={() => { setDate(""); setPage(1); setItems(null); setLoading(true); setError(null); }} className="min-h-11 px-3 text-sm font-bold text-primary">همهٔ تاریخ‌ها</button><p className="mr-auto text-xs text-muted-foreground">{total.toLocaleString("fa-IR")} نوبت</p></div>
    <nav aria-label="وضعیت ویزیت" className="flex gap-2 overflow-x-auto pb-2">{tabs.map(tab => <button type="button" key={tab.value} aria-pressed={status === tab.value} onClick={() => { setStatus(tab.value); if (tab.value === "IN_PROGRESS" || tab.value === "QUEUED") setDate(""); setPage(1); setItems(null); setLoading(true); setError(null); }} className={`min-h-11 shrink-0 rounded-xl px-4 text-xs font-bold ${status === tab.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{tab.label}</button>)}</nav>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {!items && loading && <p role="status" className="p-6 text-sm text-muted-foreground">در حال دریافت نوبت‌ها…</p>}
    <div className="space-y-3">{items?.map(visit => <article key={visit.id} className={`flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5 ${visit.status === "IN_PROGRESS" ? "border-primary" : "border-border"}`}>
      <div className="flex-1 space-y-2"><div className="flex flex-wrap items-center gap-3"><h2 className="font-bold">{visit.patientDisplayName || "نام بیمار ثبت نشده"}</h2><span className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold text-primary">{visitLabels[visit.status]}</span></div><p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays size={15} />{visitTime(visit.startsAt)}</p><p className="text-xs text-muted-foreground">{visit.serviceName || "خدمت ثبت‌شده"}{visit.visitMode ? ` · ${visit.visitMode === "ONLINE" ? "آنلاین" : "حضوری"}` : ""}{visit.doctorDisplayName ? ` · ${visit.doctorDisplayName}` : ""}</p></div>
      <div className="flex flex-wrap gap-2">{!physician && (visit.status === "PENDING" || visit.status === "CONFIRMED") && <button type="button" disabled={busy !== null} onClick={() => void act(visit, visit.status === "PENDING" ? "confirm" : "check-in")} className="min-h-11 rounded-xl border border-border px-4 text-xs font-bold disabled:opacity-50">{busy === visit.id ? "در حال ثبت…" : visit.status === "PENDING" ? "تأیید نوبت" : "ثبت حضور بیمار"}</button>}<Link href={`/appointments/${encodeURIComponent(visit.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">{visit.status === "IN_PROGRESS" ? "ادامهٔ ویزیت" : "ورود به ویزیت"}<ArrowLeft size={16} /></Link></div>
    </article>)}</div>
    {items?.length === 0 && <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">نوبتی با این تاریخ و وضعیت پیدا نشد.</p>}
    {total > 20 && <div className="flex items-center justify-between"><button type="button" disabled={page === 1 || loading} onClick={() => { setPage(value => value - 1); setItems(null); setLoading(true); setError(null); }} className="min-h-11 rounded-xl border border-border px-4 text-sm disabled:opacity-50">قبلی</button><span className="text-xs text-muted-foreground">صفحهٔ {page.toLocaleString("fa-IR")} از {Math.ceil(total / 20).toLocaleString("fa-IR")}</span><button type="button" disabled={page * 20 >= total || loading} onClick={() => { setPage(value => value + 1); setItems(null); setLoading(true); setError(null); }} className="min-h-11 rounded-xl border border-border px-4 text-sm disabled:opacity-50">بعدی</button></div>}
  </div>;
}
