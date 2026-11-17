import { describe, expect, it } from 'vitest';
import { balePaymentReturnDocument, balePaymentReturnLink, balePaymentStatusText } from '../src/modules/billing/bale-payment-return';

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
    expect(html).toContain('این تب را ببندید و به همان صفحهٔ پرداخت در بله برگردید.');
    expect(html).toContain('با همان حساب بیمار وارد شوید.');
    expect(html).not.toContain('<script');
  });

  it('gives the original-tab instructions even without a configured Bale bot', () => {
    const html = balePaymentReturnDocument(null, 'https://app.example.test/result');
    expect(html).toContain('بررسی وضعیت پرداخت');
    expect(html).not.toContain('باز کردن اپ بله');
  });

  it('provides a chat deep link and a manually copyable command', () => {
    const intentId = '56ac23e7-3b76-4ba0-8c01-df49094fbad8';
    const chatUrl = balePaymentReturnLink('clinic_bot', intentId, 'start');
    const html = balePaymentReturnDocument(null, 'https://app.example.test/result', { chatUrl, intentId, nonce: 'test' });
    expect(html).toContain(`https://ble.ir/clinic_bot?start=payment_${intentId}`);
    expect(html).toContain(`/start payment_${intentId}`);
    expect(html).toContain('<script nonce="test">');
  });

  it.each([
    ['PAID', 'FAILED', 'پرداخت تأیید شد.'],
    ['COMPENSATED', 'VERIFIED', 'مبلغ پرداخت به کیف پول شما برگشت.'],
    ['PENDING', 'FAILED', 'پرداخت انجام نشد.'],
    ['PENDING', 'REQUIRES_RECONCILIATION', 'پرداخت در حال بررسی است.'],
    ['EXPIRED', 'FAILED', 'این درخواست پرداخت بسته شده است.'],
  ])('maps %s and %s to the bot message', (status, attempt, expected) => {
    expect(balePaymentStatusText({ status, attempts: [{ status: attempt }] })).toBe(expected);
  });
});
