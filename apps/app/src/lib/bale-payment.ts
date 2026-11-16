/**
 * Native Bale SDK helpers. A closed invoice is never proof of settlement.
 * All callbacks must refresh the authoritative BillingIntent from the API.
 */
type BalePaymentWebApp = {
  version?: string;
  openInvoice?: (params: string, callback?: (result: { status: 'paid' | 'cancelled' | 'failed' | 'pending' }) => void) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
};

export function supportsBaleInvoiceVersion(version: string | undefined): boolean {
  const match = /^(\d+)\.(\d+)(?:\.\d+)?$/u.exec(version ?? '');
  return Boolean(match && (Number(match[1]) > 1 || (Number(match[1]) === 1 && Number(match[2]) >= 3)));
}
const webApp = (): BalePaymentWebApp | undefined =>
  typeof window === 'undefined' ? undefined : (window as Window & { Bale?: { WebApp?: BalePaymentWebApp } }).Bale?.WebApp;
export function isBaleContext(): boolean {
  return typeof window !== 'undefined' && window.sessionStorage.getItem('mushroom:bale-miniapp') === '1' &&
    Boolean(webApp()?.version);
}
export function canOpenBaleInvoice(): boolean {
  const app = webApp();
  return isBaleContext() && supportsBaleInvoiceVersion(app?.version) && typeof app?.openInvoice === 'function';
}
export function openBaleInvoice(invoiceParams: string, onClosed: () => void): boolean {
  if (!canOpenBaleInvoice()) return false;
  webApp()!.openInvoice!(invoiceParams, () => onClosed());
  return true;
}
export function openSadadOutsideMiniApp(redirectUrl: string): void {
  const app = webApp();
  if (isBaleContext() && app?.openLink) app.openLink(redirectUrl, { try_instant_view: true });
  else window.location.assign(redirectUrl);
}
