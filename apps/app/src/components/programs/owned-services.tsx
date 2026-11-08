'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

import { LoadingState } from '@/components/shared/skeletons';
import { useAuthSession } from '@/components/auth/session-gate';

import { getOwnedServices } from '@/lib/mezaj-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';

import { OwnedServiceCard } from './service-card';

const PAGE_SIZE = 6;

export function OwnedServices() {
  const { authentication } = useAuthSession();
  const [page, setPage] = useState(1);

  const resource = usePatientResource(
    useCallback(
      () => getOwnedServices(authentication.accessToken, page, PAGE_SIZE),
      [authentication.accessToken, page],
    ),
  );

  // Keep the original behavior: hide the section
  // when the user has no purchased services.
  if (!resource.loading && !resource.error && !resource.data?.total) {
    return null;
  }

  const total = resource.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const hasPagination = total > PAGE_SIZE;

  const canGoPrevious = page > 1 && !resource.loading;

  const canGoNext = page < totalPages && !resource.loading;

  return (
    <section aria-label="خدمات من" className="@container w-full min-w-0 text-start">
      {/* Section heading */}
      <header className="mb-4">
        <h2
          className="
            text-base font-bold leading-7
            text-foreground
            @sm:text-lg
          "
        >
          خدمات من
        </h2>

        <p
          className="
            mt-1 text-xs leading-6
            text-muted-foreground
            @sm:text-sm
          "
        >
          محتواهایی که تهیه کرده‌اید، همیشه از اینجا دردسترس هستند.
        </p>
      </header>

      {/* Loading state */}
      {resource.loading ? (
        <LoadingState label="در حال دریافت خدمات شما…" variant="list" />
      ) : resource.error ? (
        /* Error state */
        <div
          role="alert"
          className="
            rounded-xl border border-border
            bg-muted/50 p-4
            text-sm leading-7 text-muted-foreground
          "
        >
          <p>خدمات شما دریافت نشد.</p>

          <button
            type="button"
            onClick={() => void resource.reload()}
            className="
              mt-3 inline-flex min-h-11
              items-center justify-center
              rounded-lg border border-border
              bg-card px-4 py-2
              text-sm font-semibold text-primary
              transition-colors
              hover:bg-muted
              focus-visible:outline-2
              focus-visible:outline-offset-2
              focus-visible:outline-primary
            "
          >
            تلاش دوباره
          </button>
        </div>
      ) : (
        /* Responsive owned services grid */
        <div
          className="
            grid w-full min-w-0
            grid-cols-1 gap-3
            @lg:grid-cols-2
            @2xl:grid-cols-3
          "
        >
          {resource.data?.items.map((item) => (
            <div key={item.accessGrantId} className="min-w-0">
              <OwnedServiceCard item={item} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasPagination && (
        <nav
          aria-label="صفحه‌های خدمات من"
          className="
            mt-4 flex min-w-0 flex-wrap
            items-center justify-between gap-3
            border-t border-border/70 pt-4
          "
        >
          <button
            type="button"
            disabled={!canGoPrevious}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="
              inline-flex min-h-11 items-center
              justify-center gap-1.5
              rounded-xl border border-border
              bg-card px-3 py-2
              text-xs font-semibold
              text-foreground
              transition-colors
              hover:bg-muted
              disabled:cursor-not-allowed
              disabled:opacity-40
              focus-visible:outline-2
              focus-visible:outline-offset-2
              focus-visible:outline-primary
            "
          >
            <ChevronRight size={16} aria-hidden="true" />
            قبلی
          </button>

          <span
            aria-live="polite"
            className="
              text-xs font-medium
              text-muted-foreground
              tabular-nums
            "
          >
            صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
          </span>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="
              inline-flex min-h-11 items-center
              justify-center gap-1.5
              rounded-xl border border-border
              bg-card px-3 py-2
              text-xs font-semibold
              text-foreground
              transition-colors
              hover:bg-muted
              disabled:cursor-not-allowed
              disabled:opacity-40
              focus-visible:outline-2
              focus-visible:outline-offset-2
              focus-visible:outline-primary
            "
          >
            بعدی
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        </nav>
      )}

      {/* View all purchased services */}
      <Link
        href="/programs?view=mine"
        className="
          group mt-4 inline-flex min-h-11
          items-center justify-center gap-2
          rounded-xl px-3 py-2
          text-sm font-semibold text-primary
          transition-colors
          hover:bg-primary/5
          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-primary
        "
      >
        همهٔ خریدها و وضعیت دسترسی
        <ArrowLeft
          size={16}
          aria-hidden="true"
          className="
            shrink-0 transition-transform
            group-hover:-translate-x-1
          "
        />
      </Link>
    </section>
  );
}
