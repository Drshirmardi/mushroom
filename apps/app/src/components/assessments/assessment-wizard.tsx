"use client";

import { currentInvitationContext, marriageHref } from '@/lib/marriage-context';
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { AssessmentRequestError, assessmentErrorMessage, getAssessmentQuestionnaire, getAssessmentSubmission, saveAssessmentAnswers, startAssessment, submitAssessment, type AssessmentSubmission, type AssessmentQuestionnaire } from "@/lib/assessment-api";
import { startPaidAssessment } from "@/lib/digital-services-api";
import styles from './assessment-wizard.module.css';
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

export function AssessmentWizard({ entry }: { entry?: { submissionId: string; onComplete: () => void } } = {}) {
  const params = useParams<{ type?: string }>();
  const search = useSearchParams();
  const { authentication } = useAuthSession();
  const scope = [authentication.user.id, params.type, entry?.submissionId ?? search.get('submissionId'), search.get('grantId')].join(':');
  return <AssessmentAttempt key={scope} entry={entry} />;
}

function AssessmentAttempt({ entry }: { entry?: { submissionId: string; onComplete: () => void } } = {}) {
  const router = useRouter();
  const { type: assessmentVersionId } = useParams<{ type?: string }>();
  const search = useSearchParams();
  const submissionId = entry?.submissionId ?? search.get("submissionId");
  const grantId = search.get("grantId");
  const { authentication } = useAuthSession();
  const accessToken = useRef(authentication.accessToken);
  useEffect(() => { accessToken.current = authentication.accessToken; }, [authentication.accessToken]);
  const [assessment, setAssessment] = useState<AssessmentQuestionnaire | null>(null);
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [submitCommand, setSubmitCommand] = useState<{ revision: number; key: string } | null>(null);
  const items = useMemo(() => assessment ? questions(assessment.structure) : [], [assessment]);
  const current = items[step];
  const entryQuestion = useRef<HTMLHeadingElement>(null);
  const questionArea = useRef<HTMLDivElement>(null);
  const onComplete = entry?.onComplete;
  useEffect(() => {
    if (!current?.id) return;
    questionArea.current?.scrollIntoView({ block: 'start' });
    entryQuestion.current?.focus({ preventScroll: true });
  }, [current?.id]);
  const adaptive = assessment?.structure.schemaVersion === 3;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const attempt = submissionId ? await getAssessmentSubmission(accessToken.current, submissionId) : grantId ? await startPaidAssessment(accessToken.current, grantId) : assessmentVersionId ? await startAssessment(accessToken.current, assessmentVersionId) : null;
        if (!attempt) throw new Error("ASSESSMENT_NOT_FOUND");
        if (attempt.state === "COMPLETE") { if (!cancelled) { if (onComplete) onComplete(); else router.replace(marriageHref(`/assessment/result?submissionId=${attempt.id}`)); } return; }
        const questionnaire = await getAssessmentQuestionnaire(accessToken.current, attempt.id);
        if (!questionnaire.resumeAvailable) throw new Error("ASSESSMENT_UNAVAILABLE");
        if (!cancelled) { setAssessment(questionnaire); setSubmission(attempt); setAnswers(attempt.answers); { const pending = questions(questionnaire.structure).findIndex(question => !answered(question, attempt.answers[question.id])); setStep(pending < 0 ? Math.max(0, questions(questionnaire.structure).length - 1) : pending); } }
      } catch (reason) { if (!cancelled) setError(assessmentErrorMessage(reason)); }
    })();
    return () => { cancelled = true; };
  }, [assessmentVersionId, submissionId, grantId, authentication.user.id, reload, router, onComplete]);

  const persist = async () => {
    if (!submission || conflict) return null;
    if (typeof submission.revision !== "number") throw new Error("ASSESSMENT_REVISION_UNAVAILABLE");
    const saved = await saveAssessmentAnswers(accessToken.current, submission.id, { answers, expectedRevision: submission.revision });
    setSubmission(saved); setAnswers(saved.answers); return saved;
  };

  const continueFlow = async () => {
    if (operation.current || busy || conflict) return;
    if (!submitCommand && (!current || current.required && !answered(current, answers[current.id]))) { setError("پاسخ این سؤال ضروری است."); entryQuestion.current?.focus(); return; }
    operation.current = true; setBusy(true); setError(null);
    try {
      const saved = submitCommand ? submission : await persist();
      if (!saved) return;
      if (step < items.length - 1 && !(adaptive && step >= 10)) { setStep((value) => value + 1); return; }
      if (adaptive && !submitCommand) {
        const refreshed = await getAssessmentQuestionnaire(accessToken.current, saved.id);
        setAssessment(refreshed);
        const nextQuestions = questions(refreshed.structure);
        const nextIndex = nextQuestions.findIndex(question => !answered(question, saved.answers[question.id]));
        const followUp = nextQuestions[nextIndex];
        if (followUp && !answered(followUp, saved.answers[followUp.id])) { setStep(nextIndex); return; }
      }
      if (typeof saved.revision !== "number") throw new Error("ASSESSMENT_REVISION_UNAVAILABLE");
      const command = submitCommand ?? { revision: saved.revision, key: crypto.randomUUID() };
      setSubmitCommand(command);
      const completed = await submitAssessment(accessToken.current, saved.id, command.key, command.revision);
      if (entry) entry.onComplete(); else router.push(marriageHref(`/assessment/result?submissionId=${completed.id}`));
    } catch (reason) { if (reason instanceof AssessmentRequestError && reason.status === 409) setConflict(true); if (reason instanceof AssessmentRequestError && (reason.status === 400 || reason.status === 422)) setSubmitCommand(null); setError(assessmentErrorMessage(reason)); }
    finally { operation.current = false; setBusy(false); }
  };

  const saveAndExit = async () => {
    if (operation.current || busy || conflict || submitCommand) return;
    operation.current = true; setBusy(true); setError(null);
    try { await persist(); router.push(currentInvitationContext() ? `/assessment/marriage/requests/${currentInvitationContext()}` : "/assessment"); } catch (reason) { if (reason instanceof AssessmentRequestError && reason.status === 409) setConflict(true); setError(assessmentErrorMessage(reason)); } finally { operation.current = false; setBusy(false); }
  };

  if (!assessment && !error) return <div>{!entry && <PageHeader title="ارزیابی" onBack={() => router.back()} />}<p role="status" className="m-4 rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت ارزیابی و پیش‌نویس شما…</p></div>;
  if (!assessment || !submission || items.length === 0 || !current) return <div>{!entry && <PageHeader title="ارزیابی" onBack={() => router.back()} />}<p role="alert" className="m-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error ?? "ساختار این ارزیابی قابل نمایش نیست."}</p><button type="button" className={styles.primary} onClick={() => { setAssessment(null); setSubmission(null); setAnswers({}); setError(null); setConflict(false); setSubmitCommand(null); setStep(0); setReload(value => value + 1); }}>تلاش دوباره</button></div>;

  const reloadSaved = () => {
    if (!window.confirm('پاسخ‌های ذخیره‌نشده کنار گذاشته و آخرین وضعیت از سرور دریافت شود؟')) return;
    setAssessment(null); setSubmission(null); setAnswers({}); setStep(0); setError(null); setConflict(false); setSubmitCommand(null); setReload(value => value + 1);
  };
  const Container = entry ? 'div' : 'main';
  return <Container className={styles.wizard} data-entry={!!entry}>
    {!entry && <PageHeader title={assessment.title} onBack={() => { if (operation.current || busy || submitCommand) return; if (step > 0) { setStep(value => value - 1); return; } if (JSON.stringify(answers) === JSON.stringify(submission.answers) || window.confirm('پاسخ ذخیره‌نشده دارید. بدون ذخیره از این صفحه خارج شوید؟')) router.back(); }} />}
    <div ref={questionArea} className={styles.body} aria-busy={busy}>
      <div className={styles.progress}>
        <div className={styles.counter}><span>{adaptive && step >= 11 ? 'سؤال تکمیلی برای روشن‌شدن نتیجه' : <>سؤال {toP(step + 1)} از {toP(adaptive ? 11 : items.length)}</>}</span>{!entry && <span>تلاش {toP(submission.attemptNumber)}</span>}</div>
        <progress aria-label="پیشرفت پاسخ‌گویی" max={adaptive ? 11 : items.length} value={Math.min(step + 1,adaptive ? 11 : items.length)} />
      </div>
      <h2 id="assessment-question" ref={entryQuestion} tabIndex={-1} className={styles.question}>{current.text}</h2>
      {current.type === 'MULTIPLE_CHOICE' && <p className={styles.hint}>می‌توانید بیش از یک گزینه را انتخاب کنید.</p>}
      <fieldset className={styles.answers} aria-labelledby="assessment-question" aria-describedby={error ? 'assessment-answer-error' : undefined} disabled={busy || conflict || submitCommand !== null}>
        <AnswerInput question={current} value={answers[current.id]} onChange={value => {
          setAnswers(all => ({ ...(adaptive && current.phase !== 'FOLLOW_UP' ? Object.fromEntries(Object.entries(all).filter(([id]) => items.some(question => question.phase !== 'FOLLOW_UP' && question.id === id))) : adaptive ? Object.fromEntries(Object.entries(all).filter(([id]) => items.findIndex(question => question.id === id) <= step)) : all), [current.id]: value }));
          setError(null);
        }} />
      </fieldset>
      {error && <p id="assessment-answer-error" role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button className={styles.primary} disabled={busy || conflict} onClick={() => void continueFlow()}>{busy ? 'در حال ذخیره…' : submitCommand ? 'پیگیری ثبت نهایی' : adaptive ? 'ذخیره و ادامه' : step === items.length - 1 ? 'ثبت نهایی و مشاهده نتیجه' : 'ذخیره و ادامه'}</button>
        {step > 0 && <button className={styles.secondary} disabled={busy || conflict || submitCommand !== null} onClick={() => setStep(value => value - 1)}>سؤال قبل</button>}
        {!entry && <button className={styles.secondary} disabled={busy || conflict || submitCommand !== null} onClick={() => void saveAndExit()}>ذخیره و خروج</button>}
      </div>
      {(!entry || error || conflict) && <button className={styles.quiet} disabled={busy} onClick={reloadSaved}>دریافت آخرین وضعیت ذخیره‌شده</button>}
    </div>
  </Container>;
}

