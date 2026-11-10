'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, HeartHandshake } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { usePatientResource } from '@/lib/use-patient-resource';
import { listMarriageRequests, type MarriageRequest } from '@/lib/marriage-api';
import { prioritizeCoupleRequests, selectedCoupleTest } from '@/lib/couples-flow';
import { classifyCoupleRequests, coupleRequestStatus } from '@/lib/couples-overview';
import { MarriageNew, MarriageOffers } from './marriage-service';

function RequestLink({ item, primary = false }: { item: MarriageRequest; primary?: boolean }) {
  const label =
    item.status === 'PENDING' && !item.isInitiator ? 'بررسی دعوت'
      : item.status === 'PENDING' ? 'مشاهده لینک دعوت'
      : item.status === 'ACCEPTED' ? 'مشاهده و ادامه تست'
      : 'مشاهده جزئیات';

  const statusTone =
    item.status === 'PENDING' && !item.isInitiator
      ? 'bg-primary/10 text-primary'
      : item.status === 'PENDING'
        ? 'bg-amber-50 text-amber-800'
        : item.status === 'ACCEPTED'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-muted text-muted-foreground';

  return (
    <Link
      href={item.invitationPath}
      className={[
        'group block min-w-0 rounded-2xl border p-4 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5',
        primary ? 'border-primary/30 bg-primary/5' : 'border-border/80 bg-white',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold leading-7 text-foreground">{item.service.title}</h3>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-6 ${statusTone}`}>
          {coupleRequestStatus(item)}
        </span>
      </div>
      {item.status === 'PENDING' && !item.isInitiator && (
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {item.initiatorName
            ? item.initiatorName + ' تو رو به این تست دعوت کرده.'
            : 'برای شرکت در این تست دعوت شدی.'}
        </p>
      )}
      {item.isInitiator && item.recipientPhoneMasked && (
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          نفر دوم: <bdi dir="ltr">{item.recipientPhoneMasked}</bdi>
        </p>
      )}
      <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <span className="text-xs text-muted-foreground">
          {item.isInitiator ? 'دعوت ارسالی' : 'دعوت دریافتی'}
          {' · '}
          {new Date(item.createdAt).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' })}
        </span>
        <span className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">
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
  const { incoming, active } = classifyCoupleRequests(ordered);
  const showActiveSection = resource.loading || Boolean(resource.error) || incoming.length > 0 || active.length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-7">
      {showActiveSection && (
        <section aria-label="تست‌ها و دعوت‌های من" className="space-y-3">
          <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />
          {incoming.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-base font-bold">دعوت جدید داری</h2>
              {incoming.slice(0, 3).map(item => <RequestLink key={item.id} item={item} primary />)}
            </div>
          )}
          {active.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-base font-bold">تست‌ها و دعوت‌های من</h2>
              {active.slice(0, 3).map(item => <RequestLink key={item.id} item={item} />)}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="couple-test-offers-title" className="space-y-3">
        <h2 id="couple-test-offers-title" className="text-base font-semibold">تست‌ها</h2>
        <MarriageOffers hideHistoryLink />
      </section>

      <details
        open={historyOpen}
        onToggle={event => setHistoryOpen(event.currentTarget.open)}
        className="group rounded-2xl border border-border/70 bg-white px-4 py-2"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          <span>همه دعوت‌ها و سوابق</span>
          <ChevronDown aria-hidden="true" size={17} className="text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-2 border-t border-border/60 pb-3 pt-3">
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
      description={
        selected
          ? selected.replacesId
            ? 'شماره موبایل جدید نفر دوم رو وارد کن تا لینک دعوت جایگزین ساخته بشه.'
            : 'ابتدا هزینهٔ تست رو پرداخت کن و بعد لینک دعوت نفر دوم رو بساز.'
          : 'تستت رو انتخاب کن یا تست‌های قبلیت رو ادامه بده.'
      }
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
