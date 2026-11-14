'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/css';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import { getAssessmentResult } from '@/lib/assessment-api';
import { HomeOrderProgress } from './home-order-progress';
import { toP } from '@/lib/format';
import { homePendingAction, homeMizajData } from '@/lib/home-status';
import { MizajChart, mizajPercentages } from '@/components/assessments/mizaj-chart';
import type { PatientJourney } from '@/lib/patient-journey-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { LoadingState, SkeletonBox } from '@/components/shared/skeletons';
import { RefreshIndicator } from '@/components/shared/heartbeat-loader';

function Hero({
  label,
  title,
  children,
  action,
  visual,
  headingAction,
  busy = false,
}: {
  label: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  headingAction?: ReactNode;
  visual?: ReactNode;
  busy?: boolean;
}) {
  return (
    <section className="home-next" aria-labelledby="home-next-title" aria-busy={busy}>
      <div className="home-section-heading mb-2 flex items-center justify-between gap-3 text-xs text-[var(--home-muted)]">
        <span>{label}</span>
        {headingAction}
      </div>
      <div className="home-next-stage">
        <div className="home-next-copy min-w-0">
          <h2
            id="home-next-title"
            className="m-0 text-xl leading-[1.5] font-semibold [overflow-wrap:anywhere]"
          >
            {title}
          </h2>
          {children}
          {action && <div className="mt-3">{action}</div>}
        </div>
        {visual && <div className="home-mizaj mx-auto w-full min-w-0">{visual}</div>}
      </div>
    </section>
  );
}

const heroLink = (href: string, label: string) => (
  <Link
    href={href}
    className="home-next-link inline-flex min-h-[46px] items-center justify-center gap-2.5 px-3.5 text-[13px] leading-6 font-medium sm:gap-2"
  >
    {label}
    <ArrowLeft className="shrink-0 max-[359px]:hidden" size={17} aria-hidden="true" />
  </Link>
);

const setupStepContent = {
  PROFILE: {
    label: 'اطلاعات فردی',
    icon: 'person',
    action: 'تکمیل اطلاعات فردی',
    href: '/profile/edit',
  },
  HEALTH: {
    label: 'اطلاعات سلامت',
    icon: 'medical-bag',
    action: 'ادامهٔ اطلاعات سلامت',
    href: '/onboarding?from=home',
  },
  CONFIRM: {
    label: 'ثبت پرونده',
    icon: 'checklist',
    action: 'مرور و ثبت پرونده',
    href: '/onboarding?from=home',
  },
} as const;

function SetupProgress({ steps }: { steps: PatientJourney['home']['setupSteps'] }) {
  const currentStep =
    steps.find((step) => step.state === 'CURRENT') ??
    steps.find((step) => step.state !== 'COMPLETE');
  const completedCount = steps.filter((step) => step.state === 'COMPLETE').length;
  if (!currentStep) return null;
  const currentContent = setupStepContent[currentStep.code];

  return (
    <section className="home-panel home-setup-panel min-w-0" aria-label="پیشرفت پرونده">
      <div className="home-section-heading flex items-center justify-between gap-3">
        <h2 className="text-sm leading-7 font-medium">تکمیل پروندهٔ سلامت</h2>
        <span className="home-setup-count text-[11px]">
          گام {toP(completedCount + 1)} از {toP(steps.length)}
        </span>
      </div>
      <div
        className="home-setup-progress mt-2"
        role="meter"
        aria-label="میزان تکمیل پرونده"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={completedCount}
      >
        <span style={{ width: `${(completedCount / steps.length) * 100}%` }} />
      </div>
      <ol className="home-setup-steps mt-3 grid grid-cols-3 gap-2.5">
        {steps.map((step) => {
          const content = setupStepContent[step.code];
          const iconVariant = step.state === 'CURRENT' ? 'bold' : 'linear';
          const stateLabel =
            step.state === 'COMPLETE'
              ? 'انجام شد'
              : step.state === 'CURRENT'
                ? 'در حال تکمیل'
                : 'مرحلهٔ بعد';
          return (
            <li
              key={step.code}
              data-state={step.state}
              className="home-setup-step flex min-w-0 flex-col items-center gap-1 text-center text-[11px] leading-5 text-[var(--home-muted)]"
            >
              <span className="home-setup-glyph" aria-hidden="true">
                <i className={`icon icon-${content.icon}-${iconVariant}`} />
              </span>
              <span className="max-w-full font-medium">{content.label}</span>
              <span className="home-setup-state max-w-full text-[10px] leading-4">
                {stateLabel}
              </span>
            </li>
          );
        })}
      </ol>
      <Link
        href={currentContent.href}
        className="home-setup-action mt-3 flex min-h-11 items-center justify-between gap-3 rounded-2xl px-3.5 text-[12px] font-medium"
      >
        <span className="min-w-0 truncate">{currentContent.action}</span>
        <ArrowLeft size={17} className="shrink-0" aria-hidden="true" />
      </Link>
    </section>
  );
}

