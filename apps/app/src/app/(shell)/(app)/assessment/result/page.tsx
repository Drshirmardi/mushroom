'use client';

import { LoadingState } from '@/components/shared/skeletons';
import { currentInvitationContext } from '@/lib/marriage-context';
import Link from 'next/link';
import { Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { ClipboardList } from 'lucide-react';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { getAssessmentResult, getAssessmentQuestionnaire } from '@/lib/assessment-api';
import { usePatientResource, useSessionPatientResource } from '@/lib/use-patient-resource';
import { MizajChart } from '@/components/assessments/mizaj-chart';
import { MizajResult } from '@/components/assessments/mizaj-result';
import { toP } from '@/lib/format';
import {
  ResultRecommendationSections,
  useResultRecommendations,
} from '@/components/programs/result-recommendations';

function Result({ id }: { id: string }) {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;

  const result = useSessionPatientResource(
    `assessment-result:${id}`,
    useCallback(
      (accessToken: string, signal: AbortSignal) => getAssessmentResult(accessToken, id, signal),
      [id],
    ),
  );
  const recommendations = useResultRecommendations(id, result.data !== null);

  const questionnaire = usePatientResource(
    useCallback(() => getAssessmentQuestionnaire(token, id), [token, id]),
  );

  const snapshot = result.data?.resultSnapshot;

  const band =
    snapshot?.resultBand && typeof snapshot.resultBand === 'object'
      ? (snapshot.resultBand as Record<string, unknown>)
      : null;

  return (
    <ServicePage
      className="!text-sm !leading-[26px]"
      title="نتیجهٔ ارزیابی"
      titleClassName="!text-[20px] !leading-9 sm:!text-[20px] sm:!leading-10"
      descriptionClassName="!text-sm !leading-7"
      description=""
      icon={ClipboardList}
      backHref={
        currentInvitationContext()
          ? `/assessment/marriage/requests/${currentInvitationContext()}`
          : '/assessment?view=history'
      }
      backLabel="ارزیابی‌ها"
    >
      <div className="space-y-4">
        {result.loading ? (
          <MizajChart isLoading />
        ) : (
          <PatientResourceState variant="detail" {...result} retry={() => void result.reload()} />
        )}

        {result.data && (
          <>
            {snapshot?.algorithmId === 'DIMENSION_TIEBREAK' ? (
              <MizajResult snapshot={snapshot} />
            ) : (
              <section className="rounded-3xl bg-gradient-to-br from-primary to-emerald-800 p-6 text-white shadow-sm">
                <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                  گزارش ارزیابی
                </span>
                <h2 className="mt-3 text-lg font-bold sm:text-xl">
                  {questionnaire.data?.title ?? 'ارزیابی ثبت‌شده'}
                </h2>

                <p className="mt-4 text-3xl font-extrabold">
                  {result.data.score == null
                    ? 'امتیازی برای نمایش ثبت نشده است.'
                    : toP(result.data.score)}
                </p>

                {typeof band?.title === 'string' && (
                  <p className="mt-2 inline-flex rounded-xl bg-white/15 px-3 py-1 text-sm font-bold">
                    {band.title}
                  </p>
                )}

                <p className="mt-3 text-xs leading-6 text-white/85">
                  نتیجهٔ آموزشی ثبت‌شده؛ تفسیر و پیشنهادهای قابل نمایش فقط از محتوای تأییدشدهٔ
                  کلینیک دریافت می‌شوند.
                </p>
              </section>
            )}

            {result.data.completedAt && (
              <p className="text-xs font-medium text-muted-foreground">
                تاریخ تکمیل:{' '}
                {new Intl.DateTimeFormat('fa-IR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(result.data.completedAt))}
              </p>
            )}

            {band?.requiresReview === true && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                این نتیجه نیاز به بررسی درمانگر دارد.
              </p>
            )}

            <div className="mt-8 space-y-4">
              <ResultRecommendationSections {...recommendations} layout="horizontal" />
            </div>
          </>
        )}
      </div>
    </ServicePage>
  );
}

function ResultRoute() {
  const id = useSearchParams().get('submissionId');

  return id ? (
    <Result key={id} id={id} />
  ) : (
    <div className="p-4">
      <p role="alert">شناسهٔ نتیجه مشخص نیست.</p>

      <Link href="/assessment" className="mt-4 block text-primary">
        بازگشت به ارزیابی‌ها
      </Link>
    </div>
  );
}

export default function AssessmentResultPage() {
  return (
    <Suspense fallback={<LoadingState variant="detail" className="p-4" />}>
      <ResultRoute />
    </Suspense>
  );
}
