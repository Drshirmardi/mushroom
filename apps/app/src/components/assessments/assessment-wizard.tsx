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
  'group flex min-h-14 w-full items-center gap-3.5 rounded-2xl border border-border bg-white px-4 py-3.5 text-start text-foreground shadow-2xs transition hover:border-primary/40 hover:bg-primary/5 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:ring-1 aria-pressed:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60';
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
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const leaving = useRef(false);
  const [exitTo, setExitTo] = useState<ExitDestination | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const persist = async () => {
    if (!submission || conflict) return null;
    if (typeof submission.revision !== 'number') throw new Error('ASSESSMENT_REVISION_UNAVAILABLE');
    const invalid = items.findIndex(
      (question) => question.type === 'NUMBER' && numericError(question, answers[question.id]),
    );
    if (invalid >= 0) {
      setStep(invalid);
      throw new NumericAnswerError(numericError(items[invalid], answers[items[invalid].id])!);
    }
    const saved = await saveAssessmentAnswers(accessToken.current, submission.id, {
      answers,
      expectedRevision: submission.revision,
    });
    setSubmission(saved);
    setAnswers(saved.answers);
    return saved;
  };

  const continueFlow = async () => {
    if (operation.current || busy || conflict) return;
    if (
      !submitCommand &&
      (!current || (current.required && !answered(current, answers[current.id])))
    ) {
      setError('پاسخ این سؤال ضروری است.');
      if (current?.type === 'NUMBER')
        questionArea.current?.querySelector<HTMLInputElement>('input')?.focus();
      else entryQuestion.current?.focus();
      return;
    }
    if (!submitCommand && current?.type === 'NUMBER') {
      const value = answers[current.id];
      const message = numericError(current, value);
      if (message) {
        setError(message);
        questionArea.current?.querySelector<HTMLInputElement>('input')?.focus();
        return;
      }
    }
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      const saved = submitCommand ? submission : await persist();
      if (!saved) return;
      if (step < items.length - 1 && !(adaptive && step >= 10)) {
        setStep((value) => value + 1);
        return;
      }
      if (adaptive && !submitCommand) {
        const refreshed = await getAssessmentQuestionnaire(accessToken.current, saved.id);
        setAssessment(refreshed);
        const nextQuestions = questions(refreshed.structure);
        const nextIndex = nextQuestions.findIndex(
          (question) => !answered(question, saved.answers[question.id]),
        );
        const followUp = nextQuestions[nextIndex];
        if (followUp && !answered(followUp, saved.answers[followUp.id])) {
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
      if (reason instanceof AssessmentRequestError && reason.status === 409) setConflict(true);
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
      setBusy(false);
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
    if (operation.current || busy || conflict || submitCommand) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      const saved = await persist();
      if (!saved) return;
      leave(
        destination ??
          (currentInvitationContext()
            ? `/assessment/marriage/requests/${currentInvitationContext()}`
            : '/assessment'),
      );
    } catch (reason) {
      if (reason instanceof AssessmentRequestError && reason.status === 409) setConflict(true);
      setError(
        reason instanceof NumericAnswerError ? reason.message : assessmentErrorMessage(reason),
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };

  if (!assessment && !error)
    return (
      <div>
        {!entry && <PageHeader title="ارزیابی" onBack={() => router.back()} />}
        <LoadingState label="در حال دریافت ارزیابی و پیش‌نویس شما…" variant="form" />
      </div>
    );
  if (!assessment || !submission || items.length === 0 || !current)
    return (
      <div className="space-y-4">
        {!entry && <PageHeader title="ارزیابی" onBack={() => router.back()} />}
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
    setStep(0);
    setError(null);
    setConflict(false);
    setSubmitCommand(null);
    setReload((value) => value + 1);
  };
  const Container = entry ? 'div' : 'main';
  return (
    <Container
      className="min-h-dvh bg-background pb-28 data-[entry=true]:min-h-0 data-[entry=true]:bg-transparent data-[entry=true]:pb-0"
      data-entry={!!entry}
    >
      {!entry && (
        <PageHeader
          title={assessment.title}
          onBack={() => {
            if (operation.current || busy || submitCommand) return;
            if (step > 0) {
              setStep((value) => value - 1);
              return;
            }
            if (dirty)
              setExitTo(
                currentInvitationContext()
                  ? `/assessment/marriage/requests/${currentInvitationContext()}`
                  : '/assessment',
              );
            else router.back();
          }}
        />
      )}
      <div
        ref={questionArea}
        data-entry={!!entry}
        className="mx-auto max-w-2xl space-y-4 p-4 data-[entry=true]:p-0"
        aria-busy={busy}
      >
        <div className="space-y-2.5 rounded-2xl border border-border/80 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
            <span>
              {adaptive && step >= 11 ? (
                'سؤال تکمیلی برای روشن‌شدن نتیجه'
              ) : (
                <>
                  سؤال {toP(step + 1)} از {toP(adaptive ? 11 : items.length)}
                </>
              )}
            </span>
            {!entry && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-foreground">
                تلاش {toP(submission.attemptNumber)}
              </span>
            )}
          </div>
          <progress
            aria-label="پیشرفت پاسخ‌گویی"
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted accent-primary [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
            max={adaptive ? 11 : items.length}
            value={Math.min(step + 1, adaptive ? 11 : items.length)}
          />
        </div>
        <h2
          id="assessment-question"
          ref={entryQuestion}
          tabIndex={-1}
          className="m-0 rounded-2xl border border-border/80 bg-white p-5 text-base font-bold leading-8 text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-lg"
        >
          {current.text}
        </h2>
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
          className="m-0 min-w-0 border-0 p-0"
          aria-labelledby="assessment-question"
          aria-describedby={error ? 'assessment-answer-error' : undefined}
          disabled={busy || conflict || submitCommand !== null}
        >
          <AnswerInput
            invalid={!!error}
            question={current}
            value={answers[current.id]}
            onChange={(value) => {
              setAnswers((all) => ({
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
              }));
              setError(null);
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
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 grid gap-2.5 border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur-xs sm:mx-0 sm:rounded-2xl sm:border sm:bg-white sm:p-4 sm:shadow-xs">
          <button
            className={primaryBtnClass}
            disabled={busy || conflict}
            onClick={() => void continueFlow()}
            aria-busy={Boolean(busy)}
          >
            {busy ? (
              <>
                <HeartbeatLoader />
                {'در حال ذخیره…'}
              </>
            ) : submitCommand ? (
              'پیگیری ثبت نهایی'
            ) : adaptive ? (
              'ذخیره و ادامه'
            ) : step === items.length - 1 ? (
              'ثبت نهایی و مشاهده نتیجه'
            ) : (
              'ذخیره و ادامه'
            )}
          </button>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {step > 0 && (
              <button
                className={secondaryBtnClass}
                disabled={busy || conflict || submitCommand !== null}
                onClick={() => setStep((value) => value - 1)}
              >
                سؤال قبل
              </button>
            )}
            {!entry && (
              <AsyncButton
                className={secondaryBtnClass}
                disabled={busy || conflict || submitCommand !== null}
                onClick={() => saveAndExit()}
              >
                ذخیره و خروج
              </AsyncButton>
            )}
          </div>
        </div>
      </div>
      {exitTo && (
        <BottomSheet
          title="پاسخ ذخیره‌نشده"
          onClose={() => {
            if (!operation.current) setExitTo(null);
          }}
        >
          <div className="space-y-3">
            <p className="text-sm leading-8 text-muted-foreground">
              انتخاب تازه هنوز ذخیره نشده است. برای حفظ پاسخ، ذخیره و خروج را انتخاب کنید.
            </p>
            <AsyncButton
              className={primaryBtnClass}
              disabled={busy || conflict || !!submitCommand}
              onClick={() => saveAndExit(exitTo)}
            >
              ذخیره و خروج
            </AsyncButton>
            <button className={secondaryBtnClass} disabled={busy} onClick={() => leave(exitTo)}>
              خروج بدون ذخیره
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
      <div className="grid gap-2.5">
        {options.map((option, index) => (
          <button
            key={String(option.id)}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={optionBtnClass}
          >
            <span className={letterBadgeClass}>
              {['الف', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ی'][index] ?? toP(index + 1)}
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium leading-7">
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
      <div className="grid gap-2.5">
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
              className={optionBtnClass}
            >
              <span className={letterBadgeClass}>
                {['الف', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ی'][index] ?? toP(index + 1)}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium leading-7">
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
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {[
          [true, 'بله'],
          [false, 'خیر'],
        ].map(([answer, label], index) => (
          <button
            key={String(answer)}
            type="button"
            aria-pressed={value === answer}
            onClick={() => onChange(answer)}
            className={optionBtnClass}
          >
            <span className={letterBadgeClass}>{index === 0 ? 'الف' : 'ب'}</span>
            <span className="min-w-0 flex-1 text-sm font-medium leading-7">{String(label)}</span>
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
