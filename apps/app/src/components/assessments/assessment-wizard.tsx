'use client';
import { AsyncButton } from '@/components/shared/async-button';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';
import { LoadingState } from '@/components/shared/skeletons';

import { registerAssessmentHistoryGuard } from '@/lib/assessment-history';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { currentInvitationContext, marriageHref } from '@/lib/marriage-context';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useAuthSession } from '@/components/auth/session-gate';
import { PageHeader } from '@/components/shared/page-header';
import { ShellAction, ShellOverlay } from '@/components/layout/shell-slots';
import { StoreIcon } from '@/components/store/store-icon';
import {
  AssessmentRequestError,
  assessmentErrorMessage,
  getAssessmentQuestionnaire,
  getAssessmentSubmission,
  saveAssessmentAnswers,
  startAssessment,
  submitAssessment,
  type AssessmentSubmission,
  type AssessmentQuestionnaire,
} from '@/lib/assessment-api';
import { startPaidAssessment } from '@/lib/digital-services-api';
import { toP } from '@/lib/format';

const primaryBtnClass =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryBtnClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60';
const optionBtnClass =
  'group flex w-full items-center text-start text-foreground transition disabled:cursor-not-allowed disabled:opacity-60';
const letterBadgeClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-foreground transition group-aria-pressed:bg-primary group-aria-pressed:text-white';
const inputFieldClass =
  'w-full rounded-2xl border border-border bg-white p-3.5 text-base leading-7 text-foreground shadow-2xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-red-300 aria-[invalid=true]:bg-red-50/40';

type ExitDestination = string | { traverse: () => void };
type JsonObject = Record<string, unknown>;
type Question = JsonObject & {
  id: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'BOOLEAN' | 'NUMBER' | 'TEXT';
  text: string;
  required: boolean;
};
const object = (value: unknown): JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};

function questions(structure: JsonObject): Question[] {
  if (!Array.isArray(structure.sections)) return [];
  return structure.sections
    .map(object)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .flatMap((value) => {
      if (!Array.isArray(value.questions)) return [];
      return value.questions
        .map(object)
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
        .flatMap((question) => {
          const type = question.type;
          if (
            typeof question.id !== 'string' ||
            !['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'BOOLEAN', 'NUMBER', 'TEXT'].includes(
              String(type),
            )
          )
            return [];
          const text = [question.text, question.title, question.label].find(
            (item) => typeof item === 'string',
          ) as string | undefined;
          return [
            {
              ...question,
              id: question.id,
              type: type as Question['type'],
              text: text ?? 'سوال بدون عنوان',
              required: question.required !== false,
            },
          ];
        });
    });
}

const answered = (question: Question, answer: unknown) =>
  answer !== undefined &&
  answer !== null &&
  (question.type !== 'TEXT' || (typeof answer === 'string' && answer.trim() !== '')) &&
  (question.type !== 'MULTIPLE_CHOICE' || (Array.isArray(answer) && answer.length > 0));

class NumericAnswerError extends Error {}
function numericError(question: Question, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'عدد معتبر وارد کنید.';
  if (typeof question.min === 'number' && value < question.min)
    return `مقدار باید حداقل ${toP(question.min)} باشد.`;
  if (typeof question.max === 'number' && value > question.max)
    return `مقدار باید حداکثر ${toP(question.max)} باشد.`;
  return null;
}

export function AssessmentWizard({
  entry,
}: { entry?: { submissionId: string; onComplete: () => void } } = {}) {
  const params = useParams<{ type?: string }>();
  const search = useSearchParams();
  const { authentication } = useAuthSession();
  const scope = [
    authentication.user.id,
    params.type,
    entry?.submissionId ?? search.get('submissionId'),
    search.get('grantId'),
  ].join(':');
  return <AssessmentAttempt key={scope} entry={entry} />;
}

