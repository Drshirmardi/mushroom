'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileHeart,
  Info,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

import type { components } from '@sabz-zendegi/api-client';

import { useAuthSession } from '@/components/auth/session-gate';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { getProgramPurchase } from '@/lib/digital-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { billingStatusLabel, intentResultView, type IntentResultView } from '@/lib/wallet-labels';
import { formatRialWithUnit } from '@/lib/wallet-money';

type PurchaseDto = components['schemas']['PatientProgramPurchaseDto'];

type Tone = 'success' | 'info' | 'warning' | 'neutral';

type Presentation = {
  title: string;
  description: string;
  tone: Tone;
};

type PrimaryAction = {
  href: string;
  label: string;
};

const toneStyles: Record<
  Tone,
  {
    background: string;
    icon: string;
    text: string;
  }
> = {
  success: {
    background: 'border-emerald-200 bg-emerald-50/70',
    icon: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-950',
  },
  info: {
    background: 'border-blue-200 bg-blue-50/70',
    icon: 'bg-blue-100 text-blue-700',
    text: 'text-blue-950',
  },
  warning: {
    background: 'border-amber-200 bg-amber-50/70',
    icon: 'bg-amber-100 text-amber-700',
    text: 'text-amber-950',
  },
  neutral: {
    background: 'border-border bg-white',
    icon: 'bg-muted text-muted-foreground',
    text: 'text-foreground',
  },
};

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
  }).format(date);
}

function purchasePresentation(purchase: PurchaseDto): {
  presentation: Presentation;
  action: PrimaryAction | null;
  paymentView: IntentResultView | null;
  accessLabel: string;
} {
  const intent = purchase.intent;

  const paymentView = intent ? intentResultView(intent) : null;

  const isCustom = purchase.kind === 'CUSTOM_PROFESSIONAL_PLAN';

  const educationalAccess = !isCustom && purchase.grant?.accessAvailable === true;

  const customHref =
    isCustom && purchase.customRequestId
      ? `/programs/custom/${encodeURIComponent(purchase.customRequestId)}`
      : null;

  const contentHref =
    educationalAccess && purchase.grant
      ? `/programs/content/${encodeURIComponent(purchase.grant.id)}`
      : null;

  const paymentHref = intent
    ? `/profile/wallet/pay?intentId=${encodeURIComponent(intent.id)}`
    : null;

  const accessLabel = isCustom
    ? 'پیگیری از صفحه برنامه اختصاصی'
    : educationalAccess
      ? 'فعال و قابل مشاهده'
      : purchase.grant?.endsAt
        ? 'در حال حاضر غیرفعال'
        : 'هنوز فعال نیست';

  // An active educational grant is authoritative
  // for content access. Do not infer payment state
  // from the grant.
  if (contentHref) {
    return {
      presentation: {
        title: 'برنامه آماده مشاهده است',
        description: 'دسترسی شما فعال است و می‌توانید محتوای آموزشی برنامه را مشاهده کنید.',
        tone: 'success',
      },
      action: {
        href: contentHref,
        label: 'مشاهده برنامه آموزشی',
      },
      paymentView,
      accessLabel,
    };
  }

  if (paymentView === 'ambiguous') {
    return {
      presentation: {
        title: 'پرداخت در حال بررسی است',
        description: 'نتیجه تراکنش هنوز قطعی نیست. پیش از هر پرداخت مجدد، وضعیت آن را بررسی کنید.',
        tone: 'warning',
      },
      action: paymentHref
        ? {
            href: paymentHref,
            label: 'بررسی وضعیت پرداخت',
          }
        : null,
      paymentView,
      accessLabel,
    };
  }

  if (paymentView === 'compensated') {
    return {
      presentation: {
        title: 'وضعیت پرداخت جبران‌شده است',
        description:
          'این پرداخت در وضعیت جبران‌شده ثبت شده است. جزئیات مالی را در بخش پرداخت مشاهده کنید.',
        tone: 'warning',
      },
      action: paymentHref
        ? {
            href: paymentHref,
            label: 'مشاهده جزئیات پرداخت',
          }
        : null,
      paymentView,
      accessLabel,
    };
  }

  if (paymentView === 'paid' && customHref) {
    return {
      presentation: {
        title: 'پرداخت برنامه انجام شده است',
        description:
          'برای بررسی آماده‌سازی، نسخه‌های منتشرشده و دسترسی متخصص، وارد صفحه برنامه اختصاصی شوید.',
        tone: 'success',
      },
      action: {
        href: customHref,
        label: 'پیگیری برنامه اختصاصی',
      },
      paymentView,
      accessLabel,
    };
  }

  if (paymentView === 'paid') {
    return {
      presentation: {
        title: 'پرداخت با موفقیت ثبت شده است',
        description: isCustom
          ? 'وضعیت آماده‌سازی برنامه اختصاصی را بررسی کنید. انتشار محتوا از پرداخت جداست.'
          : 'در حال حاضر دسترسی به محتوای آموزشی فعال نیست. وضعیت دسترسی را دوباره بررسی کنید.',
        tone: 'info',
      },
      action: customHref
        ? {
            href: customHref,
            label: 'پیگیری برنامه اختصاصی',
          }
        : null,
      paymentView,
      accessLabel,
    };
  }

  if (paymentView === 'failed') {
    return {
      presentation: {
        title: 'آخرین تلاش پرداخت ناموفق بود',
        description: 'وضعیت درخواست و امکان ادامه پرداخت را در صفحه پرداخت بررسی کنید.',
        tone: 'warning',
      },
      action: paymentHref
        ? {
            href: paymentHref,
            label: 'بررسی پرداخت',
          }
        : null,
      paymentView,
      accessLabel,
    };
  }

  if (paymentView === 'pending') {
    return {
      presentation: {
        title: 'در انتظار تکمیل پرداخت',
        description:
          'پرداخت هنوز نهایی نشده است. برای مشاهده روش‌های مجاز پرداخت، وارد مرحله پرداخت شوید.',
        tone: 'info',
      },
      action: paymentHref
        ? {
            href: paymentHref,
            label: 'ادامه به پرداخت',
          }
        : null,
      paymentView,
      accessLabel,
    };
  }

  if (paymentView === 'closed') {
    return {
      presentation: {
        title: 'این درخواست پرداخت بسته شده است',
        description:
          'پرداخت لغو شده یا اعتبار درخواست آن پایان یافته است. برای بررسی جزئیات، وضعیت مالی را مشاهده کنید.',
        tone: 'neutral',
      },
      action: paymentHref
        ? {
            href: paymentHref,
            label: 'مشاهده جزئیات پرداخت',
          }
        : null,
      paymentView,
      accessLabel,
    };
  }

  return {
    presentation: {
      title: 'وضعیت برنامه نیاز به بررسی دارد',
      description:
        'اطلاعات کافی برای تأیید پرداخت یا دسترسی در دسترس نیست. می‌توانید وضعیت را دوباره دریافت کنید.',
      tone: 'neutral',
    },
    action: customHref
      ? {
          href: customHref,
          label: 'مشاهده درخواست اختصاصی',
        }
      : null,
    paymentView,
    accessLabel,
  };
}

