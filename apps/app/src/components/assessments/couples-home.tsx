'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { usePatientResource } from '@/lib/use-patient-resource';
import { listMarriageRequests, type MarriageRequest } from '@/lib/marriage-api';
import { prioritizeCoupleRequests, selectedCoupleTest } from '@/lib/couples-flow';
import { MarriageNew, MarriageOffers } from './marriage-service';

function RequestLink({ item, primary = false }: { item: MarriageRequest; primary?: boolean }) {
  const label =
    item.status === 'PENDING' && !item.isInitiator ? 'بررسی دعوت'
      : item.status === 'PENDING' ? 'مشاهده لینک دعوت'
      : item.status === 'ACCEPTED' ? 'مشاهده تست'
      : 'مشاهده جزئیات';
  const status =
    item.status === 'PENDING' && !item.isInitiator ? 'منتظر پاسخ شما'
      : item.status === 'PENDING' ? 'منتظر پاسخ نفر دوم'
      : item.status === 'ACCEPTED' ? 'دعوت پذیرفته شده'
      : item.status === 'CANCELLED' ? 'لغو شده'
      : 'جایگزین شده';
  return (
    <Link
      href={item.invitationPath}
      className={'block rounded-xl border p-4 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
        (primary ? 'border-primary/30 bg-primary/5' : 'border-border/80 bg-white')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold leading-7">{item.service.title}</h3>
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
      <div className="mt-2 flex min-h-11 items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{item.isInitiator ? 'دعوت ارسالی' : 'دعوت دریافتی'}</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {label}<ArrowLeft aria-hidden="true" size={16} />
        </span>
      </div>
    </Link>
  );
}

function CouplesOverview({ showHistory }: { showHistory: boolean }) {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const [page, setPage] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(showHistory);
  const resource = usePatientResource(
    useCallback(() => listMarriageRequests(token, page), [token, page]),
  );
  useEffect(() => { if (showHistory) setHistoryOpen(true); }, [showHistory]);
  const ordered = prioritizeCoupleRequests(resource.data?.items ?? []);
  const incoming = ordered.filter(row => row.status === 'PENDING' && !row.isInitiator);
  const active = ordered.filter(row => row.status === 'ACCEPTED' || row.status === 'PENDING' && row.isInitiator);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-7">
      <section aria-label="دعوت‌ها و تست‌های من" className="space-y-3">
        <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />
        {incoming.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-base font-semibold">دعوت جدید داری</h2>
            {incoming.slice(0, 3).map(item => <RequestLink key={item.id} item={item} primary />)}
          </div>
        )}
        {active.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-base font-semibold">پیگیری تست‌ها و دعوت‌ها</h2>
            {active.slice(0, 3).map(item => <RequestLink key={item.id} item={item} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="couple-test-offers-title" className="space-y-3">
        <h2 id="couple-test-offers-title" className="text-base font-semibold">تست‌ها</h2>
        <MarriageOffers hideHistoryLink />
      </section>

      <details
        open={historyOpen}
        onToggle={event => setHistoryOpen(event.currentTarget.open)}
        className="border-t border-border/70 pt-3"
      >
        <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-medium text-foreground">
          همه دعوت‌ها و سوابق
          <ArrowLeft aria-hidden="true" size={16} className="text-muted-foreground" />
        </summary>
        <div className="space-y-2 pb-3 pt-3">
          {resource.data?.total === 0 && <p className="text-sm text-muted-foreground">هنوز دعوتی ثبت نشده.</p>}
          {ordered.map(item => <RequestLink key={item.id} item={item} />)}
          {resource.data && <PatientPagination page={page} total={resource.data.total} onChange={setPage} />}
          <Link
            href="/assessment/couples/legacy"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            سوابق قدیمی دو نفره
            <ArrowLeft aria-hidden="true" size={16} />
          </Link>
        </div>
      </details>
    </div>
  );
}

export function CouplesHome() {
  const router = useRouter();
  const search = useSearchParams();
  const selected = selectedCoupleTest(search);
  const legacy = search.get('publicationId');
  useEffect(() => {
    if (legacy && /^[a-f0-9-]{36}$/i.test(legacy)) {
      router.replace('/assessment/couples/legacy?publicationId=' + encodeURIComponent(legacy));
    }
  }, [legacy, router]);

  return (
    <ServicePage
      title="تست دو نفره"
      description={selected ? 'نقش خودت و شماره نفر دوم رو وارد کن.' : 'تستت رو انتخاب کن یا تست‌های قبلیت رو ادامه بده.'}
      icon={HeartHandshake}
      backHref="/assessment"
      backLabel="همه تست‌ها"
    >
      {selected ? (
        <div className="mx-auto w-full max-w-2xl space-y-3">
          <Link
            href="/assessment/couples"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            بازگشت به تست‌ها
            <ArrowLeft aria-hidden="true" size={16} />
          </Link>
          <MarriageNew
            key={selected.publicationId + ':' + (selected.replacesId ?? '')}
            publicationId={selected.publicationId}
            replacesId={selected.replacesId}
          />
        </div>
      ) : search.has('start') || search.has('replaceRequestId') ? (
        <p role="alert" className="mx-auto max-w-2xl rounded-xl border border-border p-4 text-sm">
          لینک انتخاب تست معتبر نیست. از فهرست تست‌ها یکی رو انتخاب کن.
          <Link className="mr-2 text-primary underline" href="/assessment/couples">مشاهده تست‌ها</Link>
        </p>
      ) : (
        <CouplesOverview showHistory={search.get('history') === '1'} />
      )}
    </ServicePage>
  );
}
