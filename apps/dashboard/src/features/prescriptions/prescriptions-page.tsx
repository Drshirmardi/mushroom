"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, Save, Send, Trash2 } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { createPrescription, issuePrescription, listPrescriptions, revisePrescription, prescriptionHistory, prescriptionError, type Prescription, type PrescriptionItemInput } from "@/lib/prescription-treatment-api";
import { PatientSelector } from "./patient-selector";

const emptyItem = (): PrescriptionItemInput => ({ medicationName: "", doseText: "", frequencyText: "", durationText: "", instructions: "" });
const fromRecord = (record?: Prescription | null): PrescriptionItemInput[] => record?.revision?.items.map(item => ({ medicationName: item.medicationName, doseText: item.doseText ?? "", frequencyText: item.frequencyText ?? "", durationText: item.durationText ?? "", instructions: item.instructions ?? "" })) ?? [emptyItem()];
const stamp = (value?: string | null) => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value)) : "";
const field = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40";

type Props = { forPatientId?: string; appointmentId?: string; patientName?: string; onDirtyChange?: (dirty: boolean) => void };
export function PrescriptionsPage(props: Props = {}) {
  return props.forPatientId ? <PrescriptionEditor key={props.forPatientId} patientId={props.forPatientId} {...props} /> : <Suspense fallback={<p role="status" className="p-5">در حال دریافت نسخه‌ها…</p>}><PrescriptionsFromQuery /></Suspense>;
}
function PrescriptionsFromQuery() {
  const query = useSearchParams(); const router = useRouter();
  const id = query.get("patientId");
  if (!id) return <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"><header><h1 className="text-xl font-bold">نسخهٔ بیماران</h1><p className="mt-2 text-sm text-muted-foreground">نسخه‌های بیمار را ببینید، پیش‌نویس بنویسید و پس از بازبینی صادر کنید.</p></header><PatientSelector onSelect={(patientId) => router.push(`/prescriptions?patientId=${encodeURIComponent(patientId)}`)} /></div>;
  return <PrescriptionEditor key={id} patientId={id} />;
}
function PrescriptionEditor({ patientId, appointmentId, patientName, onDirtyChange }: Props & { patientId: string }) {
  const { authentication } = useDashboardSession();
  const router = useRouter();
  const [records, setRecords] = useState<Prescription[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<PrescriptionItemInput[]>([emptyItem()]);
  const [baseline, setBaseline] = useState(JSON.stringify([emptyItem()]));
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pendingSelect, setPendingSelect] = useState<string | null>(null);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [history, setHistory] = useState<Prescription[] | null>(null);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const command = useRef<{ hash: string; id: string } | null>(null);
  const live = useRef(true);
  const initialized = useRef(false);
  const [hasPatientData, setHasPatientData] = useState(false);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const selected = records.find(record => record.id === selectedId) ?? null;
  const dirty = baseline !== JSON.stringify(items) || reason.trim().length > 0;
  useEffect(() => { onDirtyChange?.(dirty || busy); }, [dirty, busy, onDirtyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  const choose = (record: Prescription | null) => {
    const values = fromRecord(record); setSelectedId(record?.id ?? null); setItems(values); setBaseline(JSON.stringify(values));
    setReason(""); setPendingSelect(null); setConfirmIssue(false); setHistory(null); setError(""); setNotice(""); command.current = null;
  };
  useEffect(() => {
    let active = true; live.current = true;
    if (initialized.current) return () => { live.current = false; };
    void listPrescriptions(authentication.accessToken, patientId).then(data => { if (active) { initialized.current = true; setHasPatientData(true); setResolvedName(data.patientDisplayName ?? null); setRecords(data.items); setCursor(data.nextCursor ?? null); choose(appointmentId ? null : data.items[0] ?? null); } }, cause => { if (active) setError(prescriptionError(cause)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; live.current = false; };
  }, [authentication.accessToken, patientId]);
  const reload = async (more = false) => {
    if (busy) return; setBusy(true); setError("");
    try {
      const data = await listPrescriptions(authentication.accessToken, patientId, more ? cursor ?? undefined : undefined);
      if (!live.current) return;
      initialized.current = true; setHasPatientData(true); setResolvedName(data.patientDisplayName ?? null);
      setRecords(current => more ? [...new Map([...current, ...data.items].map(row => [row.id, row])).values()] : data.items); setCursor(data.nextCursor ?? null);
      if (!more) choose(data.items.find(row => row.id === selectedId) ?? data.items[0] ?? null);
    } catch (cause) { if (live.current) setError(prescriptionError(cause)); } finally { if (live.current) setBusy(false); }
  };
  const switchTo = (target: string) => {
    if (busy) return;
    if (dirty) { setPendingSelect(target); return; }
    if (target === "patient") router.push("/prescriptions"); else if (target === "reload") void reload(); else choose(records.find(row => row.id === target) ?? null);
  };
  const save = async () => {
    if (busy || !items.length || items.some(item => !item.medicationName.trim())) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const hash = JSON.stringify(items);
      if (command.current?.hash !== hash) command.current = { hash, id: crypto.randomUUID() };
      const result = selected ? await revisePrescription(authentication.accessToken, patientId, selected, items, reason) : await createPrescription(authentication.accessToken, patientId, items, { appointmentId, commandId: command.current.id });
      if (!live.current) return;
      setRecords(current => [result, ...current.filter(row => row.id !== result.id)]); choose(result); setNotice(result.revision?.state === "ISSUED" ? "این نسخه قبلاً صادر شده و در حساب بیمار قابل مشاهده است." : "پیش‌نویس ذخیره شد؛ هنوز برای بیمار صادر نشده است.");
    } catch (cause) { if (live.current) setError(prescriptionError(cause)); } finally { if (live.current) setBusy(false); }
  };
  const issue = async () => {
    if (!selected || dirty || busy || selected.revision?.state !== "DRAFT") return;
    setBusy(true); setError("");
    try {
      const result = await issuePrescription(authentication.accessToken, patientId, selected);
      if (!live.current) return;
      setRecords(current => current.map(row => row.id === result.id ? result : row)); choose(result); setNotice("نسخه صادر شد و در بخش نسخه‌ها و درمان حساب بیمار قابل مشاهده است.");
    } catch (cause) { if (live.current) setError(prescriptionError(cause)); } finally { if (live.current) setBusy(false); }
  };
  const showHistory = async (more = false) => {
    if (!selected || busy) return; setBusy(true); setError("");
    try { const data = await prescriptionHistory(authentication.accessToken, patientId, selected.id, more ? historyCursor ?? undefined : undefined); if (live.current) { setHistory(current => more ? [...(current ?? []), ...data.items] : data.items); setHistoryCursor(data.nextBefore); } }
    catch (cause) { if (live.current) setError(prescriptionError(cause)); } finally { if (live.current) setBusy(false); }
  };
  const update = (index: number, key: keyof PrescriptionItemInput, value: string) => setItems(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item));
  return <div className={`space-y-5 ${appointmentId ? "p-4 sm:p-5" : "min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"}`}>
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-lg font-bold">نسخهٔ {resolvedName || patientName || "بیمار انتخاب‌شده"}</h1><p className="mt-1 text-sm text-muted-foreground">دارو، مقدار و دستور مصرف را ثبت و پیش از صدور بازبینی کنید.</p></div>{!appointmentId && <button type="button" disabled={busy} onClick={() => switchTo("patient")} className={button}>انتخاب بیمار دیگر</button>}<button type="button" disabled={busy || loading || !hasPatientData} onClick={() => switchTo("new")} className={button}><Plus size={16} />نسخهٔ جدید</button></header>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}<button disabled={busy} className="ms-3 underline" onClick={() => switchTo("reload")}>دریافت آخرین اطلاعات</button></div>}
    {notice && <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">{notice}</p>}
    {pendingSelect && <div role="alert" className="rounded-xl border border-border bg-secondary p-4 text-sm"><p>تغییرات ذخیره‌نشده دارید. با ادامه، فقط تغییرات ذخیره‌نشده کنار گذاشته می‌شوند.</p><div className="mt-3 flex gap-2"><button disabled={busy} className={button} onClick={() => { const target = pendingSelect; setPendingSelect(null); if (target === "patient") router.push("/prescriptions"); else if (target === "reload") void reload(); else choose(records.find(row => row.id === target) ?? null); }}>کنارگذاشتن و ادامه</button><button disabled={busy} className={button} onClick={() => setPendingSelect(null)}>ادامهٔ نوشتن</button></div></div>}
    {loading ? <p role="status" className="text-sm text-muted-foreground">در حال دریافت نسخه‌ها…</p> : !hasPatientData ? <p className="text-sm text-muted-foreground">پس از دریافت موفق اطلاعات بیمار، نسخه‌نویسی فعال می‌شود.</p> : <div className="grid items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-2"><h2 className="mb-3 text-sm font-bold">نسخه‌های بیمار</h2>{records.map((row, index) => <button type="button" key={row.id} disabled={busy} onClick={() => switchTo(row.id)} aria-pressed={selectedId === row.id} className={`w-full rounded-xl border p-3 text-start ${selectedId === row.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}><span className="flex items-center gap-2 text-sm font-semibold"><FileText size={15} />{row.revision?.state === "ISSUED" ? "صادرشده" : "پیش‌نویس"} · بازنگری {row.currentRevision.toLocaleString("fa-IR")}</span><span className="mt-2 block text-xs text-muted-foreground">{stamp(row.revision?.authoredAt)}</span><span className="mt-1 block text-xs leading-5">{row.revision?.items.map(item => item.medicationName).join("، ") || `نسخه ${index + 1}`}</span></button>)}{!records.length && <p className="text-sm text-muted-foreground">هنوز نسخه‌ای ثبت نشده است.</p>}{cursor && <button disabled={busy} className={button} onClick={() => void reload(true)}>نسخه‌های بیشتر</button>}</aside>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{selected ? selected.revision?.state === "ISSUED" ? "بازبینی و اصلاح نسخهٔ صادرشده" : "پیش‌نویس نسخه" : "نوشتن نسخهٔ جدید"}</h2><span className="text-xs text-muted-foreground">{dirty ? "تغییرات ذخیره نشده" : selected ? "ذخیره‌شده روی سرور" : "هنوز ثبت نشده"}</span></div>
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">{items.map((item, index) => <div key={index} className="rounded-xl border border-border p-3"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">داروی {(index + 1).toLocaleString("fa-IR")}</h3><button type="button" disabled={items.length === 1} aria-label={`حذف داروی ${index + 1}`} onClick={() => setItems(current => current.filter((_, i) => i !== index))} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground disabled:opacity-30"><Trash2 size={17} /></button></div><div className="grid gap-3 sm:grid-cols-2">{([["medicationName", "نام دارو", 255], ["doseText", "مقدار یا دوز", 255], ["frequencyText", "دفعات مصرف", 255], ["durationText", "مدت مصرف", 255]] as const).map(([key, label, max]) => <label key={key} className="text-sm">{label}<input value={item[key] ?? ""} maxLength={max} onChange={e => update(index, key, e.target.value)} className={field} /></label>)}<label className="text-sm sm:col-span-2">توضیحات و دستور مصرف<textarea rows={2} maxLength={10000} value={item.instructions ?? ""} onChange={e => update(index, "instructions", e.target.value)} className={field} /></label></div></div>)}<button type="button" disabled={items.length >= 100} onClick={() => setItems(current => [...current, emptyItem()])} className={button}><Plus size={16} />افزودن دارو</button>
        {selected?.revision?.state === "ISSUED" && <label className="block text-sm">دلیل اصلاح نسخه، الزامی<input maxLength={100} value={reason} onChange={e => setReason(e.target.value)} className={field} /><span className="mt-1 block text-xs text-muted-foreground">نسخهٔ قبلی حفظ می‌شود؛ اصلاح تا زمان صدور مجدد، پیش‌نویس است.</span></label>}</fieldset>
        <div className="flex flex-wrap gap-2 border-t border-border pt-4"><button disabled={busy || !items.length || items.some(item => !item.medicationName.trim()) || (selected?.revision?.state === "ISSUED" && !reason.trim()) || (!!selected && !dirty)} onClick={() => void save()} className={`${button} bg-primary text-primary-foreground`}><Save size={16} />{busy ? "در حال ثبت…" : selected?.revision?.state === "ISSUED" ? "ذخیرهٔ اصلاح به‌صورت پیش‌نویس" : "ذخیرهٔ پیش‌نویس"}</button>{selected?.revision?.state === "DRAFT" && <button disabled={busy || dirty} onClick={() => setConfirmIssue(true)} className={button}><Send size={16} />صدور برای بیمار</button>}{selected && <button disabled={busy} onClick={() => void showHistory()} className={button}>سابقهٔ بازنگری‌ها</button>}</div>
        {dirty && selected?.revision?.state === "DRAFT" && <p className="text-xs text-muted-foreground">برای صدور، ابتدا تغییرات فعلی را ذخیره کنید.</p>}
        {confirmIssue && <div role="alert" className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm"><p>همین پیش‌نویس ذخیره‌شده برای بیمار صادر شود؟ داروها و دستور مصرف را بازبینی کنید.</p><div className="mt-3 flex gap-2"><button disabled={busy || dirty} onClick={() => void issue()} className={`${button} bg-primary text-primary-foreground`}>تأیید و صدور</button><button disabled={busy} onClick={() => setConfirmIssue(false)} className={button}>بازگشت به نوشتن</button></div></div>}
        {history && <div className="space-y-3 border-t border-border pt-4"><h3 className="font-bold text-sm">سابقهٔ بازنگری‌ها</h3>{history.map(row => <details key={row.revision?.id} className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm">بازنگری {row.revision?.revisionNumber} · {row.revision?.state === "ISSUED" ? "صادرشده" : "پیش‌نویس"} · {stamp(row.revision?.authoredAt)}</summary>{row.revision?.amendmentReasonCategory && <p className="mt-2 text-sm">دلیل اصلاح: {row.revision.amendmentReasonCategory}</p>}{row.revision?.items.map(item => <p key={item.id} className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{item.medicationName} · {[item.doseText, item.frequencyText, item.durationText, item.instructions].filter(Boolean).join("، ")}</p>)}</details>)}{historyCursor && <button disabled={busy} onClick={() => void showHistory(true)} className={button}>بازنگری‌های قدیمی‌تر</button>}</div>}
      </section>
    </div>}
  </div>;
}
