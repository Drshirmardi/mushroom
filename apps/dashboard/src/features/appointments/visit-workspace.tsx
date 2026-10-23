"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { dashboardAppointmentError } from "@/lib/appointment-api";
import { changeVisit, getVisit, visitLabels, visitTime, type Visit } from "@/lib/visits-api";

const Messages = dynamic(() => import("@/features/messages/messages-page").then(module => module.MessagesPage), { loading: () => <p className="p-5">در حال دریافت گفتگو…</p> });
const Notes = dynamic(() => import("./visit-notes").then(module => module.VisitNotes));
const Prescriptions = dynamic(() => import("@/features/prescriptions/prescriptions-page").then(module => module.PrescriptionsPage));
type Tab = "chat" | "notes" | "prescription";
const tabs: { id: Tab; label: string }[] = [{ id: "chat", label: "گفتگو" }, { id: "notes", label: "یادداشت ویزیت" }, { id: "prescription", label: "نسخهٔ بیمار" }];

export function VisitWorkspace({ appointmentId }: { appointmentId: string }) {
  const { authentication } = useDashboardSession();
  const physician = !authentication.user.roles.includes("ADMIN") && authentication.user.roles.includes("DOCTOR");
  const [visit, setVisit] = useState<Visit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [opened, setOpened] = useState<Tab[]>(["chat"]);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const key = ++generation.current;
    try {
      const value = await getVisit(authentication.accessToken, physician, appointmentId);
      if (key !== generation.current) return;
      setVisit(value); setError(null);
      if (value.visitMode !== "ONLINE") { setTab(current => current === "chat" ? "notes" : current); setOpened(current => current.includes("notes") ? current : [...current, "notes"]); }
    } catch (reason) { if (key === generation.current) setError(dashboardAppointmentError(reason)); }
  }, [authentication.accessToken, physician, appointmentId]);
  useEffect(() => { queueMicrotask(() => void load()); const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000); return () => { generation.current++; clearInterval(timer); }; }, [load]);
  const act = async (action: "start" | "complete" | "confirm" | "check-in" | "queue") => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await changeVisit(authentication.accessToken, physician, appointmentId, action); setConfirmFinish(false); await load(); }
    catch (reason) { setError(dashboardAppointmentError(reason)); }
    finally { setBusy(false); }
  };
  return <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
    <div className="flex items-center justify-between"><Link href="/appointments" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary"><ArrowRight size={17} />نوبت‌ها</Link><button type="button" onClick={() => void load()} aria-label="تازه‌سازی ویزیت" className="rounded-xl border border-border p-3"><RefreshCw size={17} /></button></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {!visit && !error && <p role="status" className="p-6 text-muted-foreground">در حال دریافت ویزیت…</p>}
    {visit && <>
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 lg:flex-row lg:items-center">
        <div><h1 className="text-xl font-bold">{visit.patientDisplayName || "ویزیت بیمار"}</h1><p className="mt-2 text-sm text-muted-foreground">{visit.serviceName} · {visit.visitMode === "ONLINE" ? "آنلاین" : "حضوری"}{visit.doctorDisplayName ? ` · ${visit.doctorDisplayName}` : ""}</p><p className="mt-2 text-xs text-muted-foreground">{visitTime(visit.startsAt)} تا {new Intl.DateTimeFormat("fa-IR", { timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(visit.endsAt))} · به وقت تهران</p><span className="mt-3 inline-block rounded-lg bg-secondary px-3 py-1 text-xs font-bold text-primary">{visitLabels[visit.status]}</span></div>
        <div className="flex flex-wrap gap-2">
          {!physician && visit.status === "PENDING" && <button type="button" disabled={busy} onClick={() => void act("confirm")} className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold">تأیید نوبت</button>}
          {!physician && visit.status === "CONFIRMED" && <button type="button" disabled={busy} onClick={() => void act("check-in")} className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold">ثبت حضور بیمار</button>}
          {visit.canStart && <button type="button" disabled={busy} onClick={() => void act("start")} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">{busy ? "در حال ثبت…" : "شروع ویزیت"}</button>}
          {!physician && visit.status === "CHECKED_IN" && <button type="button" disabled={busy} onClick={() => void act("queue")} className="min-h-11 rounded-xl border border-border px-4 text-sm">افزودن به انتظار</button>}
          {visit.canComplete && <button type="button" disabled={busy} onClick={() => setConfirmFinish(true)} className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold">ثبت پایان ویزیت</button>}
          {!physician && <Link href={`/patients/${encodeURIComponent(visit.patientId)}`} className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm">پروندهٔ کامل بیمار</Link>}
        </div>
      </header>
      {confirmFinish && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>ویزیت پایان یابد؟ گفتگو تا زمانی که جداگانه آن را ببندید، قابل ادامه است.</p><div className="mt-3 flex gap-3"><button type="button" disabled={busy} onClick={() => void act("complete")} className="min-h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground">{busy ? "در حال ثبت…" : "ثبت پایان ویزیت"}</button><button type="button" disabled={busy} onClick={() => setConfirmFinish(false)} className="min-h-11 px-4">ادامهٔ ویزیت</button></div></div>}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div role="tablist" aria-label="بخش‌های ویزیت" className="flex gap-2 overflow-x-auto border-b border-border p-3">{tabs.filter(item => item.id !== "chat" || visit.visitMode === "ONLINE").map(item => <button type="button" role="tab" aria-selected={tab === item.id} aria-controls={`visit-${item.id}`} id={`visit-tab-${item.id}`} key={item.id} onClick={() => { setTab(item.id); setOpened(current => current.includes(item.id) ? current : [...current, item.id]); }} className={`min-h-11 shrink-0 rounded-xl px-5 text-sm font-bold ${tab === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{item.label}</button>)}</div>
        {opened.includes("chat") && visit.visitMode === "ONLINE" && <div role="tabpanel" id="visit-chat" aria-labelledby="visit-tab-chat" hidden={tab !== "chat"}><Messages visitId={appointmentId} embedded /></div>}
        {opened.includes("notes") && <div role="tabpanel" id="visit-notes" aria-labelledby="visit-tab-notes" hidden={tab !== "notes"}><Notes token={authentication.accessToken} patientId={visit.patientId} appointmentId={appointmentId} visitStatus={visit.status} /></div>}
        {opened.includes("prescription") && <div role="tabpanel" id="visit-prescription" aria-labelledby="visit-tab-prescription" hidden={tab !== "prescription"} className="p-4"><Prescriptions forPatientId={visit.patientId} /></div>}
      </section>
    </>}
  </div>;
}
