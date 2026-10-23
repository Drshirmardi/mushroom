"use client";
import { useCallback, useEffect, useState } from "react";
import { createClinicalNote, getClinicalWorkspace, type ClinicalWorkspace } from "@/lib/clinical-workspace-api";
import { ClinicalNoteEditor } from "@/features/patients/workspace/clinical-note-editor";

export function VisitNotes({ token, patientId, appointmentId, visitStatus }: { token: string; patientId: string; appointmentId: string; visitStatus: string }) {
  const [data, setData] = useState<ClinicalWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const value = await getClinicalWorkspace(token, patientId); setData(value); }, [token, patientId]);
  const encounter = data?.encounters.find(item => item.appointmentId === appointmentId);
  useEffect(() => { if (encounter) return; let active = true; void getClinicalWorkspace(token, patientId).then(value => { if (active) { setData(value); setError(null); } }, () => { if (active) setError("دریافت پرونده ممکن نشد؛ مجوز بالینی این حساب را بررسی کنید."); }); return () => { active = false; }; }, [token, patientId, visitStatus, encounter]);
  const save = async () => {
    if (!encounter || !content.trim() || busy) return;
    setBusy(true); setError(null);
    try { await createClinicalNote(token, patientId, encounter.id, { expectedRevision: 0, content: content.trim(), isPrivate: true, patientSummary: summary.trim() || null }); setContent(""); setSummary(""); await load(); }
    catch { setError("ثبت یادداشت انجام نشد؛ متن حفظ شده است."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-4 p-4 sm:p-5">
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!data && !error && <p role="status" className="text-sm text-muted-foreground">در حال دریافت پرونده…</p>}
    {data && !encounter && <p className="text-sm text-muted-foreground">با شروع ویزیت، ثبت یادداشت برای همین نوبت فعال می‌شود.</p>}
    {encounter && <><div className="space-y-3">{data?.notes.filter(note => note.encounterId === encounter.id).map(note => <ClinicalNoteEditor key={`${note.id}:${note.currentRevision}`} note={note} accessToken={token} patientId={patientId} onChanged={load} />)}</div>
      <label className="block text-sm font-bold">یادداشت این ویزیت<textarea value={content} onChange={event => setContent(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm font-normal" /></label>
      <label className="block text-sm font-bold">خلاصه برای بیمار، اختیاری<textarea value={summary} onChange={event => setSummary(event.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm font-normal" /></label>
      <button type="button" disabled={busy || !content.trim()} onClick={() => void save()} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "در حال ثبت…" : "ثبت پیش‌نویس یادداشت"}</button>
    </>}
  </div>;
}
