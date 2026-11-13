"use client";
import Link from "next/link";
import { useCallback } from "react";
import { StoreIcon } from "@/components/store/store-icon";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage, ServiceSection, ServiceEmpty } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { usePatientResource } from "@/lib/use-patient-resource";
import { getCommerceOrders } from "@/lib/commerce-catalog-api";
import { orderStatusLabel } from "@/lib/order-labels";
import { formatToman } from "@/lib/wallet-money";
import { toP } from "@/lib/format";

export default function OrderHistoryPage() {
  const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getCommerceOrders(authentication.accessToken), [authentication.accessToken]));
  return <ServicePage title="سفارش‌های من" description="وضعیت پرداخت، آماده‌سازی و تحویل سفارش‌ها را از اینجا دنبال کنید." iconNode={<StoreIcon name="shoppingBag" size={26} />} backIcon={<StoreIcon name="arrowRight" size={18} />} action={<Link href="/store">فروشگاه</Link>}>
    <ServiceSection title="سابقهٔ سفارش‌ها" description="برای دیدن جزئیات ارسال یا ادامهٔ پرداخت، سفارش موردنظر را باز کنید."><PatientResourceState {...resource} retry={() => void resource.reload()} />
      {resource.data?.length === 0 && <ServiceEmpty iconNode={<StoreIcon name="shoppingBag" size={26} />} actionIcon={<StoreIcon name="arrowLeft" size={17} />} title="هنوز سفارشی ثبت نکرده‌اید" description="پس از ثبت سفارش در فروشگاه، جزئیات خرید و مراحل تحویل آن اینجا نمایش داده می‌شود." href="/store" action="مشاهدهٔ محصولات فروشگاه" />}
      {resource.data?.map(order => <Link key={order.id} href={`/store/order-tracking?orderId=${encodeURIComponent(order.id)}`} className="service-card"><div className="service-card-top"><h3>سفارش {toP(order.orderNumber)}</h3><span className={`service-badge ${order.status === "DELIVERED" ? "service-badge--success" : ""}`}>{orderStatusLabel(order.status)}</span></div><strong className="service-price">{formatToman(BigInt(order.totalAmountToman))} تومان</strong><p>{toP(order.lines.reduce((sum,line) => sum + line.quantity,0))} کالا، {order.shippingMethod === "PICKUP" ? "دریافت حضوری" : "ارسال با پیک"}</p><span className="service-text-action">{order.status === "PENDING_PAYMENT" ? "بررسی سفارش و ادامهٔ پرداخت" : "جزئیات و پیگیری سفارش"}<StoreIcon name="arrowLeft" size={17} /></span></Link>)}
    </ServiceSection>
  </ServicePage>;
}
