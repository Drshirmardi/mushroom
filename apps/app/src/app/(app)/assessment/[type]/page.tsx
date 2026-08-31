"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { assessmentErrorMessage, listPublishedAssessments, saveAssessmentAnswers, startAssessment, submitAssessment, type AssessmentSubmission, type PublishedAssessment } from "@/lib/assessment-api";
import { toP } from "@/lib/format";

type JsonObject = Record<string, unknown>;
type Question = JsonObject & { id: string; type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "BOOLEAN" | "NUMBER" | "TEXT"; text: string; required: boolean };
const object = (value: unknown): JsonObject => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};

function questions(structure: JsonObject): Question[] {
  if (!Array.isArray(structure.sections)) return [];
  return structure.sections.map(object).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)).flatMap((value) => {
    if (!Array.isArray(value.questions)) return [];
    return value.questions.map(object).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)).flatMap((question) => {
      const type = question.type;
      if (typeof question.id !== "string" || !["SINGLE_CHOICE", "MULTIPLE_CHOICE", "BOOLEAN", "NUMBER", "TEXT"].includes(String(type))) return [];
      const text = [question.text, question.title, question.label].find((item) => typeof item === "string") as string | undefined;
      return [{ ...question, id: question.id, type: type as Question["type"], text: text ?? "سوال بدون عنوان", required: question.required !== false }];
    });
  });
}

const answered = (question: Question, answer: unknown) => answer !== undefined && answer !== null && (question.type !== "TEXT" || typeof answer === "string" && answer.trim() !== "") && (question.type !== "MULTIPLE_CHOICE" || Array.isArray(answer) && answer.length > 0);

export default function AssessmentWizardPage() {
  const router = useRouter();
  const { type: assessmentVersionId } = useParams<{ type: string }>();
  const { authentication } = useAuthSession();
  const [assessment, setAssessment] = useState<PublishedAssessment | null>(null);
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = useMemo(() => assessment ? questions(assessment.structure) : [], [assessment]);
  const current = items[step];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listPublishedAssessments(authentication.accessToken);
        const found = list.items.find((item) => item.id === assessmentVersionId);
        if (!found) throw new Error("ASSESSMENT_NOT_FOUND");
        const attempt = await startAssessment(authentication.accessToken, found.id);
        if (!cancelled) { setAssessment(found); setSubmission(attempt); setAnswers(attempt.answers); }
      } catch (reason) { if (!cancelled) setError(assessmentErrorMessage(reason)); }
    })();
    return () => { cancelled = true; };
  }, [assessmentVersionId, authentication.accessToken]);

  const persist = async () => {
    if (!submission) return null;
    const saved = await saveAssessmentAnswers(authentication.accessToken, submission.id, { answers });
    setSubmission(saved); setAnswers(saved.answers); return saved;
  };

  const continueFlow = async () => {
    if (!current || current.required && !answered(current, answers[current.id])) { setError("پاسخ این سوال ضروری است."); return; }
    setBusy(true); setError(null);
    try {
      const saved = await persist();
      if (!saved) return;
      if (step < items.length - 1) { setStep((value) => value + 1); return; }
      const storageKey = `assessment-submit-key:${saved.id}`;
      let idempotencyKey = sessionStorage.getItem(storageKey);
      if (!idempotencyKey) { idempotencyKey = crypto.randomUUID(); sessionStorage.setItem(storageKey, idempotencyKey); }
      const completed = await submitAssessment(authentication.accessToken, saved.id, idempotencyKey);
      router.push(`/assessment/result?submissionId=${completed.id}`);
    } catch (reason) { setError(assessmentErrorMessage(reason)); }
    finally { setBusy(false); }
  };

  const saveAndExit = async () => {
    setBusy(true); setError(null);
    try { await persist(); router.push("/assessment"); } catch (reason) { setError(assessmentErrorMessage(reason)); } finally { setBusy(false); }
  };

  if (!assessment && !error) return <div><PageHeader title="ارزیابی" onBack={() => router.back()} /><p role="status" className="m-4 rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت ارزیابی و پیش‌نویس شما…</p></div>;
  if (!assessment || !submission || items.length === 0) return <div><PageHeader title="ارزیابی" onBack={() => router.back()} /><p role="alert" className="m-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error ?? "ساختار این ارزیابی قابل نمایش نیست."}</p></div>;

  return <div><PageHeader title={assessment.title} onBack={step === 0 ? () => router.back() : () => setStep((value) => value - 1)} /><div className="px-4 space-y-5 pb-4"><div><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>سوال {toP(step + 1)} از {toP(items.length)}</span><span>تلاش {toP(submission.attemptNumber)}</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / items.length) * 100}%` }} /></div></div><div className="rounded-3xl border border-border bg-white p-5"><p className="mb-4 text-sm font-bold text-foreground">{current.text}</p><AnswerInput question={current} value={answers[current.id]} onChange={(value) => { setAnswers((all) => ({ ...all, [current.id]: value })); setError(null); }} /></div>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} onClick={() => void continueFlow()} className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-white disabled:opacity-50">{step === items.length - 1 ? "ثبت نهایی و مشاهده نتیجه" : "ذخیره و ادامه"}</button><button disabled={busy} onClick={() => void saveAndExit()} className="w-full rounded-2xl border border-border bg-white py-3 text-sm font-bold text-muted-foreground disabled:opacity-50">ذخیره و خروج</button></div></div>;
}

function AnswerInput({ question, value, onChange }: { question: Question; value: unknown; onChange: (value: unknown) => void }) {
  const options = Array.isArray(question.options) ? question.options.map(object).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)) : [];
  if (question.type === "SINGLE_CHOICE") return <div className="space-y-2">{options.map((option) => <button key={String(option.id)} onClick={() => onChange(option.id)} className={`w-full rounded-2xl border p-3 text-right text-sm ${value === option.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{String(option.label ?? "گزینه")}</button>)}</div>;
  if (question.type === "MULTIPLE_CHOICE") { const selected = Array.isArray(value) ? value : []; return <div className="space-y-2">{options.map((option) => { const active = selected.includes(option.id); return <button key={String(option.id)} onClick={() => onChange(active ? selected.filter((id) => id !== option.id) : [...selected, option.id])} className={`w-full rounded-2xl border p-3 text-right text-sm ${active ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{String(option.label ?? "گزینه")}</button>; })}</div>; }
  if (question.type === "BOOLEAN") return <div className="grid grid-cols-2 gap-3">{[[true, "بله"], [false, "خیر"]].map(([answer, label]) => <button key={String(answer)} onClick={() => onChange(answer)} className={`rounded-2xl border p-4 text-sm font-bold ${value === answer ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{String(label)}</button>)}</div>;
  if (question.type === "NUMBER") return <input type="number" min={typeof question.min === "number" ? question.min : undefined} max={typeof question.max === "number" ? question.max : undefined} value={typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))} className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />;
  return <textarea maxLength={typeof question.maxLength === "number" ? question.maxLength : undefined} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} rows={5} className="w-full resize-none rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />;
}
