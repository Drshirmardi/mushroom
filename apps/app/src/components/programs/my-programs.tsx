'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { BookOpenText, FileHeart, LibraryBig } from 'lucide-react';

import { ServiceEmpty, ServiceSection } from '@/components/shared/service-page';

import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';

import { ProgramCard } from './program-card';

import { listProgramPurchases, listCustomRequests } from '@/lib/digital-services-api';

import { getPurchaseCardInfo, type ProgramStatus } from '@/lib/program-state';

import { usePatientResource } from '@/lib/use-patient-resource';

type Props = {
  token: string;
};

type CustomRequest = Awaited<ReturnType<typeof listCustomRequests>>['items'][number];

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
  }).format(date);
}

function requestStatus(request: CustomRequest): ProgramStatus {
  if (request.clinicalDeliveryAvailable) {
    return {
      label: 'برنامه آماده دریافت',
      tone: 'success',
    };
  }

  if (!request.sourceAvailable) {
    return {
      label: 'نیازمند بررسی',
      tone: 'warning',
    };
  }

  if (request.careAuthorization?.careAuthorized) {
    return {
      label: 'دسترسی متخصص تأیید شده',
      tone: 'success',
    };
  }

  return {
    label: 'درخواست ثبت‌شده',
    tone: 'neutral',
  };
}

export function MyPrograms({ token }: Props) {
  const [purchasePage, setPurchasePage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);

  const purchases = usePatientResource(
    useCallback(() => listProgramPurchases(token, purchasePage), [token, purchasePage]),
  );

  const requests = usePatientResource(
    useCallback(() => listCustomRequests(token, requestPage), [token, requestPage]),
  );

  // Avoid showing the same custom request twice when
  // it appears in both currently loaded collections.
  const visiblePurchases = useMemo(() => {
    const requestIds = new Set(requests.data?.items.map((item) => item.id) ?? []);

    return (purchases.data?.items ?? []).filter(
      (purchase) =>
        !(
          purchase.kind === 'CUSTOM_PROFESSIONAL_PLAN' &&
          purchase.customRequestId &&
          requestIds.has(purchase.customRequestId)
        ),
    );
  }, [purchases.data, requests.data]);

  const hasNoPrograms = purchases.data?.total === 0 && requests.data?.total === 0;

  return (
    <div className="min-w-0 space-y-7">
      {/* Personal library introduction */}
      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-primary">
            <LibraryBig size={21} aria-hidden="true" />
          </span>

          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-bold text-foreground">کتابخانه شخصی شما</h2>

            <p className="text-xs leading-7 text-muted-foreground">
              برنامه‌های دریافت‌شده، پرداخت‌های در حال بررسی و درخواست‌های اختصاصی شما در این قسمت
              قرار می‌گیرند.
            </p>
          </div>
        </div>
      </div>

      {hasNoPrograms && (
        <div className="space-y-4 rounded-2xl border border-dashed border-border p-5 text-center">
          <p className="text-sm font-semibold text-foreground">
            هنوز برنامه‌ای در حساب شما وجود ندارد.
          </p>

          <p className="text-xs leading-7 text-muted-foreground">
            می‌توانید برنامه‌های آموزشی و خدمات اختصاصی موجود را بررسی کنید.
          </p>

          <Link
            href="/programs?view=education"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            مشاهده برنامه‌های آموزشی
          </Link>
        </div>
      )}

      {/* Purchased programs */}
      <ServiceSection
        title="برنامه‌های خریداری‌شده"
        description="دسترسی به محتوای آموزشی و بررسی وضعیت خرید."
      >
        <PatientResourceState {...purchases} retry={() => void purchases.reload()} />

        {purchases.data && (
          <div className="text-xs text-muted-foreground">
            {purchases.data.total.toLocaleString('fa-IR')} خرید در سابقه شما
          </div>
        )}

        {purchases.data && visiblePurchases.length > 0 && (
          <div className="grid min-w-0 grid-cols-1 gap-3">
            {visiblePurchases.map((item) => {
              const presentation = getPurchaseCardInfo(item);
              const createdAt = formatDate(item.createdAt);

              return (
                <ProgramCard
                  key={item.id}
                  variant="owned"
                  href={presentation.href}
                  title={item.title}
                  actionLabel={presentation.actionLabel}
                  status={presentation.status}
                  meta={createdAt ? `تاریخ خرید: ${createdAt}` : undefined}
                />
              );
            })}
          </div>
        )}

        {purchases.data?.items.length === 0 && (
          <ServiceEmpty
            icon={BookOpenText}
            title="هنوز خریدی ثبت نشده"
            description="برنامه‌های خریداری‌شده و وضعیت پرداخت آن‌ها در این بخش نمایش داده می‌شوند."
          />
        )}

        {purchases.data && purchases.data.items.length > 0 && visiblePurchases.length === 0 && (
          <p className="rounded-xl bg-muted/40 p-4 text-xs leading-7 text-muted-foreground">
            خریدهای اختصاصی این صفحه در بخش درخواست‌های اختصاصی نمایش داده شده‌اند.
          </p>
        )}

        {purchases.data && (
          <div className="pt-3">
            <PatientPagination
              page={purchasePage}
              total={purchases.data.total}
              onChange={setPurchasePage}
            />
          </div>
        )}
      </ServiceSection>

      {/* Custom program requests */}
      <ServiceSection
        title="درخواست‌های اختصاصی"
        description="پیگیری درخواست، دسترسی متخصص و تحویل برنامه."
      >
        <PatientResourceState {...requests} retry={() => void requests.reload()} />

        {requests.data && (
          <div className="text-xs text-muted-foreground">
            {requests.data.total.toLocaleString('fa-IR')} درخواست ثبت‌شده
          </div>
        )}

        {requests.data && requests.data.items.length > 0 && (
          <div className="grid min-w-0 grid-cols-1 gap-3">
            {requests.data.items.map((item) => {
              const createdAt = formatDate(item.createdAt);

              return (
                <ProgramCard
                  key={item.id}
                  variant="request"
                  href={`/programs/custom/${encodeURIComponent(item.id)}`}
                  title={item.title}
                  status={requestStatus(item)}
                  meta={[
                    `متخصص: ${item.physician.displayName}`,
                    createdAt ? `ثبت: ${createdAt}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  actionLabel="پیگیری درخواست و برنامه"
                />
              );
            })}
          </div>
        )}

        {requests.data?.items.length === 0 && (
          <ServiceEmpty
            icon={FileHeart}
            title="درخواست اختصاصی ثبت نشده"
            description="برای ثبت درخواست، ابتدا خدمات برنامه اختصاصی را بررسی کنید."
            href="/programs?view=custom"
            action="مشاهده خدمات اختصاصی"
          />
        )}

        {requests.data && (
          <div className="pt-3">
            <PatientPagination
              page={requestPage}
              total={requests.data.total}
              onChange={setRequestPage}
            />
          </div>
        )}
      </ServiceSection>
    </div>
  );
}
