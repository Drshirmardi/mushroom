"use client";
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { usePatientResource } from '@/lib/use-patient-resource';
import { listEducationalAssessmentOfferings } from '@/lib/digital-services-api';
import { formatRial } from '@/lib/wallet-money';
import { canStartCoupleTest, coupleStartHref } from '@/lib/couples-flow';





export function MarriageOffers({ hideHistoryLink = false }: { hideHistoryLink?: boolean } = {}) {
  const { authentication } = useAuthSession();
  const [page, setPage] = useState(1);
  const resource = usePatientResource(
    useCallback(
      () => listEducationalAssessmentOfferings(authentication.accessToken, page, 'COUPLES', 'MARRIAGE'),
      [authentication.accessToken, page],
    ),
  );

  const available = resource.data?.items.filter(canStartCoupleTest) ?? [];
  return (
    <section aria-label="انتخاب تست دو نفره" className="space-y-4">
      <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />

      {resource.data && available.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-sm leading-7 text-muted-foreground">
          فعلاً تست جدیدی برای شروع در دسترس نیست.
        </p>
      )}

      <div className="grid gap-3.5">
        {available.map(item => (
          <Link
            key={item.id}
            href={coupleStartHref(item.id)}
            className="group block min-w-0 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs transition-all hover:border-primary/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
          >
            <div className="flex items-start gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <HeartHandshake aria-hidden="true" size={22} />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <span className="inline-flex items-center rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  دو نفره · دعوت با شماره موبایل
                </span>
                <h2 className="text-base font-bold leading-8 text-foreground">{item.title}</h2>
                <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
                  هر نفر جداگانه پاسخ می‌دهد؛ برای دعوت فقط شماره موبایل نفر دوم رو لازم داری.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3.5">
              <span className="text-sm font-bold text-foreground">
                {item.priceMode === 'FREE'
                  ? 'رایگان'
                  : formatRial(BigInt(item.amountRial ?? '0')) + ' تومان برای هر دو نفر'}
              </span>
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-white sm:text-sm">
                انتخاب و ادامه
                <ArrowLeft aria-hidden="true" size={16} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!hideHistoryLink && (
        <Link
          href="/assessment/couples?history=1"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          همه دعوت‌ها و سوابق
          <ArrowLeft aria-hidden="true" size={16} />
        </Link>
      )}

      {resource.data && (
        <PatientPagination page={page} total={resource.data.total} onChange={setPage} />
      )}
    </section>
  );
}

