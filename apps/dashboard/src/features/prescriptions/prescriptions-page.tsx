"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Save, Send, Trash2 } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import {
  PrescriptionTreatmentApiError,
  createPrescription,
  issuePrescription,
  listPrescriptions,
  revisePrescription,
  type Prescription,
  type PrescriptionItem,
  type PrescriptionItemInput,
} from "@/lib/prescription-treatment-api";

const emptyItem = (): PrescriptionItemInput => ({ medicationName: "", doseText: "", frequencyText: "", durationText: "", instructions: "" });
const itemInput = (item: PrescriptionItem): PrescriptionItemInput => ({ medicationName: item.medicationName, doseText: item.doseText ?? "", frequencyText: item.frequencyText ?? "", durationText: item.durationText ?? "", instructions: item.instructions ?? "" });

export function PrescriptionsPage() {
  const { authentication } = useDashboardSession();
  const patientId = useSearchParams().get("patientId");
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null);
  const [items, setItems] = useState<PrescriptionItemInput[]>([emptyItem()]);
  const [error, setError] = useState<PrescriptionTreatmentApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [amendmentReason, setAmendmentReason] = useState("");
  const [busy, setBusy] = useState(false);
  const latest = prescriptions?.[0] ?? null;

  const load = async () => {
    if (!patientId) return;
    const data = await listPrescriptions(authentication.accessToken, patientId);
    setPrescriptions(data.items);
    const currentItems = data.items[0]?.revision?.items;
    setItems(currentItems?.length ? currentItems.map(itemInput) : [emptyItem()]);
  };

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    void listPrescriptions(authentication.accessToken, patientId).then(
      (data) => {
        if (cancelled) return;
        setPrescriptions(data.items);
        const currentItems = data.items[0]?.revision?.items;
        setItems(currentItems?.length ? currentItems.map(itemInput) : [emptyItem()]);
      },
      (reason: unknown) => {
        if (!cancelled) setError(reason instanceof PrescriptionTreatmentApiError ? reason : new PrescriptionTreatmentApiError(0));
      },
    );
    return () => { cancelled = true; };
  }, [authentication.accessToken, patientId]);

  const change = (index: number, field: keyof PrescriptionItemInput, value: string) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const save = async () => {
    if (!patientId || !items.every((item) => item.medicationName.trim())) return;
    try {
      setBusy(true);
      setError(null);
      const result = latest ? await revisePrescription(authentication.accessToken, patientId, latest, items, amendmentReason) : await createPrescription(authentication.accessToken, patientId, items);
      setMessage(`پیش‌نویس نسخه ${result.currentRevision} ذخیره شد.`);
      setAmendmentReason("");
      await load();
    } catch (reason) {
      setError(reason instanceof PrescriptionTreatmentApiError ? reason : new PrescriptionTreatmentApiError(0));
    } finally { setBusy(false); }
  };

  const issue = async () => {
    if (!patientId || !latest || latest.revision?.state !== "DRAFT") return;
    try {
      setBusy(true);
      setError(null);
      await issuePrescription(authentication.accessToken, patientId, latest);
      setMessage("نسخه با نسخهٔ فعلی صادر شد.");
      await load();
    } catch (reason) {
      setError(reason instanceof PrescriptionTreatmentApiError ? reason : new PrescriptionTreatmentApiError(0));
    } finally { setBusy(false); }
  };

  if (!patientId) return <Notice>بیماری انتخاب نشده است. ابتدا پروندهٔ واقعی بیمار را از بخش بیماران باز کنید.</Notice>;
  if (!prescriptions && !error) return <p className="p-7 text-sm text-muted-foreground">در حال دریافت نسخه‌های بیمار…</p>;
  if (error) return <Notice tone="red">{error.status === 401 || error.status === 403 ? "اجازهٔ دسترسی به نسخه‌های این بیمار را ندارید." : "دریافت یا ذخیرهٔ نسخه ممکن نشد. دادهٔ ساختگی نمایش داده نمی‌شود."}</Notice>;

  const records = prescriptions ?? [];
  return <div className="mx-auto w-full max-w-4xl space-y-5 p-6"><div><h1 className="text-xl font-bold">نسخه‌ساز بیمار</h1><p className="mt-1 text-sm text-muted-foreground">ویرایش فقط روی پیش‌نویس انجام می‌شود؛ نسخهٔ صادرشده در تاریخچه حفظ می‌شود.</p></div><section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex justify-between"><h2 className="font-bold">{latest ? `نسخه ${latest.currentRevision}` : "پیش‌نویس جدید"}</h2><span className="text-xs text-muted-foreground">{latest?.revision?.state === "ISSUED" ? "صادرشده" : "پیش‌نویس"}</span></div><div className="space-y-3">{items.map((item, index) => <div key={index} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-5"><input value={item.medicationName} onChange={(event) => change(index, "medicationName", event.target.value)} placeholder="نام دارو" className="rounded-lg border border-border px-3 py-2 text-sm" /><input value={item.doseText} onChange={(event) => change(index, "doseText", event.target.value)} placeholder="دوز" className="rounded-lg border border-border px-3 py-2 text-sm" /><input value={item.frequencyText} onChange={(event) => change(index, "frequencyText", event.target.value)} placeholder="تناوب" className="rounded-lg border border-border px-3 py-2 text-sm" /><input value={item.durationText} onChange={(event) => change(index, "durationText", event.target.value)} placeholder="مدت" className="rounded-lg border border-border px-3 py-2 text-sm" /><button onClick={() => setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index))} aria-label="حذف دارو" className="rounded-lg border border-border p-2 text-muted-foreground"><Trash2 size={16} /></button><input value={item.instructions} onChange={(event) => change(index, "instructions", event.target.value)} placeholder="دستورالعمل" className="rounded-lg border border-border px-3 py-2 text-sm md:col-span-4" /></div>)}</div><button onClick={() => setItems((current) => [...current, emptyItem()])} className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary"><Plus size={16} />افزودن دارو</button>{latest?.revision?.state === "ISSUED" && <input value={amendmentReason} onChange={(event) => setAmendmentReason(event.target.value)} placeholder="دسته‌بندی دلیل اصلاح نسخهٔ صادرشده" className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm" />}<div className="mt-5 flex gap-2"><button onClick={() => void save()} disabled={busy || items.some((item) => !item.medicationName.trim()) || (latest?.revision?.state === "ISSUED" && !amendmentReason.trim())} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save size={15} />{latest?.revision?.state === "ISSUED" ? "ایجاد اصلاح" : "ذخیرهٔ پیش‌نویس"}</button>{latest?.revision?.state === "DRAFT" && <button onClick={() => void issue()} disabled={busy} className="flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"><Send size={15} />صدور نسخه</button>}</div>{message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}</section><section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">تاریخچهٔ نسخه‌ها</h2>{records.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">هنوز نسخه‌ای ثبت نشده است.</p> : <div className="mt-3 space-y-2">{records.map((prescription) => <div key={prescription.id} className="rounded-lg border border-border p-3 text-sm"><div className="flex justify-between"><span>نسخه {prescription.currentRevision}</span><span className="text-muted-foreground">{prescription.revision?.state === "ISSUED" ? "صادرشده" : "پیش‌نویس"}</span></div><p className="mt-1 text-xs text-muted-foreground">{prescription.revision?.items.map((item) => item.medicationName).join("، ") || "بدون قلم دارو"}</p></div>)}</div>}</section></div>;
}

function Notice({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "red" }) { return <div className={`m-7 rounded-xl border p-4 text-sm ${tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-border bg-card text-muted-foreground"}`}>{children}</div>; }