function NextVisit({ visit }: { visit: PatientJourney['appointments']['items'][number] }) {
  const when = new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tehran',
  }).format(new Date(visit.startsAt));
  const mode = visit.visitMode === 'ONLINE' ? 'آنلاین' : 'حضوری';
  return (
    <Link
      className="home-pending-item flex min-w-0 items-center gap-3 rounded-[22px] p-4 lg:items-start"
      href={`/appointments/${encodeURIComponent(visit.id)}`}
    >
      <span className="home-pending-icon grid size-[42px] shrink-0 place-items-center rounded-[14px]">
        <CalendarDays size={22} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] leading-[26px] font-medium [overflow-wrap:anywhere]">
          نوبت {mode}
        </h3>
        <p className="mt-0.5 text-xs leading-6 text-[var(--home-muted)] [overflow-wrap:anywhere]">
          {when}
        </p>
      </div>
      <ArrowLeft
        className="mt-0 shrink-0 text-[var(--home-action)] lg:mt-[9px]"
        size={18}
        aria-hidden="true"
      />
    </Link>
  );
}

function AssessmentCarousel({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const swiper = useRef<SwiperInstance | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  useEffect(() => () => resizeObserver.current?.disconnect(), []);

  return (
    <div
      onFocusCapture={() => swiper.current?.autoplay?.stop()}
      onBlurCapture={(event) => {
        if (!reducedMotion && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
          swiper.current?.autoplay?.start();
        }
      }}
    >
      <Swiper
        className="home-assessment-carousel"
        dir="rtl"
        modules={[Autoplay, A11y]}
        slidesPerView="auto"
        slidesPerGroup={1}
        spaceBetween={10}
        threshold={1}
        touchRatio={1.1}
        longSwipesRatio={0.12}
        longSwipesMs={180}
        rewind
        grabCursor
        speed={reducedMotion ? 0 : 560}
        autoplay={
          reducedMotion
            ? false
            : {
                delay: 5200,
                disableOnInteraction: false,
                pauseOnMouseEnter: false,
              }
        }
        a11y={{
          enabled: true,
          slideLabelMessage: '{{index}} از {{slidesLength}}',
          scrollOnFocus: false,
        }}
        onSwiper={(instance) => {
          swiper.current = instance;
          resizeObserver.current?.disconnect();
          const activeSlide = instance.slides[0];
          const swiperElement = instance.el;
          if (!activeSlide || !swiperElement) return;

          const syncReservedSlideHeight = () => {
            if (instance.destroyed || !swiperElement.isConnected || !activeSlide.isConnected) return;
            swiperElement.style.setProperty(
              '--home-assessment-slide-height',
              `${activeSlide.getBoundingClientRect().height}px`,
            );
          };

          syncReservedSlideHeight();
          if (typeof ResizeObserver !== 'undefined') {
            resizeObserver.current = new ResizeObserver(syncReservedSlideHeight);
            resizeObserver.current.observe(activeSlide);
          }
        }}
      >
        <SwiperSlide className="home-assessment-slide">{children}</SwiperSlide>
        <SwiperSlide
          className="home-assessment-slide home-assessment-slide--reserved"
          aria-hidden="true"
        >
          <div className="home-assessment-next-placeholder" />
        </SwiperSlide>
      </Swiper>
    </div>
  );
}

function AssessmentStatus({ data, token }: { data: PatientJourney; token: string }) {
  const latest = data.home.latestAssessment!;
  const result = usePatientResource(
    useCallback(() => getAssessmentResult(token, latest.id), [token, latest.id]),
  );
  const chart = homeMizajData(result.data?.resultSnapshot);
  const percentages = chart ? mizajPercentages(chart.scores, chart.dimensions) : [];
  const distribution = chart
    ? chart.dimensions.map((dimension, index) => ({
        ...dimension,
        index,
        percent: percentages[index] / 10,
      }))
    : [];
  const ranked = [...distribution].sort((left, right) => right.percent - left.percent);
  const scoreColors = [
    'var(--dp-success)',
    'var(--dp-brand-tint)',
    'var(--dp-warning)',
    'var(--dp-error)',
  ];
  const resultLink = `/assessment/result?submissionId=${encodeURIComponent(latest.id)}`;
  return (
    <section
      className="home-next home-assessment-status"
      aria-label="وضعیت شما"
      aria-busy={result.loading}
    >
      <AssessmentCarousel>
        <div className="home-assessment-heading">
          <span id="home-assessment-title">وضعیت شما</span>
        </div>
        <Link
          href={resultLink}
          className="home-assessment-chart-link"
          aria-label="مشاهدهٔ نتیجهٔ آزمون مزاج‌شناسی"
          draggable={false}
        >
          <div className="home-assessment-chart-layout" aria-label="درصد گرایش‌های مزاجی">
            <div className="home-assessment-scores" aria-label="گرایش‌های اول و دوم">
              {result.loading
                ? [0, 1].map((index) => (
                    <div className="home-assessment-score" key={`left-${index}`}>
                      <SkeletonBox className="h-6 w-12" />
                      <SkeletonBox className="h-4 w-10" />
                    </div>
                  ))
                : distribution.slice(0, 2).map((item) => (
                    <div className="home-assessment-score" key={item.id}>
                      <span
                        className="home-assessment-score__value"
                        style={{ color: scoreColors[item.index % scoreColors.length] }}
                      >
                        {item.percent.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪
                      </span>
                      <span className="home-assessment-score__name">{item.title}</span>
                    </div>
                  ))}
            </div>
            <div className="home-mizaj home-assessment-chart">
              {result.loading ? (
                <MizajChart variant="home" isLoading />
              ) : chart ? (
                <MizajChart {...chart} variant="home" />
              ) : (
                <div className="home-assessment-chart-empty" role="status">
                  نمودار نتیجه در دسترس نیست
                </div>
              )}
            </div>
            <div className="home-assessment-scores" aria-label="گرایش‌های سوم و چهارم">
              {result.loading
                ? [0, 1].map((index) => (
                    <div className="home-assessment-score" key={`right-${index}`}>
                      <SkeletonBox className="h-6 w-12" />
                      <SkeletonBox className="h-4 w-10" />
                    </div>
                  ))
                : distribution.slice(2, 4).map((item) => (
                    <div className="home-assessment-score" key={item.id}>
                      <span
                        className="home-assessment-score__value"
                        style={{ color: scoreColors[item.index % scoreColors.length] }}
                      >
                        {item.percent.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪
                      </span>
                      <span className="home-assessment-score__name">{item.title}</span>
                    </div>
                  ))}
            </div>
          </div>
        </Link>
        <div className="home-assessment-footer">
          {result.loading ? (
            <div className="home-assessment-primary-types" aria-hidden="true">
              {[0, 1].map((index) => (
                <span className="home-assessment-type home-assessment-type--skeleton" key={index}>
                  <SkeletonBox className="h-3 w-8" />
                  <SkeletonBox className="h-3 w-12" />
                </span>
              ))}
            </div>
          ) : (
            ranked.length > 0 && (
              <div className="home-assessment-primary-types">
                {ranked.slice(0, 2).map((item, index) => (
                  <span className="home-assessment-type home-assessment-type--result" key={item.id}>
                    <small>مزاج {index === 0 ? 'اول' : 'دوم'}</small>
                    <strong>{item.title}</strong>
                  </span>
                ))}
              </div>
            )
          )}
          <Link
            href="/store?tab=services"
            className="home-assessment-result-link"
            draggable={false}
          >
            مشاهدهٔ خدمات
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
        </div>
        {result.error && (
          <div className="home-assessment-error" role="alert">
            <span>خلاصهٔ نتیجه دریافت نشد.</span>
            <button type="button" onClick={() => void result.reload()}>
              دریافت دوباره
            </button>
          </div>
        )}
      </AssessmentCarousel>
    </section>
  );
}

function AssessmentStatusSkeleton() {
  const scorePlaceholders = (side: 'left' | 'right') => (
    <div className="home-assessment-scores" aria-hidden="true">
      {[0, 1].map((index) => (
        <div className="home-assessment-score" key={`${side}-${index}`}>
          <SkeletonBox className="h-6 w-12" />
          <SkeletonBox className="h-4 w-10" />
        </div>
      ))}
    </div>
  );

  return (
    <section className="home-next home-assessment-status" aria-hidden="true">
      <AssessmentCarousel>
        <div className="home-assessment-skeleton-slide">
          <div className="home-assessment-heading">
            <span>وضعیت شما</span>
          </div>
          <div className="home-assessment-chart-layout">
            {scorePlaceholders('left')}
            <div className="home-mizaj home-assessment-chart">
              <MizajChart variant="home" isLoading />
            </div>
            {scorePlaceholders('right')}
          </div>
          <div className="home-assessment-footer">
            <div className="home-assessment-primary-types">
              {[0, 1].map((index) => (
                <span className="home-assessment-type home-assessment-type--skeleton" key={index}>
                  <SkeletonBox className="h-3 w-8" />
                  <SkeletonBox className="h-3 w-12" />
                </span>
              ))}
            </div>
            <span className="home-assessment-result-link home-assessment-result-link--skeleton">
              <SkeletonBox className="h-3 w-20" />
            </span>
          </div>
        </div>
      </AssessmentCarousel>
    </section>
  );
}

function ActionRow({
  action,
  token,
}: {
  action: PatientJourney['home']['actions'][number];
  token: string;
}) {
  if (action.code === 'TRACK_ORDER' && action.resourceId) {
    return <HomeOrderProgress orderId={action.resourceId} token={token} />;
  }
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
      className="home-pending-item flex min-w-0 items-center gap-3 rounded-[22px] p-4 lg:items-start"
      href={item.href}
    >
      <span className="home-pending-icon grid size-[42px] shrink-0 place-items-center rounded-[14px]">
        <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] leading-[26px] font-medium text-[var(--home-ink)] [overflow-wrap:anywhere]">
          {item.title}
        </h3>
        <p className="mt-0.5 text-xs leading-6 text-[var(--home-muted)] [overflow-wrap:anywhere]">
          {item.description}
        </p>
      </div>
      <ArrowLeft
        className="mt-0 shrink-0 text-[var(--home-action)] lg:mt-[9px]"
        size={18}
        aria-hidden="true"
      />
    </Link>
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
      <div className="home-section-heading mb-3.5 flex items-center justify-between gap-3">
        <div>
          <h2 id="home-pending-title" className="text-base leading-[30px] font-medium">
            اقدام‌های پیش رو
          </h2>
          <p className="mt-0.5 text-xs leading-6 text-[var(--home-muted)]">
            پیگیری‌های مرتبط با خدمات شما
          </p>
        </div>
      </div>
      <div
        id="home-pending-list"
        className="home-pending-list grid items-start gap-2.5 lg:grid-cols-3"
      >
        {shown.map((action) => (
          <ActionRow
            key={`${action.code}:${action.resourceId ?? ''}`}
            action={action}
            token={token}
          />
        ))}
      </div>
      {actions.length > 3 && (
        <button
          type="button"
          className="home-inline-action mt-1.5 inline-flex min-h-11 items-center text-xs text-[var(--home-action)] underline underline-offset-4"
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

type HomeJourneyProps = {
  journey: ReturnType<typeof usePatientResource<PatientJourney>>;
  token: string;
};

export function HomeJourneyOverview({ journey, token }: HomeJourneyProps) {
  const data = journey.data;
  if (journey.loading)
    return (
      <LoadingState label="در حال دریافت وضعیت شما…" className="home-assessment-loading">
        <AssessmentStatusSkeleton />
      </LoadingState>
    );
  if (!data?.home)
    return (
      <Hero
        label="وضعیت شما"
        title="مشکلی پیش اومد"
        action={
          <button
            type="button"
            className="home-next-link inline-flex min-h-[46px] items-center justify-center gap-2.5 px-3.5 text-[13px] leading-6 font-medium"
            onClick={() => void journey.reload()}
          >
            تلاش دوباره
          </button>
        }
      >
        <p
          className="home-next-description mt-2 max-w-[48ch] text-sm leading-[27px] text-[var(--home-muted)] [text-wrap:pretty] sm:leading-7 lg:text-[15px] lg:leading-[30px]"
          role="alert"
        >
          نتونستیم اطلاعاتت رو دریافت کنیم دوباره تلاش کن
        </p>
      </Hero>
    );
  return data.home.latestAssessment ? (
    <AssessmentStatus key={data.home.latestAssessment.id} data={data} token={token} />
  ) : (
    <Hero
      label="وضعیت شما"
      title="خانهٔ سلامت شما"
      action={heroLink('/assessment?view=history', 'ارزیابی‌های من')}
    >
      <p className="home-next-description mt-2 max-w-[48ch] text-sm leading-7 text-[var(--home-muted)]">
        نتیجهٔ ارزیابی‌ها و پیگیری خدماتتان را اینجا ببینید.
      </p>
    </Hero>
  );
}

export function HomeJourney({ journey, token }: HomeJourneyProps) {
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
  if (journey.loading || !data?.home) return null;
  const [first, ...rest] = data.home.actions;
  const visit = data.appointments.items[0];
  const featuredIsVisit = first?.code === 'OPEN_APPOINTMENT' && first.resourceId === visit?.id;
  return (
    <>
      {journey.refreshing && <RefreshIndicator />}
      {journey.error && (
        <div role="alert" className="home-pending">
          <p>مشکل در بروزرسانی !</p>
          <button
            className="home-inline-action mt-1.5 inline-flex min-h-11 items-center text-xs text-[var(--home-action)] underline underline-offset-4"
            onClick={() => void journey.reload()}
          >
            تلاش دوباره
          </button>
        </div>
      )}
      {first ? (
        <section aria-label="قدم بعدی">
          <ActionRow action={first} token={token} />
        </section>
      ) : null}
      {visit && !featuredIsVisit ? <NextVisit visit={visit} /> : null}
      {!data.onboarding.isComplete && <SetupProgress steps={data.home.setupSteps} />}
      <PendingActions actions={rest} token={token} />
    </>
  );
}
