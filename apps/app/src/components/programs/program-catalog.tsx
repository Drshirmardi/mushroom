'use client';

import { useCallback, useMemo, useState } from 'react';
import { BookOpenText, FileHeart, Search } from 'lucide-react';

import { ServiceEmpty, ServiceSection } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';

import { ProgramCard } from './program-card';

import { listProgramOfferings, listCustomOfferings } from '@/lib/digital-services-api';

import { usePatientResource } from '@/lib/use-patient-resource';
import { toP } from '@/lib/format';

type Props = {
  token: string;
  kind: 'education' | 'custom';
};

function CatalogSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">جست‌وجو در نتایج صفحه جاری</span>

        <Search
          size={19}
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />

        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="جست‌وجوی برنامه در این صفحه..."
          className="
            min-h-12 w-full min-w-0
            rounded-2xl border border-border
            bg-background py-3 pl-4 pr-11
            text-sm text-foreground
            outline-none transition-colors
            placeholder:text-muted-foreground
            focus:border-primary
            focus:ring-2 focus:ring-primary/10
          "
        />
      </label>

      <p className="text-[11px] leading-5 text-muted-foreground">
        جست‌وجو فعلاً در نتایج همین صفحه انجام می‌شود.
      </p>
    </div>
  );
}

function EducationCatalog({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const resource = usePatientResource(
    useCallback(() => listProgramOfferings(token, page), [token, page]),
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fa-IR');

    if (!query) return resource.data?.items ?? [];

    return (resource.data?.items ?? []).filter((item) => {
      const haystack = [item.title, item.summary, item.category]
        .join(' ')
        .toLocaleLowerCase('fa-IR');

      return haystack.includes(query);
    });
  }, [resource.data, search]);

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    setSearch('');
  };

  return (
    <div className="min-w-0 space-y-5">
      <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3">
        <p className="text-xs leading-7 text-muted-foreground">
          این برنامه‌ها برای آگاهی و آموزش هستند و جایگزین تشخیص یا درمان تخصصی محسوب نمی‌شوند.
          شرایط استفاده و مدت دسترسی را پیش از دریافت بررسی کنید.
        </p>
      </div>

      <ServiceSection
        title="برنامه‌های آموزشی"
        description="مطالب و برنامه‌های منتشرشده را بررسی کنید."
      >
        <CatalogSearch value={search} onChange={setSearch} />

        {resource.data && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{toP(resource.data.total)} برنامه در فهرست</span>

            <span>صفحه {toP(page)}</span>
          </div>
        )}

        <PatientResourceState {...resource} retry={() => void resource.reload()} />

        {resource.data && filtered.length > 0 && (
          <div className="grid min-w-0 grid-cols-1 gap-3">
            {filtered.map((item) => {
              const accessLabel =
                item.accessMode === 'PERPETUAL'
                  ? 'دسترسی بدون محدودیت زمانی'
                  : item.accessDurationDays != null
                    ? `دسترسی ${toP(item.accessDurationDays)} روزه`
                    : 'دسترسی مدت‌دار';

              return (
                <ProgramCard
                  key={item.id}
                  variant="education"
                  href={`/programs/offerings/${encodeURIComponent(item.id)}`}
                  title={item.title}
                  summary={item.summary}
                  meta={`${item.category} · ${accessLabel}`}
                  priceRial={item.amountRial}
                  basePriceRial={item.baseAmountRial}
                  actionLabel="مشاهده جزئیات و شرایط"
                />
              );
            })}
          </div>
        )}

        {resource.data?.items.length === 0 && (
          <ServiceEmpty
            icon={BookOpenText}
            title="فعلاً برنامه آموزشی فعالی وجود ندارد"
            description="برنامه‌های جدید پس از انتشار در این بخش نمایش داده می‌شوند."
          />
        )}

        {resource.data && resource.data.items.length > 0 && filtered.length === 0 && (
          <ServiceEmpty
            icon={Search}
            title="نتیجه‌ای در این صفحه پیدا نشد"
            description="عبارت جست‌وجو را تغییر دهید یا صفحه دیگری از فهرست را بررسی کنید."
          />
        )}

        {resource.data && (
          <div className="pt-3">
            <PatientPagination page={page} total={resource.data.total} onChange={changePage} />
          </div>
        )}
      </ServiceSection>
    </div>
  );
}

function CustomCatalog({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const resource = usePatientResource(
    useCallback(() => listCustomOfferings(token, page), [token, page]),
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fa-IR');

    if (!query) return resource.data?.items ?? [];

    return (resource.data?.items ?? []).filter((item) => {
      const haystack = [item.title, item.summary, item.category, item.physician.displayName]
        .join(' ')
        .toLocaleLowerCase('fa-IR');

      return haystack.includes(query);
    });
  }, [resource.data, search]);

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    setSearch('');
  };

  return (
    <div className="min-w-0 space-y-5">
      <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3">
        <p className="text-xs leading-7 text-muted-foreground">
          خدمات اختصاصی تحت بررسی متخصص ارائه می‌شوند. ثبت درخواست به معنی صدور برنامه درمانی یا
          پرداخت نهایی نیست؛ مراحل بعدی و شرایط استفاده در صفحه هر خدمت توضیح داده می‌شوند.
        </p>
      </div>

      <ServiceSection
        title="خدمات اختصاصی"
        description="خدمات قابل درخواست و متخصص مربوط به هر خدمت را ببینید."
      >
        <CatalogSearch value={search} onChange={setSearch} />

        {resource.data && (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{toP(resource.data.total)} خدمت در فهرست</span>

            <span>صفحه {toP(page)}</span>
          </div>
        )}

        <PatientResourceState {...resource} retry={() => void resource.reload()} />

        {resource.data && filtered.length > 0 && (
          <div className="grid min-w-0 grid-cols-1 gap-3">
            {filtered.map((item) => (
              <ProgramCard
                key={item.id}
                variant="custom"
                href={`/programs/custom-offerings/${encodeURIComponent(item.id)}`}
                title={item.title}
                summary={item.summary}
                meta={`${item.category} · متخصص: ${item.physician.displayName}`}
                priceRial={item.amountRial}
                status={
                  !item.requestSupported
                    ? {
                        label: 'درخواست فعلاً غیرفعال',
                        tone: 'warning',
                      }
                    : undefined
                }
                actionLabel="مشاهده خدمت و مراحل درخواست"
              />
            ))}
          </div>
        )}

        {resource.data?.items.length === 0 && (
          <ServiceEmpty
            icon={FileHeart}
            title="خدمت اختصاصی فعالی وجود ندارد"
            description="در حال حاضر درخواست خدمت اختصاصی جدید در دسترس نیست. می‌توانید خدمات مشاوره را بررسی کنید."
            href="/appointments/book"
            action="رزرو مشاوره"
          />
        )}

        {resource.data && resource.data.items.length > 0 && filtered.length === 0 && (
          <ServiceEmpty
            icon={Search}
            title="خدمتی در این صفحه پیدا نشد"
            description="عبارت جست‌وجو را تغییر دهید یا صفحه دیگری را بررسی کنید."
          />
        )}

        {resource.data && (
          <div className="pt-3">
            <PatientPagination page={page} total={resource.data.total} onChange={changePage} />
          </div>
        )}
      </ServiceSection>
    </div>
  );
}

export function ProgramCatalog({ token, kind }: Props) {
  if (kind === 'education') {
    return <EducationCatalog token={token} />;
  }

  return <CustomCatalog token={token} />;
}
