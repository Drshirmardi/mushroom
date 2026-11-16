import { describe, expect, it } from 'vitest';

import { getPurchaseCardInfo, type PurchaseLike } from './program-state';

const basePurchase: PurchaseLike = {
  id: 'purchase-1',
  kind: 'READY_EDUCATION',
  customRequestId: null,
  grant: null,
  intent: null,
};

describe('getPurchaseCardInfo', () => {
  it('opens active educational content directly', () => {
    const result = getPurchaseCardInfo({
      ...basePurchase,
      grant: {
        id: 'grant-1',
        accessAvailable: true,
      },
      intent: {
        status: 'PAID',
      },
    });

    expect(result.href).toBe('/programs/content/grant-1');

    expect(result.status.label).toBe('دسترسی فعال');
  });

  it('does not open unavailable content', () => {
    const result = getPurchaseCardInfo({
      ...basePurchase,
      grant: {
        id: 'grant-1',
        accessAvailable: false,
      },
    });

    expect(result.href).toBe('/programs/purchases/purchase-1');

    expect(result.status.label).toBe('دسترسی غیرفعال');
  });

  it('opens custom request follow-up directly', () => {
    const result = getPurchaseCardInfo({
      ...basePurchase,
      kind: 'CUSTOM_PROFESSIONAL_PLAN',
      customRequestId: 'request-1',
      intent: {
        status: 'PAID',
      },
    });

    expect(result.href).toBe('/programs/custom/request-1');
  });

  it('keeps a pending payment in purchase details', () => {
    const result = getPurchaseCardInfo({
      ...basePurchase,
      intent: {
        status: 'PENDING',
      },
    });

    expect(result.href).toBe('/programs/purchases/purchase-1');

    expect(result.status.label).toBe('در انتظار پرداخت');
  });

  it('does not mistake reconciliation for failure', () => {
    const result = getPurchaseCardInfo({
      ...basePurchase,
      intent: {
        status: 'PENDING',
        attempts: [
          {
            status: 'REQUIRES_RECONCILIATION',
          },
        ],
      },
    });

    expect(result.status.label).toBe('در حال بررسی پرداخت');

    expect(result.status.tone).toBe('warning');
  });

  it('does not claim access when payment is paid but grant is missing', () => {
    const result = getPurchaseCardInfo({
      ...basePurchase,
      intent: {
        status: 'PAID',
      },
    });

    expect(result.href).toBe('/programs/purchases/purchase-1');

    expect(result.status.label).toBe('پرداخت تأییدشده');
  });

  it('keeps cancelled purchases out of content', () => {
    const result = getPurchaseCardInfo({
      ...basePurchase,
      intent: {
        status: 'CANCELLED',
      },
    });

    expect(result.href).toBe('/programs/purchases/purchase-1');
  });

  it('handles purchases without a billing intent', () => {
    const result = getPurchaseCardInfo(basePurchase);

    expect(result.status.label).toBe('در انتظار تکمیل خرید');
  });
});