export default function ProgramPurchasePage() {
  const { id } = useParams<{ id: string }>();
  const { authentication } = useAuthSession();

  const resource = usePatientResource(
    useCallback(
      () => getProgramPurchase(authentication.accessToken, id),
      [authentication.accessToken, id],
    ),
  );

  const purchase = resource.data;

  return (
    <main dir="rtl" className="flex min-h-full w-full flex-col bg-[#f8fafc] text-foreground">
      {/* Header */}
      <div className="mx-auto w-full max-w-[720px]">
        <nav aria-label="مسیر صفحه" className="flex items-center justify-between px-5 pb-2 pt-5">
          <Link
            href="/programs?view=mine"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowRight size={19} aria-hidden="true" />
            برنامه‌های من
          </Link>

          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-white text-primary"
          >
            <BookOpen size={19} />
          </span>
        </nav>

        <div className="px-5 pt-5">
          <PatientResourceState
            variant="detail"
            {...resource}
            retry={() => void resource.reload()}
          />
        </div>

        {purchase && (
          <PurchaseDetails
            purchase={purchase}
            refreshing={resource.refreshing}
            onRefresh={() => void resource.reload()}
          />
        )}
      </div>
    </main>
  );
}

function PurchaseDetails({
  purchase,
  refreshing,
  onRefresh,
}: {
  purchase: PurchaseDto;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const isCustom = purchase.kind === 'CUSTOM_PROFESSIONAL_PLAN';

  const { presentation, action, paymentView, accessLabel } = purchasePresentation(purchase);

  const tone = toneStyles[presentation.tone];

  const createdAt = formatDate(purchase.createdAt);
  const endsAt = formatDate(purchase.grant?.endsAt);

  const price = formatRialWithUnit(BigInt(purchase.amountRial));

  const paymentLabel = purchase.intent
    ? billingStatusLabel(purchase.intent.status)
    : 'اطلاعات پرداخت موجود نیست';

  const Icon =
    presentation.tone === 'success'
      ? CheckCircle2
      : presentation.tone === 'warning'
        ? Clock3
        : Info;

  return (
    <div className="flex flex-col gap-6 px-5 pb-10 pt-2">
      {/* Program identity */}
      <header className="space-y-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          {isCustom ? (
            <FileHeart size={14} aria-hidden="true" />
          ) : (
            <BookOpen size={14} aria-hidden="true" />
          )}

          {isCustom ? 'برنامه اختصاصی' : 'برنامه آموزشی'}
        </span>

        <h1 className="text-[clamp(1.5rem,5.5vw,2rem)] font-extrabold leading-[1.65] tracking-tight text-foreground">
          {purchase.title}
        </h1>

        <p className="text-sm leading-7 text-muted-foreground">
          وضعیت پرداخت، دسترسی و ادامه مسیر برنامه شما
        </p>
      </header>

      {/* Main status */}
      <section
        aria-labelledby="purchase-status-title"
        aria-live="polite"
        className={`rounded-[24px] border p-5 ${tone.background}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
          >
            <Icon size={22} aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1 space-y-2">
            <h2 id="purchase-status-title" className={`text-base font-bold leading-7 ${tone.text}`}>
              {presentation.title}
            </h2>

            <p className="text-sm leading-7 text-foreground/80">{presentation.description}</p>
          </div>
        </div>
      </section>

      {/* Financial and access details */}
      <section
        aria-labelledby="purchase-details-title"
        className="overflow-hidden rounded-[24px] border border-border/70 bg-white"
      >
        <div className="px-5 pb-3 pt-5">
          <h2 id="purchase-details-title" className="text-base font-bold text-foreground">
            جزئیات برنامه
          </h2>
        </div>

        <dl className="divide-y divide-border/60 px-5">
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard size={16} aria-hidden="true" />
              وضعیت پرداخت
            </dt>

            <dd className="text-left text-sm font-semibold text-foreground">{paymentLabel}</dd>
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck size={16} aria-hidden="true" />
              وضعیت دسترسی
            </dt>

            <dd className="max-w-[55%] text-left text-sm font-semibold leading-6 text-foreground">
              {accessLabel}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet size={16} aria-hidden="true" />
              مبلغ برنامه
            </dt>

            <dd className="text-left text-sm font-bold leading-6 text-foreground">{price}</dd>
          </div>

          {createdAt && (
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays size={16} aria-hidden="true" />
                تاریخ ثبت
              </dt>

              <dd className="text-left text-sm font-medium text-foreground">{createdAt}</dd>
            </div>
          )}

          {endsAt && !isCustom && (
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="text-sm text-muted-foreground">پایان بازه دسترسی</dt>

              <dd className="text-left text-sm font-medium text-foreground">{endsAt}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Main action */}
      <section className="space-y-3">
        {action ? (
          <Link
            href={action.href}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-center text-sm font-bold text-primary-foreground shadow-sm transition-[background-color,transform] duration-200 hover:bg-primary/90 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {action.label}
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-white p-4">
            <p className="text-sm leading-7 text-muted-foreground">
              {isCustom
                ? 'برای دریافت اطلاعات جدید برنامه، وضعیت را تازه‌سازی کنید.'
                : 'در حال حاضر اقدامی برای مشاهده محتوا در دسترس نیست. وضعیت دسترسی را دوباره بررسی کنید.'}
            </p>
          </div>
        )}

        <button
          type="button"
          disabled={refreshing}
          onClick={onRefresh}
          aria-busy={refreshing}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RefreshCw size={17} aria-hidden="true" className={refreshing ? 'animate-spin' : ''} />

          {refreshing ? 'در حال به‌روزرسانی…' : 'به‌روزرسانی وضعیت'}
        </button>
      </section>

      {/* Additional financial details */}
      {purchase.intent &&
        paymentView !== 'pending' &&
        paymentView !== 'ambiguous' &&
        paymentView !== 'failed' && (
          <Link
            href={`/profile/wallet/pay?intentId=${encodeURIComponent(purchase.intent.id)}`}
            className="flex min-h-12 items-center justify-between gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <span>مشاهده وضعیت و جزئیات پرداخت</span>
            <ArrowLeft size={17} aria-hidden="true" />
          </Link>
        )}
    </div>
  );
}
