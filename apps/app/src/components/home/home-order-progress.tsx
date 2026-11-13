'use client';
import { LoadingState } from '@/components/shared/skeletons';

import Link from 'next/link';
import { useCallback } from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { getCommerceOrder } from '@/lib/commerce-catalog-api';
import { toP } from '@/lib/format';
import { orderStatusLabel } from '@/lib/order-labels';
import { usePatientResource } from '@/lib/use-patient-resource';
import { OrderProgress } from '@/components/store/order-progress';

export function HomeOrderProgress({ orderId, token }: { orderId: string; token: string }) {
  const resource = usePatientResource(useCallback(() => getCommerceOrder(token, orderId), [token, orderId]));
  const order = resource.data;
  const paid = order && ['PAID', 'FULFILLMENT_PENDING', 'FULFILLING', 'READY_FOR_PICKUP', 'SHIPPED'].includes(order.status)
    && ['VERIFIED', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus ?? '');
  if (order && !paid && !['PENDING_PAYMENT', 'PAYMENT_PROCESSING'].includes(order.status)) return null;

  if (resource.loading) return <LoadingState variant="card" />;
  return (
    <Link
      href={`/store/order-tracking?orderId=${encodeURIComponent(orderId)}`}
      className="home-order-card block min-w-0 p-3.5"
      aria-label={order ? `پیگیری سفارش شماره ${toP(order.orderNumber)}` : 'پیگیری سفارش فروشگاه'}
    >
      <div className="home-order-heading flex min-w-0 items-center gap-2.5">
        <span className="home-pending-icon grid size-9 shrink-0 place-items-center rounded-xl">
          <ShoppingBag size={20} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] leading-6 font-medium [overflow-wrap:anywhere]">
            {order ? <>سفارش شمارهٔ <bdi>{toP(order.orderNumber)}</bdi></> : 'سفارش فروشگاه'}
          </h3>
          <p className="text-xs leading-[22px] text-[var(--home-muted)]">
            {order
              ? orderStatusLabel(order.status)
              : resource.loading
                ? 'در حال دریافت وضعیت سفارش…'
                : 'برای بررسی وضعیت، پیگیری سفارش را باز کنید.'}
          </p>
        </div>
        <ArrowLeft className="shrink-0 text-[var(--home-action)]" size={18} aria-hidden="true" />
      </div>
      {paid && <OrderProgress order={order} compact />}
      {paid && (
        <span className="home-order-caption mt-3 flex items-center justify-between gap-2 border-t border-[var(--home-line)] pt-2 text-[11px] leading-5 text-[var(--home-muted)]">
          {order.shippingMethod === 'PICKUP'
            ? 'آماده‌سازی تا دریافت حضوری'
            : 'آماده‌سازی تا تحویل به شما'}
          <span className="whitespace-nowrap text-[var(--home-action)]">پیگیری سفارش</span>
        </span>
      )}
    </Link>
  );
}
