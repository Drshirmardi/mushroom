'use client';

import Link from 'next/link';

import { ArrowLeft, BookOpen, Compass, Heart, Leaf, Sparkles, type LucideIcon } from 'lucide-react';

import type { MezajService, OwnedMezajService } from '@/lib/mezaj-services-api';

import { formatRial, formatToman, rialToToman, rialRemainderLabel } from '@/lib/wallet-money';

// ---------------------------------------------
// Shared service icon
// ---------------------------------------------

const SERVICE_ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  compass: Compass,
  heart: Heart,
  leaf: Leaf,
  sparkles: Sparkles,
};

export function ServiceIcon({ name }: { name: string }) {
  const Icon = SERVICE_ICONS[name] ?? BookOpen;

  return (
    <span
      className="
        mezaj-service-icon
        flex size-10 shrink-0 items-center justify-center
        rounded-xl bg-primary/10 text-primary
      "
    >
      <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

// ---------------------------------------------
// Recommended service card
// ---------------------------------------------

export function ServiceCard({ item }: { item: MezajService }) {
  const amount = BigInt(item.amountRial);
  const remainder = rialRemainderLabel(amount);

  const price = `${formatToman(rialToToman(amount))} تومان` + (remainder ? ` و ${remainder}` : '');

  const owned = item.state === 'OWNED' && Boolean(item.accessGrantId);

  const pending = item.state === 'PENDING' && Boolean(item.purchaseId);

  const href = owned
    ? `/programs/content/${encodeURIComponent(item.accessGrantId!)}`
    : pending
      ? `/programs/purchases/${encodeURIComponent(item.purchaseId!)}`
      : `/programs/offerings/${encodeURIComponent(item.publicationId)}`;

  const actionLabel = owned ? 'مطالعهٔ محتوا' : pending ? 'ادامهٔ خرید' : 'جزئیات و خرید';

  const priceLabel = owned
    ? 'در کتابخانهٔ شما'
    : pending
      ? 'در انتظار پرداخت'
      : amount === BigInt(0)
        ? 'رایگان'
        : price;

  const hasDiscount = !owned && !pending && item.discountPercent > 0;

  return (
    <article
      className="
        mezaj-service-card
        flex h-full w-full min-w-0 flex-col
        gap-3 rounded-2xl
        border border-border bg-card
        p-3.5 text-foreground
        shadow-sm
        transition-colors duration-200
        hover:border-primary/30
      "
    >
      {/* Icon and title */}
      <div className="flex min-w-0 items-start gap-3">
        <ServiceIcon name={item.icon} />

        <h3
          className="
            min-w-0 flex-1
            line-clamp-2
            pt-0.5
            text-sm font-bold leading-6
            text-foreground
            wrap-break-word
          "
        >
          {item.title}
        </h3>
      </div>

      {/* Service description */}
      {item.summary && (
        <p
          className="
            line-clamp-3
            text-xs leading-6
            text-muted-foreground
            wrap-break-word
          "
        >
          {item.summary}
        </p>
      )}

      {/* Footer */}
      <div
        className="
          mt-auto flex min-w-0 flex-col gap-3
          border-t border-border/70 pt-3
        "
      >
        {/* Discount */}
        {hasDiscount && (
          <div className="flex flex-wrap items-center gap-2">
            <del
              className="
                text-xs leading-5
                text-muted-foreground
              "
            >
              {formatRial(BigInt(item.baseAmountRial))}
            </del>

            <span
              className="
                inline-flex items-center
                rounded-md bg-primary/10
                px-2 py-0.5
                text-xs font-bold text-primary
              "
            >
              {item.discountPercent.toLocaleString('fa-IR')}٪ تخفیف
            </span>
          </div>
        )}

        {/* Price or ownership status */}
        <div className="min-w-0">
          <span
            className={
              owned || pending
                ? 'block text-sm font-semibold leading-7 text-primary wrap-break-word'
                : 'block text-lg font-extrabold leading-7 tracking-tight text-foreground wrap-break-word'
            }
          >
            {priceLabel}
          </span>
        </div>

        {/* Main action */}
        <Link
          href={href}
          className="
            inline-flex min-h-11 w-full
            items-center justify-center
            gap-2 rounded-xl
            bg-primary px-3 py-2.5
            text-center text-xs font-bold
            text-primary-foreground
            transition-opacity duration-200
            hover:opacity-90
            focus-visible:outline-2
            focus-visible:outline-offset-2
            focus-visible:outline-primary
          "
        >
          <span>{actionLabel}</span>

          <ArrowLeft size={16} className="shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

// ---------------------------------------------
// Purchased / owned service card
// ---------------------------------------------

export function OwnedServiceCard({ item }: { item: OwnedMezajService }) {
  const href = item.accessAvailable
    ? `/programs/content/${encodeURIComponent(item.accessGrantId)}`
    : `/programs/purchases/${encodeURIComponent(item.purchaseId)}`;

  const description = item.accessAvailable ? 'باز کردن محتوای من' : 'بررسی وضعیت دسترسی';

  return (
    <Link
      href={href}
      className="
        mezaj-owned-card
        group flex w-full min-w-0
        items-center gap-3
        rounded-2xl border border-border
        bg-card p-3.5
        text-foreground
        transition-colors duration-200
        hover:border-primary/30
        hover:bg-muted/40
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-primary
      "
    >
      <ServiceIcon name={item.icon} />

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <strong
          className="
            line-clamp-2
            text-sm font-semibold leading-6
            text-foreground
            wrap-break-word
          "
        >
          {item.title}
        </strong>

        <small
          className="
            text-xs leading-5
            text-muted-foreground
          "
        >
          {description}
        </small>
      </span>

      <ArrowLeft
        size={18}
        className="
          shrink-0 text-primary
          transition-transform duration-200
          group-hover:-translate-x-1
        "
        aria-hidden="true"
      />
    </Link>
  );
}
