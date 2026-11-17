import { describe, expect, it } from 'vitest';
import { balePaymentReturnDocument, balePaymentReturnLink } from '../src/modules/billing/bale-payment-return';

describe('Bale payment return', () => {
  it('passes the intent as a routing hint to the configured bot', () => {
    const id = '56ac23e7-3b76-4ba0-8c01-df49094fbad8';
    expect(balePaymentReturnLink('clinic_bot', id))
      .toBe(`https://ble.ir/clinic_bot?startapp=payment_${id}`);
    expect(balePaymentReturnLink(undefined, id)).toBeNull();
    expect(balePaymentReturnLink('example.test/path', id)).toBeNull();
  });

  it('renders both return options without disclosing payment information', () => {
    const html = balePaymentReturnDocument('https://ble.ir/clinic_bot?startapp=payment_test', 'https://app.example.test/result?intentId=test&test=1');
    expect(html).toContain('href="https://ble.ir/clinic_bot?startapp=payment_test"');
    expect(html).toContain('href="https://app.example.test/result?intentId=test&#38;test=1"');
    expect(html).not.toContain('<script');
  });
});
