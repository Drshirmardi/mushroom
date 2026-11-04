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
  return <Link href={`/store/order-tracking?orderId=${encodeURIComponent(orderId)}`} className="home-order-card" aria-label={order ? `پیگیری سفارش شماره ${toP(order.orderNumber)}` : 'پیگیری سفارش فروشگاه'}>
    <div className="home-order-heading">
      <span className="home-pending-icon"><ShoppingBag size={20} strokeWidth={1.6} aria-hidden="true" /></span>
      <div><h3>{order ? <>سفارش شمارهٔ <bdi>{toP(order.orderNumber)}</bdi></> : 'سفارش فروشگاه'}</h3>
        <p>{order ? orderStatusLabel(order.status) : resource.loading ? 'در حال دریافت وضعیت سفارش…' : 'برای بررسی وضعیت، پیگیری سفارش را باز کنید.'}</p>
      </div>
      <ArrowLeft size={18} aria-hidden="true" />
    </div>
    {paid && <OrderProgress order={order} compact />}
    {paid && <span className="home-order-caption">{order.shippingMethod === 'PICKUP' ? 'آماده‌سازی تا دریافت حضوری' : 'آماده‌سازی تا تحویل به شما'}<span>پیگیری سفارش</span></span>}
  </Link>;
}
