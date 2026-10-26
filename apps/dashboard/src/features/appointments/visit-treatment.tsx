"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { activateTreatmentPlan, createTreatmentPlan, replaceTreatmentDraft, listTreatmentPlans, prescriptionError, type TreatmentPlanSummary } from "@/lib/prescription-treatment-api";

type Item = { kind: "nutrition" | "exercise" | "session" | "medication"; title: string; instructions: string; dosage: string; goals?: string[]; clinicianInstructions?: string | null };
const blank = (): Item => ({ kind: "nutrition", title: "", instructions: "", dosage: "" });
const names = { nutrition: "توصیهٔ تغذیه", exercise: "تمرین", session: "جلسهٔ درمان", medication: "داروی برنامهٔ درمان" };
const field = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary";
const button = "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40";

export function VisitTreatment({ token, patientId, onDirtyChange }: { token: string; patientId: string; onDirtyChange?: (value: boolean) => void }) {
  const [plans, setPlans] = useState<TreatmentPlanSummary[]>([]);
  const [title, setTitle] = useState(""); const [items, setItems] = useState<Item[]>([blank()]);
  const [editing, setEditing] = useState<TreatmentPlanSummary | null>(null);
  const [saved, setSaved] = useState<TreatmentPlanSummary | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false); const [confirmNew, setConfirmNew] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const command = useRef<{ hash: string; id: string } | null>(null);
  const live = useRef(true);
  const dirty = !saved && (title.trim().length > 0 || items.some(item => item.title.trim() || item.instructions.trim()));
  useEffect(() => { onDirtyChange?.(dirty || busy); }, [dirty, busy, onDirtyChange]);
  useEffect(() => {
    let active = true; live.current = true;
    void listTreatmentPlans(token, patientId).then(value => { if (active) { setPlans(value.items); setError(""); } }, cause => { if (active) setError(prescriptionError(cause)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; live.current = false; };
  }, [token, patientId, attempt]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty, busy]);
  const reset = () => { setEditing(null); setSaved(null); setTitle(""); setItems([blank()]); setConfirmNew(false); setConfirmPublish(false); command.current = null; setNotice(""); };
  const change = (index: number, patch: Partial<Item>) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  const save = async () => {
    if (busy || saved) return;
    const body = { title: title.trim(),
      nutritionPlans: items.filter(item => item.kind === "nutrition").map(item => ({ title: item.title.trim(), instructions: item.instructions.trim() })),
      exercisePlans: items.filter(item => item.kind === "exercise").map(item => ({ title: item.title.trim(), instructions: item.instructions.trim() })),
      sessionPlans: items.filter(item => item.kind === "session").map((item, i) => ({ position: i + 1, title: item.title.trim(), goals: item.goals ?? [], instructions: item.clinicianInstructions ?? undefined, patientInstructions: item.instructions.trim() })),
      medications: items.filter(item => item.kind === "medication").map(item => ({ name: item.title.trim(), dosage: item.dosage.trim(), instructions: item.instructions.trim() })),
    };
    const hash = JSON.stringify(body); if (command.current?.hash !== hash) command.current = { hash, id: crypto.randomUUID() };
    setBusy(true); setError("");
    try { const plan = editing ? await replaceTreatmentDraft(token, patientId, editing, body) : await createTreatmentPlan(token, patientId, { ...body, commandId: command.current.id }); if (live.current) { setSaved(plan); setEditing(null); setPlans(current => [plan, ...current.filter(row => row.id !== plan.id)]); setNotice(plan.state === "ACTIVE" ? "این برنامه قبلاً در حساب بیمار منتشر شده است." : "برنامه ذخیره شد؛ برای نمایش در حساب بیمار، انتشار را تأیید کنید."); } }
    catch (cause) { if (live.current) setError(prescriptionError(cause)); } finally { if (live.current) setBusy(false); }
  };
  const edit = (plan: TreatmentPlanSummary) => {
    setSaved(null); setEditing(plan); setTitle(plan.title ?? ""); setNotice(""); setConfirmPublish(false);
    const rows: Item[] = [
      ...plan.nutritionPlans.map(row => ({ kind: "nutrition" as const, title: row.title, instructions: row.instructions ?? "", dosage: "" })),
      ...plan.exercisePlans.map(row => ({ kind: "exercise" as const, title: row.title, instructions: row.instructions ?? "", dosage: "" })),
      ...plan.medications.map(row => ({ kind: "medication" as const, title: row.name, instructions: row.instructions ?? "", dosage: row.dosage ?? "" })),
      ...plan.sessionPlans.map(row => ({ kind: "session" as const, title: row.title, instructions: row.patientInstructions ?? "", dosage: "", goals: row.goals, clinicianInstructions: row.instructions })),
    ];
    setItems(rows.length ? rows : [blank()]);
  };
  const publish = async () => {
    if (!saved || busy) return; setBusy(true); setError("");
    try { const plan = await activateTreatmentPlan(token, patientId, saved.id); if (live.current) { setSaved(plan); setPlans(current => current.map(row => row.id === plan.id ? plan : row)); setConfirmPublish(false); setNotice("برنامه منتشر شد؛ بیمار آن را در بخش نسخه‌ها و درمان حساب خود می‌بیند."); } }
    catch (cause) { if (live.current) setError(prescriptionError(cause)); } finally { if (live.current) setBusy(false); }
  };
  return <div className="space-y-5 p-4 sm:p-5"><header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">دستورهای تکمیلی درمان</h2><p className="mt-2 text-sm text-muted-foreground">تغذیه، تمرین، دارو یا جلسات پیشنهادی را بنویسید؛ ذخیره و انتشار برای بیمار دو اقدام جدا هستند.</p></div><button disabled={busy} onClick={() => dirty ? setConfirmNew(true) : reset()} className={button}>برنامهٔ جدید</button></header>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{error}<button onClick={() => setAttempt(n => n + 1)} className="ms-2 underline">بازخوانی فهرست</button></p>}
    {notice && <p role="status" className="rounded-xl bg-primary/5 p-3 text-sm">{notice}</p>}
    {confirmNew && <div role="alert" className="rounded-xl border border-border p-4 text-sm"><p>متن ذخیره‌نشده کنار گذاشته شود؟</p><div className="mt-3 flex gap-2"><button disabled={busy} onClick={reset} className={button}>کنارگذاشتن</button><button disabled={busy} onClick={() => setConfirmNew(false)} className={button}>ادامهٔ نوشتن</button></div></div>}
    {!saved ? <section className="space-y-4 rounded-2xl border border-border bg-card p-4"><fieldset disabled={busy} className="space-y-4 disabled:opacity-60"><label className="block text-sm">عنوان برنامه<input maxLength={255} value={title} onChange={e => setTitle(e.target.value)} className={field} /></label>{items.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2"><label className="text-sm">نوع دستور<select value={item.kind} onChange={e => change(index, { kind: e.target.value as Item["kind"] })} className={field}>{Object.entries(names).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><label className="text-sm">{item.kind === "medication" ? "نام دارو" : "عنوان دستور"}<input maxLength={255} value={item.title} onChange={e => change(index, { title: e.target.value })} className={field} /></label>{item.kind === "medication" && <label className="text-sm">دوز یا مقدار<input maxLength={255} value={item.dosage} onChange={e => change(index, { dosage: e.target.value })} className={field} /></label>}<label className="text-sm sm:col-span-2">توضیحات قابل مشاهده برای بیمار<textarea rows={3} maxLength={10000} value={item.instructions} onChange={e => change(index, { instructions: e.target.value })} className={field} /></label><button type="button" disabled={items.length === 1} aria-label={`حذف دستور ${index + 1}`} onClick={() => setItems(current => current.filter((_, i) => i !== index))} className="flex min-h-11 w-fit items-center gap-2 text-sm text-muted-foreground disabled:opacity-30"><Trash2 size={16} />حذف دستور</button></div>)}<button disabled={items.length >= 100} onClick={() => setItems(current => [...current, blank()])} className={`${button} flex items-center gap-2`}><Plus size={16} />افزودن دستور</button></fieldset><button disabled={busy || !title.trim() || items.some(item => !item.title.trim())} onClick={() => void save()} className={`${button} bg-primary text-primary-foreground`}>{busy ? "در حال ثبت…" : "ذخیرهٔ پیش‌نویس برنامه"}</button></section> : <div className="rounded-xl border border-border p-4"><h3 className="font-bold">{saved.title}</h3><p className="mt-2 text-sm text-muted-foreground">{saved.state === "DRAFT" ? "پیش‌نویس؛ هنوز برای بیمار نمایش داده نمی‌شود." : "منتشرشده در حساب بیمار"}</p>{saved.state === "DRAFT" && <button disabled={busy} onClick={() => edit(saved)} className={`${button} mt-3 me-2`}>ویرایش پیش‌نویس</button>}{saved.state === "DRAFT" && <button disabled={busy} onClick={() => setConfirmPublish(true)} className={`${button} mt-3 bg-primary text-primary-foreground`}>انتشار در حساب بیمار</button>}</div>}
    {confirmPublish && saved?.state === "DRAFT" && <div role="alert" className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm"><p>برنامهٔ «{saved.title}» با همین محتوای ذخیره‌شده برای بیمار منتشر شود؟</p><div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void publish()} className={button}>تأیید و انتشار</button><button disabled={busy} onClick={() => setConfirmPublish(false)} className={button}>بازگشت</button></div></div>}
    <section className="space-y-3"><h3 className="text-sm font-bold">برنامه‌های ثبت‌شدهٔ بیمار</h3>{loading && <p role="status" className="text-sm text-muted-foreground">در حال دریافت…</p>}{!loading && !plans.length && <p className="text-sm text-muted-foreground">برنامه‌ای ثبت نشده است.</p>}{plans.map(plan => <details key={plan.id} className="rounded-xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">{plan.title || "برنامهٔ درمان"} · {plan.state === "DRAFT" ? "پیش‌نویس" : plan.state === "ACTIVE" ? "منتشرشده" : plan.state === "COMPLETED" ? "پایان‌یافته" : "باطل‌شده"}</summary><div className="mt-3 space-y-3 text-sm leading-6">{plan.medications.map(item => <p key={item.id}><strong>{item.name}</strong> · {[item.dosage, item.instructions].filter(Boolean).join("، ")}</p>)}{[...plan.nutritionPlans, ...plan.exercisePlans, ...plan.sessionPlans].map(item => <p key={item.id} className="whitespace-pre-wrap"><strong>{item.title}</strong> · {"patientInstructions" in item ? item.patientInstructions : item.instructions}</p>)}</div>{plan.state === "DRAFT" && <button disabled={busy || dirty} onClick={() => edit(plan)} className={`${button} mt-3 me-2`}>ویرایش پیش‌نویس</button>}{plan.state === "DRAFT" && <button disabled={busy || dirty} onClick={() => { setSaved(plan); setConfirmPublish(true); }} className={`${button} mt-3`}>بازبینی و انتشار این برنامه</button>}</details>)}</section>
  </div>;
}
