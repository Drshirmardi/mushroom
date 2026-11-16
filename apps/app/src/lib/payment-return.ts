import type { BillingIntent } from './wallet-billing-api';
import { canGoBackInApp } from './assessment-history';

type PaymentContext = Pick<BillingIntent, 'purpose' | 'orderId' | 'assessmentPurchaseId' | 'programPurchaseId' | 'marriagePublicationId'>;

export function paymentReturnHref(intent: PaymentContext | null, invitation: string | null): string {
  if (intent?.purpose === 'MARRIAGE_REQUEST') {
    return intent.marriagePublicationId ? `/assessment/couples?start=${encodeURIComponent(intent.marriagePublicationId)}` : '/assessment/couples';
  }
  if (invitation) return `/assessment/marriage/requests/${encodeURIComponent(invitation)}`;
  switch (intent?.purpose) {
    case 'TOPUP': return '/profile/wallet';
    case 'ORDER': return intent.orderId ? `/store/order-tracking?orderId=${encodeURIComponent(intent.orderId)}` : '/store/orders';
    case 'APPOINTMENT': return '/appointments';
    case 'ENTRY_ASSESSMENT': return '/welcome';
    case 'ASSESSMENT': return intent.assessmentPurchaseId ? `/assessment/purchases/${encodeURIComponent(intent.assessmentPurchaseId)}` : '/assessment';
    case 'PROGRAM': return intent.programPurchaseId ? `/programs/purchases/${encodeURIComponent(intent.programPurchaseId)}` : '/programs';
    default: return '/';
  }
}

export function returnFromPayment(router: { back: () => void; push: (href: string) => void }, intent: PaymentContext | null, invitation: string | null, fallback?: string) {
  if (intent?.purpose === 'MARRIAGE_REQUEST') {
    router.push(paymentReturnHref(intent, null));
    return;
  }
  // Invitation service context must survive gateway redirects and historical entries.
  if (!invitation && canGoBackInApp()) router.back();
  else router.push(invitation ? paymentReturnHref(intent, invitation) : fallback ?? paymentReturnHref(intent, null));
}