function AssessmentAttempt({
  entry,
}: { entry?: { submissionId: string; onComplete: () => void } } = {}) {
  const router = useRouter();
  const { type: assessmentVersionId } = useParams<{ type?: string }>();
  const search = useSearchParams();
  const submissionId = entry?.submissionId ?? search.get('submissionId');
  const grantId = search.get('grantId');
  const { authentication } = useAuthSession();
  const accessToken = useRef(authentication.accessToken);
  useEffect(() => {
    accessToken.current = authentication.accessToken;
  }, [authentication.accessToken]);
  const [assessment, setAssessment] = useState<AssessmentQuestionnaire | null>(null);
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const submissionRef = useRef<AssessmentSubmission | null>(null);
  const answersRef = useRef<Record<string, unknown>>({});
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingSaves = useRef(0);
  const conflictRef = useRef(false);
  const [step, setStep] = useState(0);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [busy, setBusy] = useState(false);
  const [locking, setLocking] = useState(false);
  const operation = useRef(false);
  const leaving = useRef(false);
  const [exitTo, setExitTo] = useState<ExitDestination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiredNotice, setRequiredNotice] = useState<'hidden' | 'shown' | 'leaving'>('hidden');
  const [requiredNoticeRevision, setRequiredNoticeRevision] = useState(0);
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [submitCommand, setSubmitCommand] = useState<{ revision: number; key: string } | null>(
    null,
  );
  const items = useMemo(() => (assessment ? questions(assessment.structure) : []), [assessment]);
  const current = items[step];
  const entryQuestion = useRef<HTMLHeadingElement>(null);
  const questionArea = useRef<HTMLDivElement>(null);
  const onComplete = entry?.onComplete;
  useEffect(() => {
    if (!current?.id) return;
    questionArea.current?.scrollIntoView({ block: 'start' });
    entryQuestion.current?.focus({ preventScroll: true });
  }, [current?.id]);
  useEffect(() => {
    if (error && current?.type === 'NUMBER')
      questionArea.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [error, current?.id, current?.type]);
  useEffect(() => {
    if (requiredNotice !== 'shown') return;
    const timer = window.setTimeout(() => setRequiredNotice('leaving'), 2800);
    return () => window.clearTimeout(timer);
  }, [requiredNotice, requiredNoticeRevision, current?.id]);
  useEffect(() => {
    if (requiredNotice !== 'leaving') return;
    const timer = window.setTimeout(() => setRequiredNotice('hidden'), 200);
    return () => window.clearTimeout(timer);
  }, [requiredNotice]);
  const adaptive = assessment?.structure.schemaVersion === 3;
  const dirty = !!submission && JSON.stringify(answers) !== JSON.stringify(submission.answers);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty && !leaving.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? (event.target.closest('a[href]') as HTMLAnchorElement | null)
          : null;
      if (
        !link ||
        link.target === '_blank' ||
        link.hasAttribute('download') ||
        link.origin !== window.location.origin ||
        link.href === window.location.href
      )
        return;
      if (operation.current || submitCommand) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (dirty) {
        event.preventDefault();
        event.stopPropagation();
        setExitTo(link.pathname + link.search + link.hash);
      }
    };
    const unregister = registerAssessmentHistoryGuard({
      shouldBlock: () => !leaving.current && (dirty || operation.current || !!submitCommand),
      onBlocked: (traverse) => {
        if (dirty && !operation.current && !submitCommand) setExitTo({ traverse });
      },
    });
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, [dirty, submitCommand]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const attempt = submissionId
          ? await getAssessmentSubmission(accessToken.current, submissionId)
          : grantId
            ? await startPaidAssessment(accessToken.current, grantId)
            : assessmentVersionId
              ? await startAssessment(accessToken.current, assessmentVersionId)
              : null;
        if (!attempt) throw new Error('ASSESSMENT_NOT_FOUND');
        if (attempt.state === 'COMPLETE') {
          if (!cancelled) {
            if (onComplete) onComplete();
            else router.replace(marriageHref(`/assessment/result?submissionId=${attempt.id}`));
          }
          return;
        }
        const questionnaire = await getAssessmentQuestionnaire(accessToken.current, attempt.id);
        if (!questionnaire.resumeAvailable) throw new Error('ASSESSMENT_UNAVAILABLE');
        if (!cancelled) {
          setAssessment(questionnaire);
          setSubmission(attempt);
          setAnswers(attempt.answers);
          submissionRef.current = attempt;
          answersRef.current = attempt.answers;
          conflictRef.current = false;
          {
            const pending = questions(questionnaire.structure).findIndex(
              (question) => !answered(question, attempt.answers[question.id]),
            );
            setStep(
              pending < 0 ? Math.max(0, questions(questionnaire.structure).length - 1) : pending,
            );
          }
        }
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof NumericAnswerError ? reason.message : assessmentErrorMessage(reason),
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    assessmentVersionId,
    submissionId,
    grantId,
    authentication.user.id,
    reload,
    router,
    onComplete,
  ]);

  const persist = (answerSnapshot = answersRef.current) => {
    if (!submissionRef.current || conflictRef.current) return Promise.resolve(null);
    const task = saveQueue.current.then(async () => {
      const latestSubmission = submissionRef.current;
      if (!latestSubmission || conflictRef.current) return null;
      if (typeof latestSubmission.revision !== 'number')
        throw new Error('ASSESSMENT_REVISION_UNAVAILABLE');
      const invalid = items.findIndex(
        (question) =>
          question.type === 'NUMBER' && numericError(question, answerSnapshot[question.id]),
      );
      if (invalid >= 0) {
        setStep(invalid);
        throw new NumericAnswerError(
          numericError(items[invalid], answerSnapshot[items[invalid].id])!,
        );
      }
      if (JSON.stringify(latestSubmission.answers) === JSON.stringify(answerSnapshot))
        return latestSubmission;
      const saved = await saveAssessmentAnswers(accessToken.current, latestSubmission.id, {
        answers: answerSnapshot,
        expectedRevision: latestSubmission.revision,
      });
      submissionRef.current = saved;
      setSubmission(saved);
      if (JSON.stringify(answersRef.current) === JSON.stringify(answerSnapshot)) {
        answersRef.current = saved.answers;
        setAnswers(saved.answers);
      }
      return saved;
    });
    saveQueue.current = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  };

  const persistTracked = async (answerSnapshot = answersRef.current) => {
    pendingSaves.current += 1;
    setBusy(true);
    try {
      return await persist(answerSnapshot);
    } finally {
      pendingSaves.current -= 1;
      setBusy(pendingSaves.current > 0 || operation.current);
    }
  };

  const continueFlow = async () => {
    if (operation.current || conflictRef.current) return;
    if (
      !submitCommand &&
      (!current || (current.required && !answered(current, answers[current.id])))
    ) {
      setError(null);
      setRequiredNotice('shown');
      setRequiredNoticeRevision((revision) => revision + 1);
      if (current?.type === 'NUMBER')
        questionArea.current?.querySelector<HTMLInputElement>('input')?.focus();
      else entryQuestion.current?.focus();
      return;
    }
    if (requiredNotice !== 'hidden') setRequiredNotice('leaving');
    if (!submitCommand && current?.type === 'NUMBER') {
      const value = answers[current.id];
      const message = numericError(current, value);
      if (message) {
        setError(message);
        questionArea.current?.querySelector<HTMLInputElement>('input')?.focus();
        return;
      }
    }
    setError(null);
    const answerSnapshot = { ...answersRef.current };
    const advancesWithoutWaiting = step < items.length - 1 && !(adaptive && step >= 10);
    if (advancesWithoutWaiting && !submitCommand) {
      setStepDirection('forward');
      setStep((value) => value + 1);
      void persistTracked(answerSnapshot).catch((reason) => {
        if (reason instanceof AssessmentRequestError && reason.status === 409) {
          conflictRef.current = true;
          setConflict(true);
        }
        setError(
          reason instanceof NumericAnswerError ? reason.message : assessmentErrorMessage(reason),
        );
      });
      return;
    }

    operation.current = true;
    setLocking(true);
    try {
      const saved = submitCommand ? submissionRef.current : await persistTracked(answerSnapshot);
      if (!saved) return;
      if (adaptive && !submitCommand) {
        const refreshed = await getAssessmentQuestionnaire(accessToken.current, saved.id);
        setAssessment(refreshed);
        const nextQuestions = questions(refreshed.structure);
        const nextIndex = nextQuestions.findIndex(
          (question) => !answered(question, saved.answers[question.id]),
        );
        const followUp = nextQuestions[nextIndex];
        if (followUp && !answered(followUp, saved.answers[followUp.id])) {
          setStepDirection('forward');
          setStep(nextIndex);
          return;
        }
      }
      if (typeof saved.revision !== 'number') throw new Error('ASSESSMENT_REVISION_UNAVAILABLE');
      const command = submitCommand ?? { revision: saved.revision, key: crypto.randomUUID() };
      setSubmitCommand(command);
      const completed = await submitAssessment(
        accessToken.current,
        saved.id,
        command.key,
        command.revision,
      );
      leaving.current = true;
      if (entry) entry.onComplete();
      else router.push(marriageHref(`/assessment/result?submissionId=${completed.id}`));
    } catch (reason) {
      if (reason instanceof AssessmentRequestError && reason.status === 409) {
        conflictRef.current = true;
        setConflict(true);
      }
      if (
        reason instanceof AssessmentRequestError &&
        (reason.status === 400 || reason.status === 422)
      )
        setSubmitCommand(null);
      setError(
        reason instanceof NumericAnswerError ? reason.message : assessmentErrorMessage(reason),
      );
    } finally {
      operation.current = false;
      setLocking(false);
      setBusy(pendingSaves.current > 0);
    }
  };

  const leave = (destination: ExitDestination) => {
    if (leaving.current) return;
    leaving.current = true;
    setExitTo(null);
    if (typeof destination === 'string') router.push(destination);
    else destination.traverse();
  };
  const saveAndExit = async (destination?: ExitDestination) => {
    if (operation.current || conflictRef.current || submitCommand) return;
    operation.current = true;
    setLocking(true);
    setError(null);
    try {
      const saved = await persistTracked({ ...answersRef.current });
      if (!saved) return;
      leave(
        destination ??
          (currentInvitationContext()
            ? `/assessment/marriage/requests/${currentInvitationContext()}`
            : '/assessment'),
      );
    } catch (reason) {
      if (reason instanceof AssessmentRequestError && reason.status === 409) {
        conflictRef.current = true;
        setConflict(true);
      }
      setError(
        reason instanceof NumericAnswerError ? reason.message : assessmentErrorMessage(reason),
      );
    } finally {
      operation.current = false;
      setLocking(false);
      setBusy(pendingSaves.current > 0);
    }
  };

  if (!assessment && !error)
    return (
      <div>
        {!entry && <PageHeader title="ارزیابی" onBack={() => router.push('/assessment')} />}
        <LoadingState label="در حال دریافت ارزیابی و پیش‌نویس شما…" variant="form" />
      </div>
    );
  if (!assessment || !submission || items.length === 0 || !current)
    return (
      <div className="space-y-4">
        {!entry && <PageHeader title="ارزیابی" onBack={() => router.push('/assessment')} />}
        <div className="mx-auto max-w-2xl space-y-4 p-4">
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-700"
          >
            {error ?? 'ساختار این ارزیابی قابل نمایش نیست.'}
          </p>
          <button
            type="button"
            className={primaryBtnClass}
            onClick={() => {
              setAssessment(null);
              setSubmission(null);
              setAnswers({});
              answersRef.current = {};
              submissionRef.current = null;
              conflictRef.current = false;
              setError(null);
              setConflict(false);
              setSubmitCommand(null);
              setStep(0);
              setReload((value) => value + 1);
            }}
          >
            تلاش دوباره
          </button>
        </div>
      </div>
    );

  const reloadSaved = () => {
    setAssessment(null);
    setSubmission(null);
    setAnswers({});
    answersRef.current = {};
    submissionRef.current = null;
    conflictRef.current = false;
    setStep(0);
    setError(null);
    setConflict(false);
    setSubmitCommand(null);
    setReload((value) => value + 1);
  };
  const Container = entry ? 'div' : 'main';
  const actionButtons = (
    <>
      <div className="flex items-center gap-2.5">
        {step > 0 && (
          <button
            className={`${secondaryBtnClass} assessment-action-previous min-w-0 flex-1 border-transparent bg-transparent px-2 text-xs hover:bg-muted sm:text-sm`}
            disabled={locking || conflict || submitCommand !== null}
            onClick={() => {
              setStepDirection('backward');
              setStep((value) => value - 1);
            }}
          >
            سؤال قبل
          </button>
        )}
        <button
          className={`${primaryBtnClass} assessment-action-primary min-w-0 ${step > 0 ? 'flex-[1.5]' : 'flex-1'} px-3 text-sm`}
          disabled={locking || conflict}
          onClick={() => void continueFlow()}
          aria-busy={Boolean(locking)}
        >
          {locking && <HeartbeatLoader />}
          ادامه
        </button>
      </div>
      {busy && (
        <p
          role="status"
          aria-live="polite"
          className="mb-0 mt-2 text-center text-[11px] text-muted-foreground"
        >
          پاسخ در حال ذخیره است…
        </p>
      )}
    </>
  );
  return (
    <Container
      className="assessment-wizard-main min-h-full bg-background pb-8 data-[entry=true]:min-h-0 data-[entry=true]:bg-transparent data-[entry=true]:pb-0"
      data-entry={!!entry}
    >
      {!entry && (
        <div className="assessment-wizard-header">
          <PageHeader title={assessment.title} onBack={() => void saveAndExit()} />
        </div>
      )}
      <div
        ref={questionArea}
        data-entry={!!entry}
        className="assessment-question-area mx-auto max-w-2xl space-y-4 p-4 data-[entry=true]:p-0"
        aria-busy={busy}
      >
        <div className="assessment-progress-card flex flex-col gap-3 rounded-3xl border border-primary/10 bg-gradient-to-l from-primary/[0.06] via-white to-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
            <span>
              {adaptive && step >= 11 ? (
                'سؤال تکمیلی برای روشن‌شدن نتیجه'
              ) : (
                <span
                  className="assessment-step-label inline-flex items-center gap-1.5"
                >
                  <span>سؤال</span>
                  <span key={step} className="assessment-step-number">
                    {toP(step + 1)}
                  </span>
                  <span>از {toP(adaptive ? 11 : items.length)}</span>
                </span>
              )}
            </span>
            {!entry && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-foreground">
                تلاش {toP(submission.attemptNumber)}
              </span>
            )}
          </div>
          <div
            className="assessment-progress-track"
            role="progressbar"
            dir="rtl"
            aria-label="پیشرفت پاسخ‌گویی"
            aria-valuemin={0}
            aria-valuemax={adaptive ? 11 : items.length}
            aria-valuenow={Math.min(step + 1, adaptive ? 11 : items.length)}
          >
            <span
              className="assessment-progress-fill"
              style={{
                width: `${(Math.min(step + 1, adaptive ? 11 : items.length) / (adaptive ? 11 : items.length)) * 100}%`,
              }}
            />
          </div>
        </div>
        <div
          key={current.id}
          data-direction={stepDirection}
          className="assessment-question-transition flex flex-col gap-4"
        >
        <section className="assessment-question-card">
          <div className="assessment-question-eyebrow" aria-hidden="true">
            <span className="assessment-question-eyebrow__dot" />
            پرسش این مرحله
          </div>
          <h2
            id="assessment-question"
            ref={entryQuestion}
            tabIndex={-1}
            className="assessment-question-title m-0 text-base font-bold leading-8 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-lg"
          >
            {current.text}
          </h2>
        </section>
        {current.type === 'MULTIPLE_CHOICE' && (
          <p className="m-0 text-xs font-medium text-muted-foreground">
            می‌توانید بیش از یک گزینه را انتخاب کنید.
          </p>
        )}
        {current.type === 'NUMBER' && (
          <p id="assessment-number-hint" className="m-0 text-xs font-medium text-muted-foreground">
            {typeof current.min === 'number' ? `حداقل: ${toP(current.min)}` : ''}
            {typeof current.min === 'number' && typeof current.max === 'number' ? '؛ ' : ''}
            {typeof current.max === 'number' ? `حداکثر: ${toP(current.max)}` : ''}
          </p>
        )}
        <fieldset
          className="assessment-answer-group min-w-0 border-0 p-0"
          aria-labelledby="assessment-question"
          aria-describedby={error ? 'assessment-answer-error' : undefined}
          disabled={locking || conflict || submitCommand !== null}
        >
          <AnswerInput
            invalid={!!error}
            question={current}
            value={answers[current.id]}
            onChange={(value) => {
              const all = answersRef.current;
              const updated = {
                ...(adaptive && current.phase !== 'FOLLOW_UP'
                  ? Object.fromEntries(
                      Object.entries(all).filter(([id]) =>
                        items.some(
                          (question) => question.phase !== 'FOLLOW_UP' && question.id === id,
                        ),
                      ),
                    )
                  : adaptive
                    ? Object.fromEntries(
                        Object.entries(all).filter(
                          ([id]) => items.findIndex((question) => question.id === id) <= step,
                        ),
                      )
                    : all),
                [current.id]: value,
              };
              answersRef.current = updated;
              setAnswers(updated);
              setError(null);
              if (requiredNotice !== 'hidden') setRequiredNotice('leaving');
            }}
          />
        </fieldset>
        {error && (
          <p
            id="assessment-answer-error"
            role="alert"
            className="m-0 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-7 text-red-700"
          >
            {error}
          </p>
        )}
        </div>
        {conflict && (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="leading-7">
              نسخهٔ ذخیره‌شدهٔ این ارزیابی در سرور تغییر کرده است. برای ادامه، آخرین وضعیت ذخیره‌شده
              را بارگذاری کنید.
            </p>
            <button type="button" className={secondaryBtnClass} onClick={reloadSaved}>
              دریافت آخرین وضعیت از سرور
            </button>
          </div>
        )}
      </div>
      {entry ? (
        <div className="assessment-action-dock sticky bottom-0 z-10 -mx-4 mt-5 border-t border-border/70 bg-white px-3 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.06)] sm:mx-0 sm:rounded-2xl sm:border sm:p-4 sm:shadow-xs">
          {actionButtons}
        </div>
      ) : (
        <ShellAction>
          <div className="assessment-action-dock w-full border-t border-border/70 bg-white px-3 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.06)] sm:px-4 sm:py-4">
            <div className="mx-auto w-full max-w-2xl">{actionButtons}</div>
          </div>
        </ShellAction>
      )}
      <ShellOverlay>
        {requiredNotice !== 'hidden' && (
          <div
            className={`assessment-required-toast${entry ? ' assessment-required-toast--entry' : ''}${requiredNotice === 'leaving' ? ' assessment-required-toast--leaving' : ''}`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <span className="assessment-required-toast__icon">
              <StoreIcon name="errorCircle" size={20} />
            </span>
            <span className="assessment-required-toast__copy">
              <strong>هنوز پاسخ ندادی</strong>
              <span>برای رفتن به سؤال بعد، یک گزینه را انتخاب کن.</span>
            </span>
          </div>
        )}
      </ShellOverlay>
      {exitTo && (
        <BottomSheet
          title="پاسخ ذخیره‌نشده"
          onClose={() => {
            if (!operation.current) setExitTo(null);
          }}
        >
          <div className="space-y-3">
            <p className="text-sm leading-8 text-muted-foreground">
              پاسخ تازه هنوز ذخیره نشده است. برای حفظ آن، ذخیره و بازگشت را انتخاب کنید.
            </p>
            <AsyncButton
              className={primaryBtnClass}
              disabled={busy || conflict || !!submitCommand}
              onClick={() => saveAndExit(exitTo)}
            >
              ذخیره و بازگشت
            </AsyncButton>
            <button className={secondaryBtnClass} disabled={busy} onClick={() => leave(exitTo)}>
              بازگشت بدون ذخیره
            </button>
            <button className={secondaryBtnClass} disabled={busy} onClick={() => setExitTo(null)}>
              ماندن در آزمون
            </button>
            {error && (
              <p
                role="alert"
                className="m-0 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-7 text-red-700"
              >
                {error}
              </p>
            )}
          </div>
        </BottomSheet>
      )}
    </Container>
  );
}

