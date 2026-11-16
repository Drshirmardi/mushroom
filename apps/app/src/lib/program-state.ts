import { intentResultView } from '@/lib/wallet-labels';

export type ProgramStatus = {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
};

export type PurchaseLike = {
  id: string;
  kind: string;
  customRequestId: string | null;

  grant: {
    id: string;
    accessAvailable: boolean;
  } | null;

  intent: {
    status: string;
    attempts?: Array<{
      status: string;
    }> | null;
  } | null;
};

export type PurchaseCardInfo = {
  href: string;
  actionLabel: string;
  status: ProgramStatus;
};

export function getPurchaseCardInfo(purchase: PurchaseLike): PurchaseCardInfo {
  const detailsHref = `/programs/purchases/${encodeURIComponent(purchase.id)}`;

  // Custom requests have their own follow-up page.
  if (purchase.kind === 'CUSTOM_PROFESSIONAL_PLAN' && purchase.customRequestId) {
    return {
      href: `/programs/custom/${encodeURIComponent(purchase.customRequestId)}`,
      actionLabel: 'پیگیری درخواست اختصاصی',
      status:
        purchase.intent?.status === 'PAID'
          ? {
              label: 'پرداخت انجام شده',
              tone: 'success',
            }
          : {
              label: 'درخواست اختصاصی',
              tone: 'neutral',
            },
    };
  }

  // Active educational access is the highest priority.
  if (purchase.kind === 'READY_EDUCATION' && purchase.grant?.accessAvailable) {
    return {
      href: `/programs/content/${encodeURIComponent(purchase.grant.id)}`,
      actionLabel: 'مشاهده محتوای برنامه',
      status: {
        label: 'دسترسی فعال',
        tone: 'success',
      },
    };
  }

  // A grant may exist but no longer be readable.
  if (purchase.grant && !purchase.grant.accessAvailable) {
    return {
      href: detailsHref,
      actionLabel: 'بررسی جزئیات دسترسی',
      status: {
        label: 'دسترسی غیرفعال',
        tone: 'warning',
      },
    };
  }

  if (!purchase.intent) {
    return {
      href: detailsHref,
      actionLabel: 'بررسی وضعیت برنامه',
      status: {
        label: 'در انتظار تکمیل خرید',
        tone: 'neutral',
      },
    };
  }

  const payment = intentResultView(purchase.intent);

  switch (payment) {
    case 'paid':
      return {
        href: detailsHref,
        actionLabel: 'بررسی دسترسی برنامه',
        status: {
          label: 'پرداخت تأییدشده',
          tone: 'warning',
        },
      };

    case 'ambiguous':
      return {
        href: detailsHref,
        actionLabel: 'بررسی وضعیت پرداخت',
        status: {
          label: 'در حال بررسی پرداخت',
          tone: 'warning',
        },
      };

    case 'failed':
      return {
        href: detailsHref,
        actionLabel: 'بررسی پرداخت ناموفق',
        status: {
          label: 'پرداخت ناموفق',
          tone: 'danger',
        },
      };

    case 'closed':
      return {
        href: detailsHref,
        actionLabel: 'مشاهده جزئیات خرید',
        status: {
          label: 'پرداخت بسته‌شده',
          tone: 'neutral',
        },
      };

    case 'compensated':
      return {
        href: detailsHref,
        actionLabel: 'بررسی وضعیت مالی',
        status: {
          label: 'پرداخت جبران‌شده',
          tone: 'neutral',
        },
      };

    case 'pending':
    default:
      return {
        href: detailsHref,
        actionLabel: 'ادامه فرایند پرداخت',
        status: {
          label: 'در انتظار پرداخت',
          tone: 'warning',
        },
      };
  }
}
