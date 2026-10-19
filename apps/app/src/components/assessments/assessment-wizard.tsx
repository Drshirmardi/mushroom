"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { AssessmentRequestError, assessmentErrorMessage, getAssessmentQuestionnaire, getAssessmentSubmission, saveAssessmentAnswers, startAssessment, submitAssessment, type AssessmentSubmission, type AssessmentQuestionnaire } from "@/lib/assessment-api";
import { startPaidAssessment } from "@/lib/digital-services-api";
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

function AssessmentWizard() {
  const router = useRouter();
  const { type: assessmentVersionId } = useParams<{ type?: string }>();
  const search = useSearchParams();
  const submissionId = search.get("submissionId");
  const grantId = search.get("grantId");
  const { authentication } = useAuthSession();
  const accessToken = useRef(authentication.accessToken);
  accessToken.current = authentication.accessToken;
  const [assessment, setAssessment] = useState<AssessmentQuestionnaire | null>(null);
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [submitCommand, setSubmitCommand] = useState<{ revision: number; key: string } | null>(null);
  const items = useMemo(() => assessment ? questions(assessment.structure) : [], [assessment]);
  const current = items[step];

  useEffect(() => {
    let cancelled = false;
    setAssessment(null); setSubmission(null); setAnswers({}); setStep(0); setError(null); setConflict(false); setSubmitCommand(null);
    void (async () => {
      try {
        const attempt = submissionId ? await getAssessmentSubmission(accessToken.current, submissionId) : grantId ? await startPaidAssessment(accessToken.current, grantId) : assessmentVersionId ? await startAssessment(accessToken.current, assessmentVersionId) : null;
        if (!attempt) throw new Error("ASSESSMENT_NOT_FOUND");
        if (attempt.state === "COMPLETE") { if (!cancelled) router.replace(`/assessment/result?submissionId=${attempt.id}`); return; }
        const questionnaire = await getAssessmentQuestionnaire(accessToken.current, attempt.id);
        if (!questionnaire.resumeAvailable) throw new Error("ASSESSMENT_UNAVAILABLE");
        if (!cancelled) { setAssessment(questionnaire); setSubmission(attempt); setAnswers(attempt.answers); }
      } catch (reason) { if (!cancelled) setError(assessmentErrorMessage(reason)); }
    })();
    return () => { cancelled = true; };
  }, [assessmentVersionId, submissionId, grantId, authentication.user.id, reload, router]);

  const persist = async () => {
    if (!submission || conflict) return null;
    if (typeof submission.revision !== "number") throw new Error("ASSESSMENT_REVISION_UNAVAILABLE");
    const saved = await saveAssessmentAnswers(accessToken.current, submission.id, { answers, expectedRevision: submission.revision });
    setSubmission(saved); setAnswers(saved.answers); return saved;
  };

  const continueFlow = async () => {
    if (busy || conflict) return;
    if (!submitCommand && (!current || current.required && !answered(current, answers[current.id]))) { setError("پاسخ این سوال ضروری است."); return; }
    setBusy(true); setError(null);
    try {
      const saved = submitCommand ? submission : await persist();
      if (!saved) return;
      if (step < items.length - 1) { setStep((value) => value + 1); return; }
      if (typeof saved.revision !== "number") throw new Error("ASSESSMENT_REVISION_UNAVAILABLE");
      const command = submitCommand ?? { revision: saved.revision, key: crypto.randomUUID() };
      setSubmitCommand(command);
      const completed = await submitAssessment(accessToken.current, saved.id, command.key, command.revision);
      router.push(`/assessment/result?submissionId=${completed.id}`);
    } catch (reason) { if (reason instanceof AssessmentRequestError && reason.status === 409) setConflict(true); if (reason instanceof AssessmentRequestError && (reason.status === 400 || reason.status === 422)) setSubmitCommand(null); setError(assessmentErrorMessage(reason)); }
    finally { setBusy(false); }
  };

  const saveAndExit = async () => {
    if (busy || conflict || submitCommand) return;
    setBusy(true); setError(null);
    try { await persist(); router.push("/assessment"); } catch (reason) { if (reason instanceof AssessmentRequestError && reason.status === 409) setConflict(true); setError(assessmentErrorMessage(reason)); } finally { setBusy(false); }
  };

  if (!assessment && !error) return <div><PageHeader title="ارزیابی" onBack={() => router.back()} /><p role="status" className="m-4 rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت ارزیابی و پیش‌نویس شما…</p></div>;
  if (!assessment || !submission || items.length === 0) return <div><PageHeader title="ارزیابی" onBack={() => router.back()} /><p role="alert" className="m-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error ?? "ساختار این ارزیابی قابل نمایش نیست."}</p></div>;

  return <div><PageHeader title={assessment.title} onBack={() => { if (busy || submitCommand) return; if (step > 0) { setStep(value => value - 1); return; } if (JSON.stringify(answers) === JSON.stringify(submission.answers) || window.confirm("پاسخ ذخیره‌نشده دارید. بدون ذخیره از این صفحه خارج شوید؟")) router.back(); }} /><div className="px-4 space-y-5 pb-4"><div><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>سوال {toP(step + 1)} از {toP(items.length)}</span><span>تلاش {toP(submission.attemptNumber)}</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / items.length) * 100}%` }} /></div></div><div className="rounded-3xl border border-border bg-white p-5"><p className="mb-4 text-sm font-bold text-foreground">{current.text}</p><fieldset aria-label={current.text} disabled={busy || conflict || submitCommand !== null}><AnswerInput question={current} value={answers[current.id]} onChange={(value) => { setAnswers((all) => ({ ...all, [current.id]: value })); setError(null); }} /></fieldset></div>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button type="button" disabled={busy} onClick={() => { if (window.confirm("پاسخ‌های ذخیره‌نشده کنار گذاشته و آخرین وضعیت از سرور دریافت شود؟")) setReload(value => value + 1); }} className="text-sm font-bold text-primary">دریافت آخرین وضعیت ذخیره‌شده</button><button disabled={busy || conflict} onClick={() => void continueFlow()} className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-white disabled:opacity-50">{submitCommand ? "پیگیری ثبت نهایی" : step === items.length - 1 ? "ثبت نهایی و مشاهده نتیجه" : "ذخیره و ادامه"}</button><button disabled={busy || conflict || submitCommand !== null} onClick={() => void saveAndExit()} className="w-full rounded-2xl border border-border bg-white py-3 text-sm font-bold text-muted-foreground disabled:opacity-50">ذخیره و خروج</button></div></div>;
}

function AnswerInput({ question, value, onChange }: { question: Question; value: unknown; onChange: (value: unknown) => void }) {
  const options = Array.isArray(question.options) ? question.options.map(object).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)) : [];
  if (question.type === "SINGLE_CHOICE") return <div className="space-y-2">{options.map((option) => <button key={String(option.id)} aria-pressed={value === option.id} onClick={() => onChange(option.id)} className={`w-full rounded-2xl border p-3 text-right text-sm ${value === option.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{String(option.label ?? "گزینه")}</button>)}</div>;
  if (question.type === "MULTIPLE_CHOICE") { const selected = Array.isArray(value) ? value : []; return <div className="space-y-2">{options.map((option) => { const active = selected.includes(option.id); return <button key={String(option.id)} aria-pressed={active} onClick={() => onChange(active ? selected.filter((id) => id !== option.id) : [...selected, option.id])} className={`w-full rounded-2xl border p-3 text-right text-sm ${active ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{String(option.label ?? "گزینه")}</button>; })}</div>; }
  if (question.type === "BOOLEAN") return <div className="grid grid-cols-2 gap-3">{[[true, "بله"], [false, "خیر"]].map(([answer, label]) => <button key={String(answer)} aria-pressed={value === answer} onClick={() => onChange(answer)} className={`rounded-2xl border p-4 text-sm font-bold ${value === answer ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{String(label)}</button>)}</div>;
  if (question.type === "NUMBER") return <input aria-label={question.text} type="number" min={typeof question.min === "number" ? question.min : undefined} max={typeof question.max === "number" ? question.max : undefined} value={typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))} className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />;
  return <textarea aria-label={question.text} maxLength={typeof question.maxLength === "number" ? question.maxLength : undefined} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} rows={5} className="w-full resize-none rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />;
}

export default function AssessmentWizardPage() { return <Suspense fallback={<p role="status" className="p-4 text-sm">در حال دریافت ارزیابی…</p>}><AssessmentWizard /></Suspense>; }
