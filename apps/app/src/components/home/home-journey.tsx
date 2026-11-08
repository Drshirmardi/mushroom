'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  HeartPulse,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import { useOptionalPatientEntry } from '@/components/auth/patient-entry-gate';
import { getAssessmentResult } from '@/lib/assessment-api';
import { HomeOrderProgress } from './home-order-progress';
import { homePendingAction, homeResultSummary, homeMizajData } from '@/lib/home-status';
import { MizajChart } from '@/components/assessments/mizaj-chart';
import type { PatientJourney } from '@/lib/patient-journey-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { LoadingState, SkeletonBox } from '@/components/shared/skeletons';
import { RefreshIndicator } from '@/components/shared/heartbeat-loader';

function Hero({
  label,
  title,
  children,
  action,
  footer,
  visual,
  busy = false,
}: {
  label: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  visual?: ReactNode;
  busy?: boolean;
}) {
  return (
    <div className="home-hero-frame">
      <section className="home-next" aria-labelledby="home-next-title" aria-busy={busy}>
        <div className="home-section-heading">
          <span>{label}</span>
        </div>
        <div className="home-next-stage">
          <div className="home-next-copy">
            <h2 id="home-next-title">{title}</h2>
            {children}
          </div>
          <div className="home-next-action">{action}</div>
          {visual && <div className="home-mizaj">{visual}</div>}
        </div>
        {footer}
      </section>
    </div>
  );
}

const heroLink = (href: string, label: string) => (
  <Link href={href} className="home-next-link">
    {label}
    <ArrowLeft size={17} aria-hidden="true" />
  </Link>
);

function StatusFooter({ data }: { data: PatientJourney }) {
  const entry = useOptionalPatientEntry();
  return (
    <div className="home-status-facts">
      <span>
        <CheckCheck size={17} aria-hidden="true" />
        {data.onboarding.isComplete
          ? 'پروندهٔ سلامت تکمیل است'
          : entry?.status?.birthDate
            ? 'مشخصات پایه ثبت شده'
            : 'حساب کاربری فعال است'}
      </span>
      {data.home.latestAssessment && (
        <span>
          <ClipboardList size={17} aria-hidden="true" />
          ارزیابی ثبت‌شده
        </span>
      )}
      {data.home.activeTreatmentPlanId && (
        <Link href={`/treatment?planId=${encodeURIComponent(data.home.activeTreatmentPlanId)}`}>
          <HeartPulse size={17} aria-hidden="true" />
          برنامهٔ درمان فعال
        </Link>
      )}
    </div>
  );
}

function AssessmentStatus({ data, token }: { data: PatientJourney; token: string }) {
  const latest = data.home.latestAssessment!;
  const result = usePatientResource(
    useCallback(() => getAssessmentResult(token, latest.id), [token, latest.id]),
  );
  const summary = result.data ? homeResultSummary(result.data.resultSnapshot) : null;
  const chart = homeMizajData(result.data?.resultSnapshot);
  return (
    <Hero
      label="وضعیت شما"
      title={summary?.title ?? 'ارزیابی شما ثبت شده است'}
      busy={result.loading}
      visual={
        result.loading ? (
          <MizajChart variant="semi" isLoading />
        ) : chart ? (
          <MizajChart {...chart} variant="semi" />
        ) : undefined
      }
      action={heroLink(
        `/assessment/result?submissionId=${encodeURIComponent(latest.id)}`,
        'مشاهدهٔ نتیجه',
      )}
      footer={<StatusFooter data={data} />}
    >
      {result.loading ? (
        <LoadingState variant="card">
          <SkeletonBox className="my-3 h-5 w-full" />
          <SkeletonBox className="h-4 w-4/5" />
        </LoadingState>
      ) : (
        <p className="home-next-description">
          {result.error
            ? 'خلاصهٔ نتیجه دریافت نشد. برای بررسی وضعیت دسترسی، صفحهٔ نتیجه را باز کنید.'
            : summary?.description}
        </p>
      )}
      <p className="home-result-meta">
        {latest.title} ·{' '}
        {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(
          new Date(latest.completedAt),
        )}
      </p>
      {result.error && (
        <button type="button" className="home-inline-action" onClick={() => void result.reload()}>
          دریافت دوبارهٔ نتیجه
        </button>
      )}
    </Hero>
  );
}

