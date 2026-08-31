"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, Plus, Save, Send, Trash2 } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { StatusBadge } from "@/components/shared";
import {
  AssessmentApiError, archiveAssessment, createAssessment, duplicateAssessment,
  getAssessment, getAssessmentPolicy, listAssessmentSubmissions, listAssessments,
  publishAssessment, updateAssessment, updateAssessmentPolicy,
  type AssessmentList, type AssessmentPolicy, type AssessmentSubmissionList, type AssessmentVersion,
} from "@/lib/assessment-api";
import { p } from "@/lib/utils";

type View = "list" | "builder" | "results";
type LoadState<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "forbidden" | "unavailable" | "error" };
type JsonObject = Record<string, unknown>;
type Choice = { id: string; label: string; order: number; score: number };
type Question = { id: string; type: "SINGLE_CHOICE"; text: string; required: boolean; options: Choice[] };

const object = (value: unknown): JsonObject => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
const requestState = (error: unknown): "forbidden" | "unavailable" | "error" => error instanceof AssessmentApiError && [401, 403].includes(error.status) ? "forbidden" : error instanceof AssessmentApiError && error.status === 0 ? "unavailable" : "error";
const statusLabel = (status: AssessmentVersion["status"]) => status === "PUBLISHED" ? "منتشرشده" : status === "DRAFT" ? "پیش‌نویس" : "بایگانی";
const stateLabel = (state: "IN_PROGRESS" | "COMPLETE" | "INVALIDATED") => state === "COMPLETE" ? "تکمیل‌شده" : state === "IN_PROGRESS" ? "در حال تکمیل" : "نامعتبر";
const questionCount = (structure: JsonObject) => Array.isArray(structure.sections) ? structure.sections.reduce((sum, section) => sum + (Array.isArray(object(section).questions) ? (object(section).questions as unknown[]).length : 0), 0) : 0;
const resultBand = (snapshot: JsonObject | null | undefined) => typeof object(snapshot?.resultBand).title === "string" ? object(snapshot?.resultBand).title as string : null;
const blankQuestion = (): Question => ({ id: crypto.randomUUID(), type: "SINGLE_CHOICE", text: "", required: true, options: [0, 1].map((score) => ({ id: crypto.randomUUID(), label: "", order: score + 1, score })) });

function readQuestions(structure: JsonObject): Question[] | null {
  const section = object(Array.isArray(structure.sections) ? structure.sections[0] : null);
  if (!Array.isArray(section.questions)) return [];
  if (section.questions.some((value) => object(value).type !== "SINGLE_CHOICE")) return null;
  return section.questions.flatMap((value) => {
    const question = object(value);
    if (typeof question.id !== "string" || question.type !== "SINGLE_CHOICE") return [];
    const options = Array.isArray(question.options) ? question.options.map(object).flatMap((option, index) => typeof option.id === "string" ? [{ id: option.id, label: typeof option.label === "string" ? option.label : "", order: typeof option.order === "number" ? option.order : index + 1, score: typeof option.score === "number" ? option.score : 0 }] : []) : [];
    return [{ id: question.id, type: "SINGLE_CHOICE" as const, text: typeof question.text === "string" ? question.text : "", required: question.required !== false, options }];
  });
}

function structureWithQuestions(current: JsonObject, questions: Question[]) {
  const sections = Array.isArray(current.sections) ? current.sections : [];
  const section = object(sections[0]);
  return { ...current, schemaVersion: 1, sections: [{ ...section, id: typeof section.id === "string" ? section.id : "main", title: typeof section.title === "string" ? section.title : "سوالات", order: typeof section.order === "number" ? section.order : 1, questions }, ...sections.slice(1)] };
}

