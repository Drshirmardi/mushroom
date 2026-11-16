"use client";
import { useCallback, useEffect, useState } from "react";
import { createClinicalNote, getClinicalWorkspace, type ClinicalWorkspace } from "@/lib/clinical-workspace-api";
import { ClinicalNoteEditor } from "@/features/patients/workspace/clinical-note-editor";

export function VisitNotes({ token, patientId, appointmentId, visitStatus, onDirtyChange }: { token: string; patientId: string; appointmentId: string; visitStatus: string; onDirtyChange?: (value: boolean) => void }) {
  const [data, setData] = useState<ClinicalWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [editorDirty, setEditorDirty] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { onDirtyChange?.(busy || !!content.trim() || !!summary.trim() || Object.values(editorDirty).some(Boolean)); }, [busy, content, summary, editorDirty, onDirtyChange]);
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
    {data && <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">یادداشت‌های ویزیت‌های قبلی</summary><div className="mt-3 space-y-3">{data.notes.filter(note => note.encounterId !== encounter?.id).map(note => <article key={note.id} className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{note.revision?.authoredAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(note.revision.authoredAt)) : ""} · {note.revision?.state === "SIGNED" ? "امضاشده" : "پیش‌نویس"}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{note.revision?.content}</p></article>)}{!data.notes.some(note => note.encounterId !== encounter?.id) && <p className="text-sm text-muted-foreground">یادداشت قبلی ثبت نشده است.</p>}</div></details>}
    {data && !encounter && <p className="text-sm text-muted-foreground">با شروع ویزیت، ثبت یادداشت برای همین نوبت فعال می‌شود.</p>}
    {encounter && <><div className="space-y-3">{data?.notes.filter(note => note.encounterId === encounter.id).map(note => <ClinicalNoteEditor key={`${note.id}:${note.currentRevision}`} note={note} accessToken={token} patientId={patientId} onChanged={load} onDirtyChange={value => setEditorDirty(current => current[note.id] === value ? current : { ...current, [note.id]: value })} />)}</div>
      <label className="block text-sm font-bold">یادداشت این ویزیت<textarea value={content} onChange={event => setContent(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm font-normal" /></label>
      <label className="block text-sm font-bold">خلاصه برای بیمار، اختیاری<textarea value={summary} onChange={event => setSummary(event.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm font-normal" /></label>
      <button type="button" disabled={busy || !content.trim()} onClick={() => void save()} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "در حال ثبت…" : "ثبت پیش‌نویس یادداشت"}</button>
    </>}
  </div>;
}
