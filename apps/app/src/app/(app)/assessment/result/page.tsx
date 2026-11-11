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
import { GuidanceSafety } from '@/components/shared/policy-acceptance';
import {
  getAssessmentResult,
  getAssessmentQuestionnaire,
  getAssessmentGuidance,
  getAssessmentProvenance,
} from '@/lib/assessment-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { MizajChart } from '@/components/assessments/mizaj-chart';
import { MizajResult } from '@/components/assessments/mizaj-result';
import { toP } from '@/lib/format';
import { ResultRecommendations } from '@/components/programs/result-recommendations';

function Result({ id }: { id: string }) {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;

  const result = usePatientResource(useCallback(() => getAssessmentResult(token, id), [token, id]));

  const questionnaire = usePatientResource(
    useCallback(() => getAssessmentQuestionnaire(token, id), [token, id]),
  );

  const guidance = usePatientResource(
    useCallback(() => getAssessmentGuidance(token, id), [token, id]),
  );

  const provenance = usePatientResource(
    useCallback(() => getAssessmentProvenance(token, id), [token, id]),
  );

  const snapshot = result.data?.resultSnapshot;

  const band =
    snapshot?.resultBand && typeof snapshot.resultBand === 'object'
      ? (snapshot.resultBand as Record<string, unknown>)
      : null;

  return (
    <ServicePage
      title="نتیجهٔ ارزیابی"
      description="نتیجهٔ ثبت‌شده و راهنمای آموزشی منتشرشدهٔ مربوط به ارزیابی خود را ببینید."
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

            <section className="space-y-3">
              <h2 className="text-base font-bold text-foreground">راهنمای نتیجه</h2>

              <PatientResourceState
                variant="detail"
                {...guidance}
                retry={() => void guidance.reload()}
              />

              {guidance.data?.status === 'READY' ? (
                <>
                  {guidance.data.content.map((item) => (
                    <article
                      key={item.id}
                      className="space-y-3 rounded-2xl border border-border/80 bg-white p-5 shadow-xs"
                    >
                      <h3 className="text-sm font-bold text-foreground sm:text-base">
                        {item.title}
                      </h3>

                      {item.summary && (
                        <p className="text-sm leading-7 text-muted-foreground">{item.summary}</p>
                      )}

                      <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                        {item.body}
                      </p>

                      <GuidanceSafety safety={item.safety} />
                    </article>
                  ))}

                  {guidance.data.services.map((service) => (
                    <Link
                      key={service.id}
                      href="/appointments/book"
                      className="flex min-h-11 items-center justify-between rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/10"
                    >
                      <span>{service.name}</span>
                      <span className="text-xs">رزرو نوبت ←</span>
                    </Link>
                  ))}
                </>
              ) : (
                guidance.data && (
                  <p className="rounded-2xl border border-border/70 bg-white p-4 text-sm leading-7 text-muted-foreground">
                    {guidance.data.status === 'CLINICAL_REVIEW_REQUIRED'
                      ? 'پیش از ارائهٔ راهنما، نتیجه باید توسط درمانگر بررسی شود.'
                      : 'در حال حاضر راهنمای تأییدشده‌ای برای این نتیجه در دسترس نیست.'}
                  </p>
                )
              )}
            </section>

            <details className="rounded-2xl border border-border/80 bg-white p-4 text-sm shadow-2xs">
              <summary className="cursor-pointer font-bold text-foreground">
                اطلاعات نسخهٔ نتیجه
              </summary>

              <PatientResourceState
                variant="detail"
                {...provenance}
                retry={() => void provenance.reload()}
              />

              {questionnaire.data && (
                <p className="mt-3 text-muted-foreground">
                  نسخهٔ پرسش‌نامه:{' '}
                  <strong className="text-foreground">{toP(questionnaire.data.versionNumber)}</strong>
                </p>
              )}

              {provenance.data && (
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {provenance.data.provenanceStatus === 'RECORDED'
                    ? 'مشخصات نسخهٔ محاسبه برای این نتیجه ثبت شده است.'
                    : 'مشخصات کامل محاسبه در نتیجهٔ قدیمی ثبت نشده است.'}
                </p>
              )}
            </details>

            <Link
              href="/appointments/book"
              className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-center text-sm font-bold text-white shadow-xs transition hover:bg-primary/90"
            >
              بررسی شرایط و رزرو مشاوره
            </Link>

            <div className="mt-8 space-y-4">
              <ResultRecommendations token={token} submissionId={id} layout="horizontal" />
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