function Notice({ state, subject }: { state: "loading" | "forbidden" | "unavailable" | "error"; subject: string }) {
  const text = state === "loading" ? `در حال دریافت ${subject}…` : state === "forbidden" ? `اجازهٔ مشاهده یا مدیریت ${subject} را ندارید.` : state === "unavailable" ? `سرویس ${subject} در دسترس نیست.` : `دریافت ${subject} انجام نشد. صفحه را دوباره بارگذاری کنید.`;
  const tone = state === "forbidden" ? "border-amber-200 bg-amber-50 text-amber-800" : state === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-border bg-card text-muted-foreground";
  return <p role={state === "loading" ? "status" : "alert"} className={`rounded-xl border p-4 text-sm ${tone}`}>{text}</p>;
}

export function AssessmentsPage() {
  const router = useRouter();
  const { authentication } = useDashboardSession();
  const token = authentication.accessToken;
  const [view, setView] = useState<View>("list");
  const [versions, setVersions] = useState<LoadState<AssessmentList>>({ status: "loading" });
  const [policy, setPolicy] = useState<LoadState<AssessmentPolicy>>({ status: "loading" });
  const [submissions, setSubmissions] = useState<LoadState<AssessmentSubmissionList>>({ status: "loading" });
  const [resultVersionId, setResultVersionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [structure, setStructure] = useState<JsonObject>({ schemaVersion: 1, sections: [] });
  const [questions, setQuestions] = useState<Question[]>([]);

  const refresh = useCallback(async () => {
    const [list, nextPolicy] = await Promise.allSettled([listAssessments(token), getAssessmentPolicy(token)]);
    setVersions(list.status === "fulfilled" ? { status: "ready", data: list.value } : { status: requestState(list.reason) });
    setPolicy(nextPolicy.status === "fulfilled" ? { status: "ready", data: nextPolicy.value } : { status: requestState(nextPolicy.reason) });
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([listAssessments(token), getAssessmentPolicy(token)]).then(([list, nextPolicy]) => {
      if (cancelled) return;
      setVersions(list.status === "fulfilled" ? { status: "ready", data: list.value } : { status: requestState(list.reason) });
      setPolicy(nextPolicy.status === "fulfilled" ? { status: "ready", data: nextPolicy.value } : { status: requestState(nextPolicy.reason) });
    });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (view !== "results") return;
    let cancelled = false;
    void listAssessmentSubmissions(token, { assessmentVersionId: resultVersionId || undefined }).then(
      (data) => { if (!cancelled) setSubmissions({ status: "ready", data }); },
      (error: unknown) => { if (!cancelled) setSubmissions({ status: requestState(error) }); },
    );
    return () => { cancelled = true; };
  }, [resultVersionId, token, view]);

  const published = versions.status === "ready" ? versions.data.items.filter((item) => item.status === "PUBLISHED") : [];
  const openNew = () => { setDraftId(null); setTitle(""); setStructure({ schemaVersion: 1, sections: [] }); setQuestions([]); setActionError(""); setView("builder"); };
  const openDraft = async (id: string) => {
    setBusy(true); setActionError("");
    try { const draft = await getAssessment(token, id); const editable = readQuestions(draft.structure); if (!editable) { setActionError("این پیش‌نویس شامل نوع سوالی است که این سازنده هنوز ویرایش نمی‌کند؛ دادهٔ آن بدون تغییر باقی ماند."); return; } setDraftId(id); setTitle(draft.title); setStructure(draft.structure); setQuestions(editable); setView("builder"); }
    catch { setActionError("نسخهٔ ارزیابی دریافت نشد."); }
    finally { setBusy(false); }
  };
  const saveDraft = async () => {
    if (!title.trim() || questions.length === 0 || questions.some((question) => !question.text.trim() || question.options.length < 2 || question.options.some((option) => !option.label.trim()))) { setActionError("عنوان، حداقل یک سوال و دو گزینهٔ کامل لازم است."); return null; }
    setBusy(true); setActionError("");
    try { const body = { title: title.trim(), structure: structureWithQuestions(structure, questions) }; const saved = draftId ? await updateAssessment(token, draftId, body) : await createAssessment(token, body); setDraftId(saved.id); setStructure(saved.structure); await refresh(); return saved; }
    catch { setActionError("ذخیرهٔ ارزیابی انجام نشد. ورودی‌ها را بررسی کنید."); return null; }
    finally { setBusy(false); }
  };
  const publishDraft = async () => {
    const saved = await saveDraft(); if (!saved) return;
    setBusy(true); try { await publishAssessment(token, saved.id); await refresh(); setView("list"); } catch { setActionError("انتشار انجام نشد. اگر نسخهٔ دیگری منتشر است، ابتدا آن را بایگانی کنید."); } finally { setBusy(false); }
  };
  const lifecycle = async (action: "duplicate" | "archive", id: string) => {
    setBusy(true); setActionError("");
    try { if (action === "duplicate") { const draft = await duplicateAssessment(token, id); await refresh(); await openDraft(draft.id); } else { await archiveAssessment(token, id); await refresh(); } }
    catch { setActionError(action === "duplicate" ? "ساخت پیش‌نویس انجام نشد." : "بایگانی انجام نشد؛ نسخهٔ موردنیاز policy قابل بایگانی نیست."); }
    finally { setBusy(false); }
  };
  const setRequirement = async (required: boolean, versionId?: string) => {
    setBusy(true); setActionError("");
    try { const data = await updateAssessmentPolicy(token, required ? { assessmentRequirement: "REQUIRED", requiredAssessmentVersionId: versionId, validityDays: policy.status === "ready" ? policy.data.validityDays : null, requireLatestPublishedVersion: policy.status === "ready" && policy.data.requireLatestPublishedVersion } : { assessmentRequirement: "NOT_REQUIRED" }); setPolicy({ status: "ready", data }); }
    catch { setActionError("به‌روزرسانی الزام ارزیابی انجام نشد."); }
    finally { setBusy(false); }
  };

  return <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
    <div className="flex items-center gap-2 bg-card border border-border rounded-2xl p-1.5 w-fit shadow-sm">{(["list", "builder", "results"] as const).map((item) => <button key={item} onClick={() => item === "builder" ? openNew() : setView(item)} className={`px-5 py-2.5 rounded-xl text-sm font-bold ${view === item ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{item === "list" ? "لیست ارزیابی‌ها" : item === "builder" ? "ساخت ارزیابی" : "نتایج"}</button>)}</div>
    {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{actionError}</p>}
    {view === "list" && <ListView state={versions} policy={policy} published={published} busy={busy} onNew={openNew} onEdit={(id) => void openDraft(id)} onResults={(id) => { setResultVersionId(id); setView("results"); setSubmissions({ status: "loading" }); }} onDuplicate={(id) => void lifecycle("duplicate", id)} onArchive={(id) => void lifecycle("archive", id)} onRequirement={(required, id) => void setRequirement(required, id)} />}
    {view === "builder" && <Builder title={title} questions={questions} busy={busy} editing={Boolean(draftId)} onTitle={setTitle} onQuestions={setQuestions} onSave={() => void saveDraft()} onPublish={() => void publishDraft()} />}
    {view === "results" && <Results state={submissions} versions={versions.status === "ready" ? versions.data.items : []} selected={resultVersionId} onVersion={(id) => { setResultVersionId(id); setSubmissions({ status: "loading" }); }} onPatient={(id) => router.push(`/patients/${id}`)} />}
  </div>;
}

function ListView({ state, policy, published, busy, onNew, onEdit, onResults, onDuplicate, onArchive, onRequirement }: { state: LoadState<AssessmentList>; policy: LoadState<AssessmentPolicy>; published: AssessmentVersion[]; busy: boolean; onNew: () => void; onEdit: (id: string) => void; onResults: (id: string) => void; onDuplicate: (id: string) => void; onArchive: (id: string) => void; onRequirement: (required: boolean, id?: string) => void }) {
  if (state.status !== "ready") return <Notice state={state.status} subject="فهرست ارزیابی‌ها" />;
  return <div className="space-y-4"><button onClick={onNew} disabled={busy} className="mr-auto flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"><Plus size={16} />ارزیابی جدید</button>
    {policy.status === "ready" ? <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm"><strong>الزام پیش از رزرو</strong><label className="flex items-center gap-2"><input type="checkbox" checked={policy.data.assessmentRequirement === "REQUIRED"} disabled={busy || published.length === 0} onChange={(event) => onRequirement(event.target.checked, event.target.checked ? published[0]?.id : undefined)} />فعال</label>{policy.data.assessmentRequirement === "REQUIRED" && <select value={policy.data.requiredAssessmentVersionId ?? ""} disabled={busy} onChange={(event) => onRequirement(true, event.target.value)} className="rounded-lg border border-border bg-secondary px-3 py-2"><option value="" disabled>نسخهٔ منتشرشده</option>{published.map((item) => <option key={item.id} value={item.id}>{item.title} — نسخه {p(item.versionNumber)}</option>)}</select>}{published.length === 0 && <span className="text-xs text-muted-foreground">برای فعال‌سازی ابتدا یک نسخه منتشر کنید.</span>}</div> : <Notice state={policy.status} subject="سیاست ارزیابی رزرو" />}
    {state.data.items.length === 0 ? <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">هنوز ارزیابی‌ای ساخته نشده است.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{state.data.items.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="font-bold text-sm">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">نسخه {p(item.versionNumber)} · {item.locale}</p></div><StatusBadge status={statusLabel(item.status)} /></div><p className="mb-4 text-xs text-muted-foreground">{p(questionCount(item.structure))} سوال</p><div className="flex flex-wrap gap-2"><button onClick={() => onResults(item.id)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">نتایج</button>{item.status === "DRAFT" && <button onClick={() => onEdit(item.id)} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">ویرایش</button>}<button aria-label="ساخت نسخه پیش‌نویس" onClick={() => onDuplicate(item.id)} disabled={busy} className="rounded-lg border border-border p-2"><Copy size={14} /></button>{item.status === "PUBLISHED" && <button aria-label="بایگانی" onClick={() => onArchive(item.id)} disabled={busy} className="rounded-lg border border-border p-2"><Archive size={14} /></button>}</div></div>)}</div>}
  </div>;
}

function Builder({ title, questions, busy, editing, onTitle, onQuestions, onSave, onPublish }: { title: string; questions: Question[]; busy: boolean; editing: boolean; onTitle: (value: string) => void; onQuestions: React.Dispatch<React.SetStateAction<Question[]>>; onSave: () => void; onPublish: () => void }) {
  const update = (id: string, change: (question: Question) => Question) => onQuestions((current) => current.map((question) => question.id === id ? change(question) : question));
  return <div className="grid gap-6 xl:grid-cols-[1fr_18rem]"><div className="space-y-4"><div className="rounded-2xl border border-border bg-card p-5"><input value={title} onChange={(event) => onTitle(event.target.value)} placeholder="عنوان ارزیابی…" className="w-full bg-transparent text-lg font-bold outline-none" /></div>{questions.map((question, index) => <div key={question.id} className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex justify-between"><span className="text-xs font-bold text-muted-foreground">سوال {p(index + 1)} · تک‌انتخابی</span><button aria-label="حذف سوال" onClick={() => onQuestions((current) => current.filter((item) => item.id !== question.id))}><Trash2 size={14} /></button></div><input value={question.text} onChange={(event) => update(question.id, (item) => ({ ...item, text: event.target.value }))} placeholder="متن سوال…" className="mb-3 w-full rounded-xl bg-secondary px-4 py-3 text-sm" /><label className="mb-3 flex gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={question.required} onChange={(event) => update(question.id, (item) => ({ ...item, required: event.target.checked }))} />پاسخ اجباری</label><div className="space-y-2">{question.options.map((option, optionIndex) => <div key={option.id} className="grid grid-cols-[1fr_6rem_auto] gap-2"><input value={option.label} onChange={(event) => update(question.id, (item) => ({ ...item, options: item.options.map((choice) => choice.id === option.id ? { ...choice, label: event.target.value } : choice) }))} placeholder={`گزینه ${p(optionIndex + 1)}`} className="rounded-lg bg-secondary px-3 py-2 text-sm" /><input type="number" value={option.score} aria-label="امتیاز گزینه" onChange={(event) => update(question.id, (item) => ({ ...item, options: item.options.map((choice) => choice.id === option.id ? { ...choice, score: Number(event.target.value) } : choice) }))} className="rounded-lg bg-secondary px-3 py-2 text-sm" /><button aria-label="حذف گزینه" onClick={() => update(question.id, (item) => ({ ...item, options: item.options.filter((choice) => choice.id !== option.id) }))}><Trash2 size={13} /></button></div>)}<button onClick={() => update(question.id, (item) => ({ ...item, options: [...item.options, { id: crypto.randomUUID(), label: "", order: item.options.length + 1, score: 0 }] }))} className="text-xs font-bold text-primary">+ افزودن گزینه</button></div></div>)}{questions.length === 0 && <p className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">برای شروع یک سوال اضافه کنید.</p>}</div><aside className="space-y-3"><button onClick={() => onQuestions((current) => [...current, blankQuestion()])} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border p-3 text-sm font-bold"><Plus size={16} />سوال تک‌انتخابی</button><button onClick={onSave} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary p-3 text-sm font-bold text-primary disabled:opacity-50"><Save size={16} />{editing ? "ذخیره پیش‌نویس" : "ایجاد پیش‌نویس"}</button><button onClick={onPublish} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><Send size={16} />ذخیره و انتشار</button><p className="text-xs leading-5 text-muted-foreground">نسخهٔ منتشرشده تغییر نمی‌کند؛ برای ویرایش آن یک پیش‌نویس تازه بسازید.</p></aside></div>;
}

function Results({ state, versions, selected, onVersion, onPatient }: { state: LoadState<AssessmentSubmissionList>; versions: AssessmentVersion[]; selected: string; onVersion: (id: string) => void; onPatient: (id: string) => void }) {
  return <div className="space-y-4"><div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><h2 className="font-bold">نتایج ارزیابی‌ها</h2><select value={selected} onChange={(event) => onVersion(event.target.value)} className="mr-auto rounded-lg border border-border bg-secondary px-3 py-2 text-sm"><option value="">همه نسخه‌ها</option>{versions.map((item) => <option key={item.id} value={item.id}>{item.title} — نسخه {p(item.versionNumber)}</option>)}</select></div>{state.status !== "ready" ? <Notice state={state.status} subject="نتایج ارزیابی" /> : state.data.items.length === 0 ? <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">نتیجه‌ای برای این فیلتر ثبت نشده است.</p> : <div className="overflow-x-auto rounded-2xl border border-border bg-card"><table className="w-full"><thead><tr className="border-b border-border bg-secondary/30">{["بیمار", "ارزیابی", "وضعیت", "تاریخ", "امتیاز", "نتیجه"].map((label) => <th key={label} className="px-5 py-3 text-right text-xs font-bold text-muted-foreground">{label}</th>)}</tr></thead><tbody>{state.data.items.map((item) => <tr key={item.id} className="border-b border-border last:border-0"><td className="px-5 py-3"><button onClick={() => onPatient(item.patientId)} className="text-xs font-semibold text-primary hover:underline">پرونده · {item.patientId.slice(0, 8)}</button></td><td className="px-5 py-3 text-sm font-semibold">{item.assessmentTitle}</td><td className="px-5 py-3"><StatusBadge status={stateLabel(item.state)} /></td><td className="px-5 py-3 text-xs text-muted-foreground">{item.completedAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.completedAt)) : "ثبت نشده"}</td><td className="px-5 py-3 text-sm font-bold">{item.score ?? "ثبت نشده"}</td><td className="px-5 py-3 text-xs text-muted-foreground">{resultBand(item.resultSnapshot) ?? "ثبت نشده"}</td></tr>)}</tbody></table></div>}</div>;
}
