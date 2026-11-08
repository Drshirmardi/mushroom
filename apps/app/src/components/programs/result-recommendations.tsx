'use client';

import { useCallback, useState, type MouseEvent } from 'react';

import { RefreshIndicator } from '@/components/shared/heartbeat-loader';
import { LoadingState } from '@/components/shared/skeletons';
import { getMezajServices } from '@/lib/mezaj-services-api';
import { getCommerceRecommendations } from '@/lib/commerce-catalog-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { ProductCard } from '@/components/store/product-card';
import { ServiceCard } from './service-card';

export type RecommendationsLayout = 'vertical' | 'horizontal';

export type ResultRecommendationsProps = {
  token: string;
  submissionId: string;
  onNavigate?: (href: string) => Promise<void>;
  layout?: RecommendationsLayout;
};

export function ResultRecommendations({
  token,
  submissionId,
  onNavigate,
  layout = 'vertical',
}: ResultRecommendationsProps) {
  const [navigating, setNavigating] = useState(false);
  const [navigationError, setNavigationError] = useState(false);

  const horizontal = layout === 'horizontal';

  // Preserve the optional welcome/onboarding navigation flow.
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

  // Fetch services for the exact assessment submission.
  const services = usePatientResource(
    useCallback(() => getMezajServices(token, submissionId), [token, submissionId]),
  );

  // Fetch products for the exact assessment submission.
  const products = usePatientResource(
    useCallback(() => getCommerceRecommendations(token, submissionId), [token, submissionId]),
  );

  return (
    <div
      className="mezaj-recommendations min-w-0"
      onClickCapture={(event) => void open(event)}
      aria-busy={navigating}
      data-layout={layout}
    >
      {navigating && <RefreshIndicator label="در حال تکمیل ورود و باز کردن صفحه…" />}

      {navigationError && (
        <p role="alert" className="mezaj-state">
          تکمیل ورود انجام نشد. دوباره روی گزینهٔ موردنظر بزنید.
        </p>
      )}

      {/* Services recommendations */}
      <section aria-label="خدمات مرتبط با نتیجه" className="min-w-0">
        <div className="mezaj-section-heading">
          <h2>شناخت بیشتر از خودتان</h2>
          <p>مطالعهٔ بیشتر بر اساس نتیجهٔ همین آزمون؛ انتخاب با شماست.</p>
        </div>

        {services.loading ? (
          <LoadingState label="در حال دریافت خدمات مرتبط…" variant="list" />
        ) : services.error ? (
          <div role="alert" className="mezaj-state">
            <p>خدمات مرتبط دریافت نشد.</p>

            <button type="button" onClick={() => void services.reload()}>
              تلاش دوباره
            </button>
          </div>
        ) : services.data?.items.length ? (
          <div
            className={
              horizontal
                ? 'flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3'
                : 'mezaj-service-grid'
            }
            role={horizontal ? 'region' : undefined}
            aria-label={horizontal ? 'فهرست افقی خدمات مرتبط' : undefined}
            tabIndex={horizontal ? 0 : undefined}
          >
            {services.data.items.map((item) =>
              horizontal ? (
                <div
                  key={item.programDefinitionId}
                  className="w-[min(85vw,21rem)] min-w-0 shrink-0 snap-start [&>.mezaj-service-card]:h-full"
                >
                  <ServiceCard item={item} />
                </div>
              ) : (
                <ServiceCard key={item.programDefinitionId} item={item} />
              ),
            )}
          </div>
        ) : (
          <p className="mezaj-state">هنوز خدمت متنی قابل خریدی برای این نتیجه معرفی نشده است.</p>
        )}
      </section>

      {/* Product recommendations */}
      <section aria-label="محصولات مرتبط با نتیجه" className="min-w-0">
        <div className="mezaj-section-heading">
          <h2>محصولات مرتبط با مزاج شما</h2>
          <p>محصولاتی که کلینیک برای این ترکیب مزاج انتخاب کرده است.</p>
        </div>

        {products.loading ? (
          <LoadingState label="در حال دریافت محصولات…" variant="grid" />
        ) : products.error ? (
          <div role="alert" className="mezaj-state">
            <p>محصولات مرتبط دریافت نشد.</p>

            <button type="button" onClick={() => void products.reload()}>
              تلاش دوباره
            </button>
          </div>
        ) : products.data?.status === 'READY' && products.data.items.length ? (
          <div
            className={
              horizontal
                ? 'flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3'
                : 'mezaj-product-grid'
            }
            role={horizontal ? 'region' : undefined}
            aria-label={horizontal ? 'فهرست افقی محصولات مرتبط' : undefined}
            tabIndex={horizontal ? 0 : undefined}
          >
            {products.data.items.map((product) =>
              horizontal ? (
                <div
                  key={product.id}
                  className="w-[min(58vw,15rem)] min-w-0 shrink-0 snap-start [&>.store-product]:h-full"
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
              ) : (
                <ProductCard
                  key={product.id}
                  product={product}
                  saved={false}
                  inCart={false}
                  busy={false}
                  onFavorite={() => {}}
                  showFavorite={false}
                />
              ),
            )}
          </div>
        ) : (
          <p className="mezaj-state">
            {products.data?.status === 'REVIEW_REQUIRED'
              ? 'پیشنهاد محصول پس از بررسی نتیجه توسط متخصص نمایش داده می‌شود.'
              : 'هنوز محصولی برای این نتیجه معرفی نشده است.'}
          </p>
        )}
      </section>
    </div>
  );
}
