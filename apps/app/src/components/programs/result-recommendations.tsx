'use client';

import { useCallback, useState, type MouseEvent } from 'react';

import { RefreshIndicator } from '@/components/shared/heartbeat-loader';
import { LoadingState } from '@/components/shared/skeletons';
import { ProductCard } from '@/components/store/product-card';

import { getCommerceRecommendations } from '@/lib/commerce-catalog-api';
import { getMezajServices } from '@/lib/mezaj-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';

import { ServiceCard } from './service-card';

export type RecommendationsLayout = 'vertical' | 'horizontal';

export type ResultRecommendationsProps = {
  token: string;
  submissionId: string;
  onNavigate?: (href: string) => Promise<void>;
  layout?: RecommendationsLayout;
};

// Shared visual styles.
const stateClass =
  'rounded-xl border border-border bg-muted/50 p-4 text-sm leading-7 text-muted-foreground';

const retryClass =
  'mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const headingClass = 'text-base font-bold leading-7 text-foreground @sm:text-lg';

const descriptionClass = 'mt-1 text-xs leading-6 text-muted-foreground @sm:text-sm';

const railClass =
  'flex w-full min-w-0 snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain scroll-px-1 pb-3';

export function ResultRecommendations({
  token,
  submissionId,
  onNavigate,
  layout = 'vertical',
}: ResultRecommendationsProps) {
  const [navigating, setNavigating] = useState(false);
  const [navigationError, setNavigationError] = useState(false);

  const horizontal = layout === 'horizontal';

  // Handle optional welcome/onboarding navigation.
  const open = async (event: MouseEvent<HTMLDivElement>) => {
    if (!onNavigate) return;

    const link = event.target instanceof Element ? event.target.closest('a') : null;

    const href = link?.getAttribute('href');

    if (!href || !href.startsWith('/') || href.startsWith('//')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (navigating) return;

    setNavigating(true);
    setNavigationError(false);

    try {
      await onNavigate(href);
    } catch {
      setNavigationError(true);
      setNavigating(false);
    }
  };

  // Services associated with this completed assessment.
  const services = usePatientResource(
    useCallback(() => getMezajServices(token, submissionId), [token, submissionId]),
  );

  // Products associated with this completed assessment.
  const products = usePatientResource(
    useCallback(() => getCommerceRecommendations(token, submissionId), [token, submissionId]),
  );

  return (
    <div
      className="@container grid w-full min-w-0 gap-7 text-start"
      onClickCapture={(event) => void open(event)}
      aria-busy={navigating}
      data-layout={layout}
    >
      {/* Navigation state */}

      {navigating && <RefreshIndicator label="در حال تکمیل ورود و باز کردن صفحه…" />}

      {navigationError && (
        <div role="alert" className={stateClass}>
          تکمیل ورود انجام نشد. دوباره روی گزینهٔ موردنظر بزنید.
        </div>
      )}

      {/* =========================================
          RELATED SERVICES
         ========================================= */}

      <section aria-label="خدمات مرتبط با نتیجه" className="w-full min-w-0">
        <header className="mb-4">
          <h2 className={headingClass}>شناخت بیشتر از خودتان</h2>

          <p className={descriptionClass}>مطالعهٔ بیشتر بر اساس مزاج شما؛ انتخاب با شماست.</p>
        </header>

        {services.loading ? (
          <LoadingState label="در حال دریافت خدمات مرتبط…" variant="list" />
        ) : services.error ? (
          <div role="alert" className={stateClass}>
            <p>خدمات مرتبط دریافت نشد.</p>

            <button type="button" className={retryClass} onClick={() => void services.reload()}>
              تلاش دوباره
            </button>
          </div>
        ) : services.data?.items.length ? (
          <div
            className={
              horizontal
                ? railClass
                : 'grid w-full min-w-0 grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3'
            }
            role={horizontal ? 'region' : undefined}
            aria-label={horizontal ? 'فهرست افقی خدمات مرتبط' : undefined}
            tabIndex={horizontal ? 0 : undefined}
          >
            {services.data.items.map((item) => (
              <div
                key={item.programDefinitionId}
                className={
                  horizontal
                    ? 'w-[clamp(13rem,68cqw,17.5rem)] max-w-[90cqw] shrink-0 snap-start [&>.mezaj-service-card]:h-full'
                    : 'min-w-0 [&>.mezaj-service-card]:h-full'
                }
              >
                <ServiceCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <p role="status" className={stateClass}>
            هنوز خدمت متنی قابل خریدی برای این نتیجه معرفی نشده است.
          </p>
        )}
      </section>

      {/* =========================================
          RELATED PRODUCTS
         ========================================= */}

      <section aria-label="محصولات مرتبط با نتیجه" className="w-full min-w-0">
        <header className="mb-4">
          <h2 className={headingClass}>محصولات مرتبط با مزاج شما</h2>

          <p className={descriptionClass}>
            محصولاتی که کلینیک برای این ترکیب مزاج انتخاب کرده است.
          </p>
        </header>

        {products.loading ? (
          <LoadingState label="در حال دریافت محصولات…" variant="grid" />
        ) : products.error ? (
          <div role="alert" className={stateClass}>
            <p>محصولات مرتبط دریافت نشد.</p>

            <button type="button" className={retryClass} onClick={() => void products.reload()}>
              تلاش دوباره
            </button>
          </div>
        ) : products.data?.status === 'READY' && products.data.items.length ? (
          <div
            className={
              horizontal
                ? railClass
                : 'grid w-full min-w-0 grid-cols-1 gap-3 @xs:grid-cols-2 @lg:grid-cols-3 @2xl:grid-cols-4'
            }
            role={horizontal ? 'region' : undefined}
            aria-label={horizontal ? 'فهرست افقی محصولات مرتبط' : undefined}
            tabIndex={horizontal ? 0 : undefined}
          >
            {products.data.items.map((product) => (
              <div
                key={product.id}
                className={
                  horizontal
                    ? 'w-[clamp(9.25rem,48cqw,11.25rem)] max-w-[90cqw] shrink-0 snap-start [&>.store-product]:h-full'
                    : 'min-w-0 [&>.store-product]:h-full'
                }
              >
                <ProductCard
                  product={product}
                  saved={false}
                  inCart={false}
                  busy={false}
                  onFavorite={() => {}}
                  showFavorite={false}
                />
              </div>
            ))}
          </div>
        ) : (
          <p role="status" className={stateClass}>
            {products.data?.status === 'REVIEW_REQUIRED'
              ? 'پیشنهاد محصول پس از بررسی نتیجه توسط متخصص نمایش داده می‌شود.'
              : 'هنوز محصولی برای این نتیجه معرفی نشده است.'}
          </p>
        )}
      </section>
    </div>
  );
}
