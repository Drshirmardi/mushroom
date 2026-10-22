import type { CommerceOrder, OrderDetail } from '@/lib/commerce-orders-api';

export const orderStatuses: Record<string, string> = {
  PENDING_PAYMENT: 'منتظر پرداخت', PAYMENT_PROCESSING: 'در حال بررسی پرداخت', PAID: 'پرداخت‌شده',
  FULFILLMENT_PENDING: 'در حال آماده‌سازی', READY_FOR_PICKUP: 'آمادهٔ تحویل حضوری', SHIPPED: 'ارسال‌شده', DELIVERED: 'تحویل‌شده',
  CANCELLATION_REQUESTED: 'درخواست لغو', RETURN_REQUESTED: 'درخواست مرجوعی', CANCELLATION_REJECTED: 'لغو رد شده', RETURN_REJECTED: 'مرجوعی رد شده',
  FULFILLING: 'در حال انجام', FULFILLED: 'انجام‌شده', CANCELLED: 'لغوشده', PAYMENT_FAILED: 'پرداخت ناموفق',
  REQUIRES_RECONCILIATION: 'نیازمند بررسی پرداخت', REFUND_PENDING: 'در انتظار بازپرداخت', REFUNDED: 'بازپرداخت‌شده',
};
export const paymentStatuses: Record<string, string> = { ...orderStatuses, PENDING: 'در انتظار', VERIFIED: 'تأییدشده', FAILED: 'ناموفق', CREATED: 'ایجادشده', VERIFYING: 'در حال استعلام', REQUESTED: 'درخواست‌شده', APPROVED: 'تأییدشده', MANUAL_EXECUTION_PENDING: 'منتظر ثبت انتقال', MANUAL_REQUIRED: 'نیازمند انتقال دستی', COMPLETED: 'تکمیل‌شده', REJECTED: 'ردشده', PARTIALLY_REFUNDED: 'بازپرداخت جزئی' };
export const digits = (value: string) => value.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
export const money = (value: string) => `${BigInt(value).toLocaleString('fa-IR')} تومان`;
export const rialMoney = (value: string) => BigInt(value) % 10n === 0n ? money((BigInt(value) / 10n).toString()) : `${BigInt(value).toLocaleString('fa-IR')} ریال`;
export const date = (value: string) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(value));
export function nextStep(order: CommerceOrder): 'FULFILLMENT_PENDING' | 'READY_FOR_PICKUP' | 'SHIPPED' | 'DELIVERED' | null {
  if (order.status === 'PAID') return 'FULFILLMENT_PENDING';
  if (order.status === 'FULFILLMENT_PENDING') return order.shippingMethod === 'PICKUP' ? 'READY_FOR_PICKUP' : 'SHIPPED';
  if (order.shippingMethod === 'PICKUP' && order.status === 'READY_FOR_PICKUP' || order.shippingMethod === 'COURIER' && order.status === 'SHIPPED') return 'DELIVERED';
  return null;
}
export const nextLabels = { FULFILLMENT_PENDING: 'شروع آماده‌سازی', READY_FOR_PICKUP: 'آمادهٔ تحویل حضوری', SHIPPED: 'ثبت ارسال سفارش', DELIVERED: 'ثبت تحویل سفارش' };
export function refundableToman(order: OrderDetail) {
  if (order.refundRoute === 'SHARED' && order.billing) {
    const held = order.billing.refunds.filter(r => ['COMPLETED', 'MANUAL_REQUIRED'].includes(r.status)).reduce((sum, r) => sum + BigInt(r.amountRial), 0n);
    const remaining = BigInt(order.billing.amountRial) - held;
    return (remaining > 0n ? remaining / 10n : 0n).toString();
  }
  const held = order.payment?.refunds.filter(r => ['REQUESTED', 'APPROVED', 'MANUAL_EXECUTION_PENDING', 'COMPLETED'].includes(r.status)).reduce((sum, r) => sum + BigInt(r.amountToman), 0n) ?? 0n;
  const remaining = BigInt(order.payment?.commerceAmountToman ?? '0') - held;
  return (remaining > 0n ? remaining : 0n).toString();
}
