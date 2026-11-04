'use client';
import { RefreshIndicator } from '@/components/shared/heartbeat-loader';
import { LoadingState } from "@/components/shared/skeletons";
import { useCallback, useState, type MouseEvent } from 'react';
import { getMezajServices } from '@/lib/mezaj-services-api';
import { getCommerceRecommendations } from '@/lib/commerce-catalog-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { ServiceCard } from './service-card';
import { ProductCard } from '@/components/store/product-card';

export function ResultRecommendations({ token, submissionId, onNavigate }: { token: string; submissionId: string; onNavigate?: (href: string) => Promise<void> }) {
  const [navigating, setNavigating] = useState(false), [navigationError, setNavigationError] = useState(false);
  const open = async (event: MouseEvent<HTMLDivElement>) => {
    if (!onNavigate) return;
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    const href = link?.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    event.preventDefault(); event.stopPropagation();
    if (navigating) return;
    setNavigating(true); setNavigationError(false);
    try { await onNavigate(href); } catch { setNavigationError(true); setNavigating(false); }
  };
  const services = usePatientResource(useCallback(() => getMezajServices(token, submissionId), [token, submissionId]));
  const products = usePatientResource(useCallback(() => getCommerceRecommendations(token, submissionId), [token, submissionId]));
  return <div className="mezaj-recommendations" onClickCapture={event => void open(event)} aria-busy={navigating}>
    {navigating && <RefreshIndicator label="در حال تکمیل ورود و باز کردن صفحه…" />}
    {navigationError && <p role="alert" className="mezaj-state">تکمیل ورود انجام نشد. دوباره روی گزینهٔ موردنظر بزنید.</p>}
    <section aria-label="خدمات مرتبط با نتیجه"><div className="mezaj-section-heading"><h2>شناخت بیشتر از خودتان</h2><p>مطالعهٔ بیشتر بر اساس نتیجهٔ همین آزمون؛ انتخاب با شماست.</p></div>
      {services.loading ? <LoadingState label="در حال دریافت خدمات مرتبط…" variant="list" /> : services.error ? <div role="alert" className="mezaj-state"><p>خدمات مرتبط دریافت نشد.</p><button onClick={() => void services.reload()}>تلاش دوباره</button></div> : services.data?.items.length ? <div className="mezaj-service-grid">{services.data.items.map(item => <ServiceCard key={item.programDefinitionId} item={item} />)}</div> : <p className="mezaj-state">هنوز خدمت متنی قابل خریدی برای این نتیجه معرفی نشده است.</p>}
    </section>
    <section aria-label="محصولات مرتبط با نتیجه"><div className="mezaj-section-heading"><h2>محصولات مرتبط با مزاج شما</h2><p>محصولاتی که کلینیک برای این ترکیب مزاج انتخاب کرده است.</p></div>
      {products.loading ? <LoadingState label="در حال دریافت محصولات…" variant="grid" /> : products.error ? <div role="alert" className="mezaj-state"><p>محصولات مرتبط دریافت نشد.</p><button onClick={() => void products.reload()}>تلاش دوباره</button></div> : products.data?.status === 'READY' && products.data.items.length ? <div className="mezaj-product-grid">{products.data.items.map(product => <ProductCard key={product.id} product={product} saved={false} inCart={false} busy={false} onFavorite={() => {}} showFavorite={false} />)}</div> : <p className="mezaj-state">{products.data?.status === 'REVIEW_REQUIRED' ? 'پیشنهاد محصول پس از بررسی نتیجه توسط متخصص نمایش داده می‌شود.' : 'هنوز محصولی برای این نتیجه معرفی نشده است.'}</p>}
    </section>
  </div>;
}
