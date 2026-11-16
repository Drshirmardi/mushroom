import { describe, expect, it, vi } from 'vitest';
import { paymentReturnHref, returnFromPayment } from './payment-return';
import { canGoBackInApp } from './assessment-history';

vi.mock('./assessment-history', () => ({ canGoBackInApp: vi.fn() }));
const context = (purpose: string) => ({ purpose, orderId: null, assessmentPurchaseId: null, programPurchaseId: null });

describe('payment return', () => {
  it('returns through app history when available', () => {
    vi.mocked(canGoBackInApp).mockReturnValue(true);
    const router = { back: vi.fn(), push: vi.fn() };
    returnFromPayment(router, context('TOPUP'), null);
    expect(router.back).toHaveBeenCalledOnce();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('keeps the exact invitation destination ahead of history or generic fallback', () => {
    vi.mocked(canGoBackInApp).mockReturnValue(true);
    const router = { back: vi.fn(), push: vi.fn() };
    returnFromPayment(router, context('ASSESSMENT'), 'request-id', '/');
    expect(router.push).toHaveBeenCalledWith('/assessment/marriage/requests/request-id');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('uses deterministic destinations for direct entry and encodes resource identifiers', () => {
    vi.mocked(canGoBackInApp).mockReturnValue(false);
    const router = { back: vi.fn(), push: vi.fn() };
    returnFromPayment(router, null, null, '/store/cart');
    expect(router.push).toHaveBeenCalledWith('/store/cart');
    expect(paymentReturnHref(null, null)).toBe('/');
    expect(paymentReturnHref(context('TOPUP'), null)).toBe('/profile/wallet');
    expect(paymentReturnHref(context('APPOINTMENT'), null)).toBe('/appointments');
    expect(paymentReturnHref(context('ENTRY_ASSESSMENT'), null)).toBe('/welcome');
    expect(paymentReturnHref({ ...context('ORDER'), orderId: 'order?x' }, null)).toBe('/store/order-tracking?orderId=order%3Fx');
    expect(paymentReturnHref({ ...context('ASSESSMENT'), assessmentPurchaseId: 'purchase/id' }, null)).toBe('/assessment/purchases/purchase%2Fid');
    expect(paymentReturnHref({ ...context('PROGRAM'), programPurchaseId: 'program/id' }, null)).toBe('/programs/purchases/program%2Fid');
    expect(paymentReturnHref({ ...context('MARRIAGE_REQUEST'), marriagePublicationId: 'pub-1' }, 'old-invitation')).toBe('/assessment/couples?start=pub-1');
  });
});
