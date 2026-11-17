import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  balePaymentResultHref,
  isBaleInvoiceActive,
  openBaleBrowser,
  openBaleInvoice,
  supportsBaleInvoiceVersion,
} from './bale-payment';

type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';
type InvoiceCallback = (result: { status: InvoiceStatus }) => void;

function installBaleApp(app: Record<string, unknown>) {
  vi.stubGlobal('window', {
    sessionStorage: { getItem: () => '1' },
    Bale: { WebApp: app },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('Bale bank payment handoff', () => {
  it.each([true, false, undefined])('forwards the Sadad link unchanged to the SDK (isIframe: %s)', (isIframe) => {
    const openLink = vi.fn();
    installBaleApp({ version: '1.0', isIframe, openLink });
    const url = 'https://api.example.test/v1/payments/providers/sadad/start#synthetic-token';
    expect(openBaleBrowser(url)).toBe(true);
    expect(openLink).toHaveBeenCalledOnce();
    expect(openLink).toHaveBeenCalledWith(url, { try_instant_view: true });
  });

  it('reports failure when the Bale SDK is unavailable', () => {
    installBaleApp({});
    expect(openBaleBrowser('https://example.test')).toBe(false);
  });

  it('routes only a recognized payment payload to the existing result page', () => {
    const id = '56ac23e7-3b76-4ba0-8c01-df49094fbad8';
    expect(balePaymentResultHref(`payment_${id}`)).toBe(`/profile/wallet/payment-result?intentId=${id}`);
    expect(balePaymentResultHref(`payment_${id}&status=paid`)).toBeNull();
    expect(balePaymentResultHref('https://example.test')).toBeNull();
  });
});

describe('Bale native invoice version gate', () => {
  it('requires API version 1.3 or later and fails closed for unknown versions', () => {
    for (const version of ['1.0', '1.1', '1.2', '', 'malformed']) {
      expect(supportsBaleInvoiceVersion(version)).toBe(false);
    }
    for (const version of ['1.3', '1.4', '2.0']) {
      expect(supportsBaleInvoiceVersion(version)).toBe(true);
    }
  });
});

describe('Bale native invoice lifecycle', () => {
  it('blocks duplicate opens and unlocks after the invoice callback closes', () => {
    let callback: InvoiceCallback | undefined;
    const closeHandler = vi.fn();
    const openInvoice = vi.fn((_params: string, onResult?: InvoiceCallback) => {
      callback = onResult;
    });
    const app = { version: '1.3', openInvoice };
    installBaleApp(app);

    expect(openBaleInvoice('first-invoice', closeHandler)).toBe('opened');
    expect(isBaleInvoiceActive()).toBe(true);
    expect(openBaleInvoice('second-invoice', vi.fn())).toBe('already-active');
    expect(openInvoice).toHaveBeenCalledTimes(1);

    callback?.({ status: 'cancelled' });
    expect(closeHandler).toHaveBeenCalledTimes(1);
    expect(isBaleInvoiceActive()).toBe(false);
  });

  it('recovers an SDK-owned active invoice when invoiceClosed fires', () => {
    let invoiceCallback: InvoiceCallback | undefined;
    const eventHandlers = new Set<() => void>();
    const closeHandler = vi.fn();
    const openInvoice = vi.fn((_params: string, onResult?: InvoiceCallback) => {
      if (openInvoice.mock.calls.length === 1) {
        throw new Error('[Bale Sdk]: currently an invoice is active and you can\'t open another invoice');
      }
      invoiceCallback = onResult;
    });
    const app = {
      version: '1.3',
      openInvoice,
      onEvent: vi.fn((_event: 'invoiceClosed', handler: () => void) => eventHandlers.add(handler)),
      offEvent: vi.fn((_event: 'invoiceClosed', handler: () => void) => eventHandlers.delete(handler)),
    };
    installBaleApp(app);

    expect(openBaleInvoice('active-invoice', closeHandler)).toBe('already-active');
    expect(isBaleInvoiceActive()).toBe(true);
    for (const handler of eventHandlers) handler();
    expect(closeHandler).toHaveBeenCalledTimes(1);
    expect(isBaleInvoiceActive()).toBe(false);

    expect(openBaleInvoice('next-invoice', vi.fn())).toBe('opened');
    invoiceCallback?.({ status: 'cancelled' });
    expect(isBaleInvoiceActive()).toBe(false);
  });

  it('catches non-active SDK errors and releases its lock without reporting a close', () => {
    const closeHandler = vi.fn();
    const app = {
      version: '1.3',
      openInvoice: vi.fn(() => { throw new Error('invalid invoice parameters'); }),
    };
    installBaleApp(app);

    expect(openBaleInvoice('invalid-invoice', closeHandler)).toBe('failed');
    expect(isBaleInvoiceActive()).toBe(false);
    expect(closeHandler).not.toHaveBeenCalled();
  });
});
