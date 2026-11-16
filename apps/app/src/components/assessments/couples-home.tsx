'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  HeartHandshake,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { LoadingState } from '@/components/shared/skeletons';
import { usePatientResource } from '@/lib/use-patient-resource';
import { listMarriageRequests, type MarriageRequest } from '@/lib/marriage-api';
import { prioritizeCoupleRequests, selectedCoupleTest } from '@/lib/couples-flow';
import { classifyCoupleRequests, coupleRequestStatus } from '@/lib/couples-overview';
import dynamic from 'next/dynamic';
import { MarriageOffers } from './marriage-offers';

const MarriageNew = dynamic(() => import('./marriage-new').then((m) => m.MarriageNew), {
  loading: () => <LoadingState variant="detail" />,
});

function RequestLink({ item, primary = false }: { item: MarriageRequest; primary?: boolean }) {
  const label =
    item.status === 'PENDING' && !item.isInitiator
      ? 'بررسی و پاسخ به دعوت'
      : item.status === 'PENDING'
        ? 'مشاهده لینک دعوت'
        : item.status === 'ACCEPTED'
          ? 'مشاهده و ادامه تست'
          : 'مشاهده جزئیات';

  const statusTone =
    item.status === 'PENDING' && !item.isInitiator
      ? 'bg-primary/12 text-primary ring-1 ring-primary/20'
      : item.status === 'PENDING'
        ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80'
        : item.status === 'ACCEPTED'
          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
          : 'bg-muted text-muted-foreground';

  const StatusIcon =
    item.status === 'PENDING' && !item.isInitiator
      ? Mail
      : item.status === 'ACCEPTED'
        ? CheckCircle2
        : Clock;

  return (
    <Link
      href={item.invitationPath}
      className={[
        'group block min-w-0 rounded-2xl border p-4 shadow-2xs transition-all hover:border-primary/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5',
        primary
          ? 'border-primary/35 bg-gradient-to-l from-primary/8 via-primary/4 to-white'
          : 'border-border/80 bg-white',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1 space-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {item.isInitiator ? 'دعوت ارسالی' : 'دعوت دریافتی'}
            {' · '}
            {new Date(item.createdAt).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' })}
          </span>
          <h3 className="min-w-0 text-sm font-bold leading-7 text-foreground sm:text-base">
            {item.service.title}
          </h3>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone}`}
        >
          <StatusIcon size={13} aria-hidden="true" />
          {coupleRequestStatus(item)}
        </span>
      </div>

      {item.status === 'PENDING' && !item.isInitiator && (
        <p className="mt-2.5 rounded-xl bg-white/80 px-3 py-2 text-xs leading-6 text-foreground ring-1 ring-border/60 sm:text-sm">
          {item.initiatorName
            ? item.initiatorName + ' تو رو به این تست دعوت کرده.'
            : 'برای شرکت در این تست دعوت شدی.'}
        </p>
      )}

      {item.isInitiator && item.recipientPhoneMasked && (
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          نفر دوم:{' '}
          <bdi dir="ltr" className="font-medium text-foreground">
            {item.recipientPhoneMasked}
          </bdi>
        </p>
      )}

      <div className="mt-3.5 flex min-h-10 flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="text-xs text-muted-foreground">
          {item.status === 'ACCEPTED'
            ? 'آماده ادامه در فضای مشترک'
            : item.isInitiator
              ? 'مدیریت لینک و وضعیت دعوت'
              : 'بدون نیاز به پرداخت مجدد'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary transition-transform group-hover:-translate-x-0.5 sm:text-sm">
          {label}
          <ArrowLeft aria-hidden="true" size={16} />
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
  useEffect(() => {
    if (showHistory) setHistoryOpen(true);
  }, [showHistory]);

  const ordered = prioritizeCoupleRequests(resource.data?.items ?? []);
  const { incoming, active } = classifyCoupleRequests(ordered);
  const showActiveSection =
    resource.loading || Boolean(resource.error) || incoming.length > 0 || active.length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-7">
      {showActiveSection && (
        <section aria-label="تست‌ها و دعوت‌های من" className="space-y-4">
          <PatientResourceState
            variant="detail"
            {...resource}
            retry={() => void resource.reload()}
          />
          {incoming.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-primary" />
                <h2 className="text-sm font-bold text-foreground sm:text-base">دعوت جدید داری</h2>
              </div>
              <div className="grid gap-3">
                {incoming.slice(0, 3).map((item) => (
                  <RequestLink key={item.id} item={item} primary />
                ))}
              </div>
            </div>
          )}
          {active.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-sm font-bold text-foreground sm:text-base">
                تست‌ها و دعوت‌های فعال من
              </h2>
              <div className="grid gap-3">
                {active.slice(0, 3).map((item) => (
                  <RequestLink key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="couple-test-offers-title" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="couple-test-offers-title" className="text-sm font-bold text-foreground sm:text-base">
            انتخاب تست دو نفره جدید
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <Sparkles size={13} aria-hidden="true" />
            پاسخ‌گویی مستقل
          </span>
        </div>
        <MarriageOffers hideHistoryLink />
      </section>

      <details
        open={historyOpen}
        onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
        className="group rounded-2xl border border-border/80 bg-white px-4 py-2 shadow-2xs"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>همه دعوت‌ها و سوابق</span>
          <ChevronDown
            aria-hidden="true"
            size={18}
            className="text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="space-y-3 border-t border-border/60 pt-3 pb-3">
          {resource.data?.total === 0 && (
            <p className="rounded-xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              هنوز دعوتی ثبت نشده.
            </p>
          )}
          <div className="grid gap-3">
            {ordered.map((item) => (
              <RequestLink key={item.id} item={item} />
            ))}
          </div>
          {resource.data && (
            <PatientPagination page={page} total={resource.data.total} onChange={setPage} />
          )}
          <div className="border-t border-border/50 pt-2">
            <Link
              href="/assessment/couples/legacy"
              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary sm:text-sm"
            >
              سوابق قدیمی دو نفره
              <ArrowLeft aria-hidden="true" size={15} />
            </Link>
          </div>
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
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <Link
            href="/assessment/couples"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:text-sm"
          >
            <ArrowRight aria-hidden="true" size={16} />
            بازگشت به فهرست تست‌های دو نفره
          </Link>
          <MarriageNew
            key={selected.publicationId + ':' + (selected.replacesId ?? '')}
            publicationId={selected.publicationId}
            replacesId={selected.replacesId}
          />
        </div>
      ) : search.has('start') || search.has('replaceRequestId') ? (
        <div
          role="alert"
          className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm leading-7 text-amber-950"
        >
          <p className="font-medium">
            لینک انتخاب تست معتبر نیست. از فهرست تست‌ها یکی رو انتخاب کن.
          </p>
          <Link
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-primary shadow-2xs ring-1 ring-border hover:bg-primary/5"
            href="/assessment/couples"
          >
            مشاهده تست‌ها
            <ArrowLeft size={15} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <CouplesOverview showHistory={search.get('history') === '1'} />
      )}
    </ServicePage>
  );
}
