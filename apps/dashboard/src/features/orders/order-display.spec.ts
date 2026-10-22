import { describe, expect, it } from 'vitest';
import type { CommerceOrder, OrderDetail } from '@/lib/commerce-orders-api';
import { digits, nextStep, refundableToman } from './order-display';

describe('order operation boundaries', () => {
  it('keeps pickup and courier fulfillment separate and stops terminal or requested states', () => {
    const order = (status: string, shippingMethod = 'COURIER') => ({ status, shippingMethod }) as CommerceOrder;
    expect(nextStep(order('FULFILLMENT_PENDING'))).toBe('SHIPPED');
    expect(nextStep(order('FULFILLMENT_PENDING', 'PICKUP'))).toBe('READY_FOR_PICKUP');
    expect(nextStep(order('READY_FOR_PICKUP', 'PICKUP'))).toBe('DELIVERED');
    for (const status of ['CANCELLED', 'CANCELLATION_REQUESTED', 'RETURN_REQUESTED', 'REFUNDED', 'DELIVERED']) expect(nextStep(order(status))).toBeNull();
  });
  it('holds pending refunds and converts shared billing units with integer precision', () => {
    const legacy = { payment: { commerceAmountToman: '1000', refunds: [{ status: 'REQUESTED', amountToman: '100' }, { status: 'COMPLETED', amountToman: '200' }, { status: 'REJECTED', amountToman: '300' }] } } as OrderDetail;
    expect(refundableToman(legacy)).toBe('700');
    const shared = { refundRoute: 'SHARED', billing: { amountRial: '10005', refunds: [{ status: 'COMPLETED', amountRial: '2000' }, { status: 'MANUAL_REQUIRED', amountRial: '3000' }] } } as OrderDetail;
    expect(refundableToman(shared)).toBe('500');
    expect(digits('۱۲۳٤٥٦')).toBe('123456');
  });
});
