/**
 * Native Bale SDK helpers. A closed invoice is never proof of settlement.
 * All callbacks must refresh the authoritative BillingIntent from the API.
 */
type BalePaymentWebApp = {
  version?: string;
  openInvoice?: (params: string, callback?: () => void) => void;
  onEvent?: (event: 'invoiceClosed', handler: () => void) => void;
  offEvent?: (event: 'invoiceClosed', handler: () => void) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
};

export type BaleInvoiceOpenResult = 'opened' | 'already-active' | 'unsupported' | 'failed';
export const BALE_SDK_URL = 'https://tapi.bale.ai/miniapp.js?3';

export function balePaymentResultHref(startParam: string | null): string | null {
  const intentId = /^payment_([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu.exec(startParam ?? '')?.[1];
  return intentId ? `/profile/wallet/payment-result?intentId=${encodeURIComponent(intentId)}` : null;
}

let invoiceActive = false;
let activeInvoiceApp: BalePaymentWebApp | null = null;
let activeInvoiceCloseHandler: (() => void) | null = null;

function finishActiveInvoice(notify: boolean): void {
  if (!invoiceActive) return;
  invoiceActive = false;
  const app = activeInvoiceApp;
  const closeHandler = activeInvoiceCloseHandler;
  activeInvoiceApp = null;
  activeInvoiceCloseHandler = null;
  try {
    app?.offEvent?.('invoiceClosed', handleInvoiceClosed);
  } catch {
    // The payment result callback still releases our local invoice lock.
  }
  if (notify) closeHandler?.();
}

function handleInvoiceClosed(): void {
  finishActiveInvoice(true);
}

export function supportsBaleInvoiceVersion(version: string | undefined): boolean {
  const match = /^(\d+)\.(\d+)(?:\.\d+)?$/u.exec(version ?? '');
  return Boolean(match && (Number(match[1]) > 1 || (Number(match[1]) === 1 && Number(match[2]) >= 3)));
}
const webApp = (): BalePaymentWebApp | undefined =>
  typeof window === 'undefined' ? undefined : (window as Window & { Bale?: { WebApp?: BalePaymentWebApp } }).Bale?.WebApp;
export function isBaleSession(): boolean {
  return typeof window !== 'undefined' && window.sessionStorage.getItem('mushroom:bale-miniapp') === '1';
}
export function isBaleContext(): boolean {
  return isBaleSession() && Boolean(webApp()?.version);
}
export function canOpenBaleInvoice(): boolean {
  const app = webApp();
  return isBaleContext() && supportsBaleInvoiceVersion(app?.version) && typeof app?.openInvoice === 'function';
}
export function isBaleInvoiceActive(): boolean {
  return invoiceActive;
}
export function openBaleInvoice(invoiceParams: string, onClosed: () => void): BaleInvoiceOpenResult {
  const app = webApp();
  if (!app || !canOpenBaleInvoice()) return 'unsupported';
  if (invoiceActive) return 'already-active';

  invoiceActive = true;
  activeInvoiceApp = app;
  activeInvoiceCloseHandler = onClosed;
  try {
    app.onEvent?.('invoiceClosed', handleInvoiceClosed);
    app.openInvoice!(invoiceParams, handleInvoiceClosed);
    return 'opened';
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (/invoice is active|active invoice/iu.test(message)) return 'already-active';
    finishActiveInvoice(false);
    return 'failed';
  }
}
export function openSadadOutsideMiniApp(redirectUrl: string): void {
  window.location.assign(redirectUrl);
}

export function openBaleBrowser(url: string, tryInstantView = true): boolean {
  const app = webApp();
  if (!isBaleSession() || typeof app?.openLink !== 'function') return false;
  try {
    app.openLink(url, { try_instant_view: tryInstantView });
    return true;
  } catch {
    return false;
  }
}
