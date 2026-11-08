'use client';
import { browsePosition, saveExpansion } from '@/lib/store-browse';
import { StoreGridLoading } from './store-loading';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import {
  getCommerceRecommendations,
  type CommerceProduct,
  type CommerceRecommendations,
} from '../../lib/commerce-catalog-api';

const labels = { damavi: 'دموی', safravi: 'صفراوی', balgami: 'بلغمی', sodavi: 'سوداوی' };

export function PersonalizedProducts({
  accessToken,
  renderProduct,
  fallback,
  browseKey,
  onSettled,
  gridClassName = 'store-grid',
}: {
  accessToken?: string;
  browseKey: string;
  onSettled: () => void;
  fallback: ReactNode;
  renderProduct: (product: CommerceProduct) => ReactNode;
  gridClassName?: string;
}) {
  const [data, setData] = useState<CommerceRecommendations | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(() => browsePosition(browseKey)?.expanded ?? false);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    if (accessToken)
      void getCommerceRecommendations(accessToken)
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    return () => {
      cancelled = true;
    };
  }, [accessToken, retry]);
  useEffect(() => {
    if (!accessToken || data || error) onSettled();
  }, [accessToken, data, error, onSettled]);
  if (!accessToken) return fallback;
  if (error)
    return (
      <>
        <aside
          className="store-personal-hint store-personal-hint--compact"
          aria-label="پیشنهادهای مخصوص شما"
        >
          <p>پیشنهادهای مرتبط با شما دریافت نشد.</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            تلاش دوباره
          </button>
        </aside>
        {fallback}
      </>
    );
  if (!data) return <StoreGridLoading />;
  if (data.status === 'READY' && data.items.length > 0)
    return (
      <>
        <section className="store-personal" aria-label="محصولات مرتبط با مزاج شما">
          <div className="store-personal__intro">
            <Leaf size={18} aria-hidden="true" />
            <p>
              بر اساس نتیجهٔ ارزیابی شما
              {data.primary && data.secondary
                ? `؛ مزاج اول ${labels[data.primary]}، مزاج دوم ${labels[data.secondary]}`
                : ''}
            </p>
            <Link href="/mezaj">مشاهدهٔ نتیجه</Link>
          </div>
          <h2 id="store-personal-products">محصولات مرتبط با شما</h2>

          <div className={gridClassName}>
            {(expanded ? data.items : data.items.slice(0, 4)).map(renderProduct)}
          </div>

          {data.items.length > 4 && (
            <button
              type="button"
              className="patient-button"
              aria-expanded={expanded}
              onClick={() => {
                saveExpansion(browseKey, !expanded);
                setExpanded(!expanded);
              }}
            >
              {expanded ? 'نمایش کمتر' : 'نمایش پیشنهادهای بیشتر'}
            </button>
          )}
        </section>
        {fallback}
      </>
    );
  const missing = data.status === 'NO_RESULT';
  if (!missing && data.status !== 'REVIEW_REQUIRED') return fallback;
  return (
    <>
      <aside
        className="store-personal-hint store-personal-hint--compact"
        aria-label="پیشنهادهای مخصوص شما"
      >
        <Leaf size={19} aria-hidden="true" />
        <p>
          {missing
            ? 'برای دیدن محصولات مرتبط با مزاجت، ارزیابی‌ات را کامل کن.'
            : 'برای پیشنهاد محصولات مرتبط، نتیجهٔ ارزیابی شما به بررسی متخصص نیاز دارد.'}
        </p>
        {missing && <Link href="/assessment">شروع ارزیابی</Link>}
      </aside>
      {fallback}
    </>
  );
}
