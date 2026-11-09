'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { MarriageNew, MarriageOffers } from '@/components/assessments/marriage-service';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { listMarriageRequests } from '@/lib/marriage-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { classifyCoupleRequests, coupleRequestStatus } from '@/lib/couples-overview';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const card = 'block min-w-0 rounded-2xl border border-border/80 bg-white p-4 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5';

function CoupleRequests() {
  const { authentication } = useAuthSession();
  const [page, setPage] = useState(1);
  const resource = usePatientResource(
    useCallback(() => listMarriageRequests(authentication.accessToken, page), [authentication.accessToken, page]),
  );
  const groups = classifyCoupleRequests(resource.data?.items ?? []);
  const showHistory = groups.history.length > 0;

  return (
    <section aria-label="تست‌ها و دعوت‌های من" className="space-y-4">
      <PatientResourceState {...resource} retry={() => void resource.reload()} />
      {groups.incoming.length > 0 && (
        <section className="space-y-2" aria-label="دعوت‌های منتظر پاسخ">
          <h2 className="text-base font-bold text-foreground">دعوت جدید داری</h2>
          {groups.incoming.map(item => (
            <Link href={item.invitationPath} key={item.id} className={card + ' border-primary/30 bg-primary/5'}>
              <span className="block text-sm font-semibold text-foreground">{item.service.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {item.initiatorName ? item.initiatorName + ' تو رو به این تست دعوت کرده.' : 'برای شرکت در این تست دعوت شدی.'}
              </span>
              <span className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
                بررسی دعوت <ArrowLeft size={17} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </section>
      )}

      {groups.active.length > 0 && (
        <section className="space-y-2" aria-label="تست‌های در جریان">
          <h2 className="text-base font-bold text-foreground">تست‌ها و دعوت‌های من</h2>
          {groups.active.map(item => (
            <Link href={item.invitationPath} key={item.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-sm font-semibold leading-7 text-foreground">{item.service.title}</span>
                <span className="text-xs text-muted-foreground">{coupleRequestStatus(item)}</span>
              </div>
              {item.isInitiator && item.recipientPhoneMasked && (
                <p className="mt-1 text-xs text-muted-foreground">
                  نفر دوم: <bdi dir="ltr">{item.recipientPhoneMasked}</bdi>
                </p>
              )}
              <span className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
                مشاهده و ادامه <ArrowLeft size={17} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </section>
      )}

      {showHistory && (
        <details className="rounded-2xl border border-border/70 bg-white px-4 py-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-foreground">
            دعوت‌های قبلی
          </summary>
          <div className="space-y-2 border-t border-border/70 py-3">
            {groups.history.map(item => (
              <Link href={item.invitationPath} key={item.id} className="block rounded-xl bg-muted/30 p-3 text-sm">
                <span className="block font-medium">{item.service.title}</span>
                <span className="block text-xs text-muted-foreground">{coupleRequestStatus(item)}</span>
              </Link>
            ))}
          </div>
        </details>
      )}
      {resource.data && <PatientPagination page={page} total={resource.data.total} onChange={setPage} />}
    </section>
  );
}

function CouplesContent() {
  const router = useRouter();
  const search = useSearchParams();
  const testId = search.get('newTestId');
  const replaceId = search.get('replaceRequestId');
  const chosen = testId && uuid.test(testId) ? testId : null;
  const replacement = chosen && replaceId && uuid.test(replaceId) ? replaceId : undefined;

  useEffect(() => {
    const publicationId = search.get('publicationId');
    if (publicationId && uuid.test(publicationId)) {
      router.replace('/assessment/couples/legacy?publicationId=' + encodeURIComponent(publicationId));
    }
  }, [search, router]);

  return (
    <ServicePage
      title="تست دو نفره"
      description={chosen ? 'نقشت رو مشخص کن و نفر دوم رو دعوت کن.' : 'تستت رو انتخاب کن یا تست‌های قبلیت رو ادامه بده.'}
      icon={HeartHandshake}
      backHref="/assessment"
      backLabel="همه تست‌ها"
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {chosen ? (
          <section className="space-y-4" aria-label="دعوت نفر دوم">
            <button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary" onClick={() => router.push('/assessment/couples', { scroll: false })}>
              تغییر تست <ArrowLeft aria-hidden="true" size={16} />
            </button>
            <MarriageNew key={chosen + ':' + (replacement ?? '')} publicationId={chosen} replacesId={replacement} embedded />
          </section>
        ) : (
          <>
            <CoupleRequests />
            <section className="space-y-3">
              <h2 className="text-base font-bold text-foreground">تست‌ها</h2>
              <MarriageOffers onSelect={id => router.push('/assessment/couples?newTestId=' + encodeURIComponent(id), { scroll: false })} />
            </section>
            <details className="border-t border-border/70 pt-3">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground">سوابق و دعوت‌های قدیمی</summary>
              <Link href="/assessment/couples/legacy" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">
                مشاهده سوابق قدیمی <ArrowLeft aria-hidden="true" size={16} />
              </Link>
            </details>
          </>
        )}
      </div>
    </ServicePage>
  );
}

export default function CouplesPage() {
  return <Suspense fallback={<div className="mx-auto max-w-2xl p-6 text-sm text-muted-foreground" role="status">در حال آماده‌سازی تست‌ها…</div>}><CouplesContent /></Suspense>;
}