function AnswerInput({
  question,
  value,
  onChange,
  invalid,
}: {
  invalid?: boolean;
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const options = Array.isArray(question.options)
    ? question.options.map(object).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    : [];
  if (question.type === 'SINGLE_CHOICE')
    return (
      <div className="assessment-answer-list grid gap-2.5">
        {options.map((option, index) => (
          <button
            key={String(option.id)}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={`${optionBtnClass} assessment-answer-option`}
          >
            <span className={letterBadgeClass}>
              {['الف', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ی'][index] ?? toP(index + 1)}
            </span>
            <span className="assessment-answer-copy min-w-0 flex-1 text-sm font-medium leading-7">
              {String(option.label ?? option.title ?? 'گزینه')}
            </span>
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-primary"
              aria-hidden="true"
            >
              {value === option.id && <Check size={18} />}
            </span>
          </button>
        ))}
      </div>
    );
  if (question.type === 'MULTIPLE_CHOICE') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="assessment-answer-list grid gap-2.5">
        {options.map((option, index) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={String(option.id)}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active ? selected.filter((id) => id !== option.id) : [...selected, option.id],
                )
              }
              className={`${optionBtnClass} assessment-answer-option`}
            >
              <span className={letterBadgeClass}>
                {['الف', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ی'][index] ?? toP(index + 1)}
              </span>
              <span className="assessment-answer-copy min-w-0 flex-1 text-sm font-medium leading-7">
                {String(option.label ?? option.title ?? 'گزینه')}
              </span>
              <span
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-primary"
                aria-hidden="true"
              >
                {active && <Check size={18} />}
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  if (question.type === 'BOOLEAN')
    return (
      <div className="assessment-answer-list assessment-answer-list--boolean grid grid-cols-1 sm:grid-cols-2">
        {[
          [true, 'بله'],
          [false, 'خیر'],
        ].map(([answer, label], index) => (
          <button
            key={String(answer)}
            type="button"
            aria-pressed={value === answer}
            onClick={() => onChange(answer)}
            className={`${optionBtnClass} assessment-answer-option`}
          >
            <span className={letterBadgeClass}>{index === 0 ? 'الف' : 'ب'}</span>
            <span className="assessment-answer-copy min-w-0 flex-1 text-sm font-medium leading-7">
              {String(label)}
            </span>
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-primary"
              aria-hidden="true"
            >
              {value === answer && <Check size={18} />}
            </span>
          </button>
        ))}
      </div>
    );
  if (question.type === 'NUMBER')
    return (
      <input
        aria-invalid={invalid}
        aria-label={question.text}
        aria-describedby="assessment-number-hint assessment-answer-error"
        type="number"
        step="any"
        min={typeof question.min === 'number' ? question.min : undefined}
        max={typeof question.max === 'number' ? question.max : undefined}
        value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }
        className={inputFieldClass}
      />
    );
  return (
    <textarea
      aria-label={question.text}
      maxLength={typeof question.maxLength === 'number' ? question.maxLength : undefined}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      rows={5}
      className={inputFieldClass}
    />
  );
}

export default function AssessmentWizardPage() {
  return (
    <Suspense fallback={<LoadingState variant="form" className="p-4" />}>
      <AssessmentWizard />
    </Suspense>
  );
}