function AnswerInput({ question, value, onChange }: { question: Question; value: unknown; onChange: (value: unknown) => void }) {
  const options = Array.isArray(question.options) ? question.options.map(object).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)) : [];
  if (question.type === "SINGLE_CHOICE") return <div className={styles.options}>{options.map((option, index) => <button key={String(option.id)} aria-pressed={value === option.id} onClick={() => onChange(option.id)} className={styles.option}><span className={styles.letter}>{["الف", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ی"][index] ?? toP(index + 1)}</span><span className={styles.optionText}>{String(option.label ?? option.title ?? "گزینه")}</span><span className={styles.mark} aria-hidden="true">{value === option.id && <Check size={18} />}</span></button>)}</div>;
  if (question.type === "MULTIPLE_CHOICE") { const selected = Array.isArray(value) ? value : []; return <div className={styles.options}>{options.map((option, index) => { const active = selected.includes(option.id); return <button key={String(option.id)} aria-pressed={active} onClick={() => onChange(active ? selected.filter((id) => id !== option.id) : [...selected, option.id])} className={styles.option}><span className={styles.letter}>{["الف", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ی"][index] ?? toP(index + 1)}</span><span className={styles.optionText}>{String(option.label ?? option.title ?? "گزینه")}</span><span className={styles.mark} aria-hidden="true">{active && <Check size={18} />}</span></button>; })}</div>; }
  if (question.type === "BOOLEAN") return <div className={styles.boolean}>{[[true, "بله"], [false, "خیر"]].map(([answer, label], index) => <button key={String(answer)} aria-pressed={value === answer} onClick={() => onChange(answer)} className={styles.option}><span className={styles.letter}>{index === 0 ? 'الف' : 'ب'}</span><span className={styles.optionText}>{String(label)}</span><span className={styles.mark} aria-hidden="true">{value === answer && <Check size={18} />}</span></button>)}</div>;
  if (question.type === "NUMBER") return <input aria-label={question.text} type="number" min={typeof question.min === "number" ? question.min : undefined} max={typeof question.max === "number" ? question.max : undefined} value={typeof value === "number" && Number.isFinite(value) ? value : ""} onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))} className={styles.input} />;
  return <textarea aria-label={question.text} maxLength={typeof question.maxLength === "number" ? question.maxLength : undefined} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} rows={5} className={styles.input} />;
}

export default function AssessmentWizardPage() { return <Suspense fallback={<p role="status" className="p-4 text-sm">در حال دریافت ارزیابی…</p>}><AssessmentWizard /></Suspense>; }
