import Link from 'next/link';

import { ArrowLeft, BookOpenText, ClipboardList, FileHeart, LibraryBig } from 'lucide-react';

import { formatRialWithUnit } from '@/lib/wallet-money';

import type { ProgramStatus } from '@/lib/program-state';

type Variant = 'education' | 'custom' | 'owned' | 'request';

type Props = {
  href: string;
  title: string;
  variant: Variant;
  actionLabel: string;

  summary?: string | null;
  meta?: string | null;

  priceRial?: string | null;
  basePriceRial?: string | null;

  status?: ProgramStatus;
};

const variantLabels: Record<Variant, string> = {
  education: 'آموزشی',
  custom: 'اختصاصی',
  owned: 'برنامه من',
  request: 'درخواست اختصاصی',
};

const statusStyles: Record<ProgramStatus['tone'], string> = {
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-red-50 text-red-800',
  neutral: 'bg-muted text-muted-foreground',
};

export function ProgramCard({
  href,
  title,
  variant,
  actionLabel,
  summary,
  meta,
  priceRial,
  basePriceRial,
  status,
}: Props) {
  const Icon =
    variant === 'education'
      ? BookOpenText
      : variant === 'custom'
        ? FileHeart
        : variant === 'owned'
          ? LibraryBig
          : ClipboardList;

  const hasPrice = priceRial !== undefined && priceRial !== null;

  const isFree = hasPrice && BigInt(priceRial) === BigInt(0);

  const currentPrice = hasPrice
    ? isFree
      ? 'رایگان'
      : formatRialWithUnit(BigInt(priceRial))
    : null;

  const discounted = hasPrice && basePriceRial != null && BigInt(basePriceRial) > BigInt(priceRial);

  const oldPrice = discounted ? formatRialWithUnit(BigInt(basePriceRial)) : null;

  return (
    <Link
      href={href}
      className="
        group flex w-full min-w-0 flex-col
        overflow-hidden rounded-2xl
        border border-border/70 bg-background
        p-4 shadow-sm
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-primary/30 hover:shadow-md
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-primary
        sm:p-5
      "
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="
            flex size-12 shrink-0 items-center
            justify-center rounded-2xl
            bg-primary/10 text-primary
          "
        >
          <Icon size={22} />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
              {variantLabels[variant]}
            </span>

            {status && (
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${statusStyles[status.tone]}`}
              >
                {status.label}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 break-words text-[15px] font-bold leading-7 text-foreground sm:text-base">
            {title}
          </h3>

          {meta && <p className="break-words text-xs leading-6 text-muted-foreground">{meta}</p>}
        </div>
      </div>

      {summary && (
        <p className="mt-4 line-clamp-3 break-words text-sm leading-7 text-muted-foreground">
          {summary}
        </p>
      )}

      {hasPrice && (
        <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">هزینه برنامه</p>

            {oldPrice && <del className="block text-xs text-muted-foreground">{oldPrice}</del>}

            <strong className="block break-words text-base font-extrabold text-primary">
              {currentPrice}
            </strong>
          </div>

          {discounted && (
            <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
              قیمت ویژه
            </span>
          )}
        </div>
      )}

      <div className="mt-5 flex min-h-10 items-center justify-between gap-3 border-t border-border/60 pt-3">
        <span className="text-xs font-semibold text-primary sm:text-sm">{actionLabel}</span>

        <ArrowLeft
          size={18}
          aria-hidden="true"
          className="shrink-0 text-primary transition-transform group-hover:-translate-x-1"
        />
      </div>
    </Link>
  );
}