function PendingActions({
  actions,
  token,
}: {
  actions: PatientJourney['home']['actions'];
  token: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (actions.length === 0) return null;
  const shown = expanded ? actions : actions.slice(0, 3);
  return (
    <section className="home-pending" aria-labelledby="home-pending-title">
      <div className="home-section-heading">
        <div>
          <h2 id="home-pending-title">اقدام‌های پیش رو</h2>
          <p>پیگیری‌های مرتبط با خدمات شما</p>
        </div>
      </div>
      <div id="home-pending-list" className="home-pending-list">
        {shown.map((action) => {
          if (action.code === 'TRACK_ORDER' && action.resourceId)
            return (
              <HomeOrderProgress
                key={`order:${action.resourceId}`}
                orderId={action.resourceId}
                token={token}
              />
            );
          const item = homePendingAction(action);
          const Icon =
            action.code === 'OPEN_APPOINTMENT'
              ? CalendarDays
              : action.code === 'CONTINUE_PAYMENT'
                ? Wallet
                : action.code === 'TRACK_ORDER'
                  ? ShoppingBag
                  : action.code === 'OPEN_COUPLE_LINK' || action.code === 'OPEN_COUPLE_ASSESSMENT'
                    ? Users
                    : action.code === 'VIEW_TREATMENT_PLAN'
                      ? HeartPulse
                      : ClipboardList;
          return (
            <Link
              className="home-pending-item"
              href={item.href}
              key={`${action.code}:${action.resourceId ?? ''}`}
            >
              <span className="home-pending-icon">
                <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
      {actions.length > 3 && (
        <button
          type="button"
          className="home-inline-action"
          aria-controls="home-pending-list"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'نمایش کمتر' : 'پیگیری‌های بیشتر'}
        </button>
      )}
    </section>
  );
}

export function HomeJourney({
  journey,
  token,
}: {
  journey: ReturnType<typeof usePatientResource<PatientJourney>>;
  token: string;
}) {
  const reload = journey.refresh;
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) void reload();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('pageshow', restored);
    return () => {
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('pageshow', restored);
    };
  }, [reload]);
  const data = journey.data;
  if (journey.loading)
    return (
      <div className="home-hero-frame">
        <LoadingState variant="card" label="در حال دریافت وضعیت شما…" className="home-next">
          <div className="home-section-heading">
            <SkeletonBox className="h-4 w-1/4" />
          </div>
          <div className="home-next-stage">
            <div className="home-next-copy space-y-4">
              <SkeletonBox className="h-7 w-3/4" />
              <SkeletonBox className="h-4 w-full" />
              <SkeletonBox className="h-4 w-4/5" />
            </div>
            <div className="home-mizaj">
              <MizajChart variant="semi" isLoading />
            </div>
          </div>
        </LoadingState>
      </div>
    );
  if (!data?.home)
    return (
      <Hero
        label="وضعیت شما"
        title="اطلاعات شما دریافت نشد"
        action={
          <button type="button" className="home-next-link" onClick={() => void journey.reload()}>
            دریافت دوباره
          </button>
        }
      >
        <p className="home-next-description" role="alert">
          فعلاً امکان نمایش وضعیت پرونده و پیگیری‌ها وجود ندارد. دوباره تلاش کنید.
        </p>
      </Hero>
    );
  return (
    <>
      {journey.refreshing && <RefreshIndicator />}
      {journey.error && (
        <div role="alert" className="home-pending">
          <p>مشکل در بروزرسانی !</p>
          <button className="home-inline-action" onClick={() => void journey.reload()}>
            تلاش دوباره
          </button>
        </div>
      )}
      {data.home.latestAssessment ? (
        <AssessmentStatus key={data.home.latestAssessment.id} data={data} token={token} />
      ) : (
        <Hero
          label="وضعیت شما"
          title="خانهٔ سلامت شما"
          action={heroLink('/assessment?view=history', 'ارزیابی‌های من')}
          footer={<StatusFooter data={data} />}
        >
          <p className="home-next-description">
            نتیجهٔ ارزیابی‌ها و پیگیری خدماتتان را اینجا ببینید.
          </p>
        </Hero>
      )}
      <PendingActions actions={data.home.actions} token={token} />
    </>
  );
}
