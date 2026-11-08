import Link from 'next/link';
import { ArrowLeft, BookOpenText, Clock3 } from 'lucide-react';

import { listProgramOfferings } from '@/lib/digital-services-api';
import { formatRialWithUnit } from '@/lib/wallet-money';
import { toP } from '@/lib/format';

type ProgramOffering = Awaited<ReturnType<typeof listProgramOfferings>>['items'][number];

type Props = {
  item: ProgramOffering;
};

export function EducationProgramCard({ item }: Props) {
  const amount = BigInt(item.amountRial);

  const baseAmount = item.baseAmountRial ? BigInt(item.baseAmountRial) : null;

  const discounted = baseAmount !== null && baseAmount > amount;

  const price = amount === BigInt(0) ? 'رایگان' : formatRialWithUnit(amount);

  const originalPrice = discounted && baseAmount !== null ? formatRialWithUnit(baseAmount) : null;

  const accessLabel =
    item.accessMode === 'PERPETUAL'
      ? 'دسترسی بدون محدودیت زمانی'
      : item.accessDurationDays != null
        ? `دسترسی ${toP(item.accessDurationDays)} روزه`
        : 'دسترسی مدت‌دار';

  return (
    <Link
      href={`/programs/offerings/${encodeURIComponent(item.id)}`}
      className="
        group relative flex h-full min-w-0
        flex-col overflow-hidden rounded-[22px]
        border border-border/70 bg-background
        p-4 shadow-sm
        transition-[border-color,box-shadow,transform]
        duration-200
        hover:-translate-y-0.5
        hover:border-primary/30
        hover:shadow-md
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-primary
        sm:p-5
      "
    >
      {/* Top row */}
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="
            flex size-11 shrink-0 items-center
            justify-center rounded-2xl
            border border-primary/10
            bg-gradient-to-br
            from-primary/15 to-primary/5
            text-primary
          "
        >
          <BookOpenText size={21} strokeWidth={1.8} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {item.category || 'برنامه سلامت'}
            </span>

            {discounted && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                قیمت ویژه
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 break-words text-[15px] font-extrabold leading-7 tracking-tight text-foreground">
            {item.title}
          </h3>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 min-w-0 flex-1">
        {item.summary ? (
          <p className="line-clamp-2 break-words text-[13px] leading-7 text-muted-foreground">
            {item.summary}
          </p>
        ) : (
          <p className="text-[13px] leading-7 text-muted-foreground">
            جزئیات، شرایط استفاده و محتوای این برنامه را بررسی کنید.
          </p>
        )}
      </div>

      {/* Access type */}
      <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock3 size={14} aria-hidden="true" />
        <span>{accessLabel}</span>
      </div>

      {/* Price and action */}
      <div className="mt-4 flex min-w-0 items-end justify-between gap-3 border-t border-border/60 pt-4">
        <div className="min-w-0 space-y-1">
          <span className="block text-[11px] text-muted-foreground">هزینه دریافت</span>

          {originalPrice && (
            <del className="block break-words text-xs text-muted-foreground/70">
              {originalPrice}
            </del>
          )}

          <strong className="block break-words text-[15px] font-extrabold leading-7 text-primary">
            {price}
          </strong>
        </div>

        <span
          className="
            flex size-10 shrink-0 items-center
            justify-center rounded-xl
            bg-primary/10 text-primary
            transition-colors duration-200
            group-hover:bg-primary
            group-hover:text-primary-foreground
          "
          aria-hidden="true"
        >
          <ArrowLeft
            size={19}
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
