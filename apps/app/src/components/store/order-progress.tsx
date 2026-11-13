import { StoreIcon, type StoreIconName } from "./store-icon";
import type { CommerceOrder } from "@/lib/commerce-catalog-api";
import { orderStatusLabel } from "@/lib/order-labels";
import { toP } from "@/lib/format";

const progress: Record<string, number> = {
  PENDING_PAYMENT: 1, PAYMENT_PROCESSING: 1, PAID: 2,
  FULFILLMENT_PENDING: 2, FULFILLING: 2,
  READY_FOR_PICKUP: 3, SHIPPED: 3, DELIVERED: 4, FULFILLED: 4,
};

export function OrderProgress({ order, compact = false }: { order: CommerceOrder; compact?: boolean }) {
  const pickup = order.shippingMethod === "PICKUP";
  const current = progress[order.status];
  const exceptional = current === undefined;
  const paymentConfirmed = ["VERIFIED", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.paymentStatus ?? "");
  const delivered = order.status === "DELIVERED" || order.status === "FULFILLED";
  const steps = [
    { title: "ثبت سفارش", hint: "سفارش شما ثبت شده است.", icon: "checklist" as const },
    { title: "پرداخت", hint: order.status === "PAYMENT_PROCESSING" ? "نتیجه پرداخت در حال بررسی است." : "پس از تأیید پرداخت، آماده‌سازی آغاز می‌شود.", icon: "bankCard" as const },
    { title: "آماده‌سازی", hint: order.status === "PAID" ? "پرداخت تأیید شده؛ سفارش در انتظار آماده‌سازی است." : "سفارش شما برای تحویل آماده می‌شود.", icon: "deliveryBox" as const },
    { title: pickup ? "آماده دریافت" : "ارسال سفارش", hint: pickup ? "سفارشتان آماده است؛ می‌توانید برای دریافت مراجعه کنید." : "سفارش به پیک تحویل داده شده و در مسیر شماست.", icon: (pickup ? "store" : "arrowRight") as StoreIconName },
    { title: "تحویل سفارش", hint: "سفارش شما تحویل داده شده است.", icon: "checkCircle" as const },
  ];

  return <section aria-label="مراحل سفارش" className={compact ? 'home-order-progress mt-3.5' : 'rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-5'} dir="rtl">
    {!compact && <header className="mb-7 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold">مسیر سفارش شما</h2>
      <span className="text-xs text-muted-foreground">شماره <bdi className="font-iransans-fanum text-foreground">{toP(order.orderNumber)}</bdi></span>
    </header>}
    {exceptional && <p role="status" className="mb-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900"><StoreIcon name="errorCircle" size={18} className="mt-1 shrink-0" />{orderStatusLabel(order.status)}</p>}
    <ol className={`m-0 grid list-none p-0 ${compact ? 'grid-cols-4' : 'grid-cols-5'}`}>
      {(compact ? steps.slice(1) : steps).map((step, position) => {
        const index = position + (compact ? 1 : 0);
        const done = exceptional ? index === 0 || (index === 1 && paymentConfirmed) : index < current || delivered;
        const active = !exceptional && index === current;
        return <li key={step.title} aria-current={active ? "step" : undefined} className="relative flex min-w-0 flex-col items-center text-center">
          {index < steps.length - 1 && <span aria-hidden="true" className={`absolute start-1/2 ${compact ? "top-[14px]" : "top-4 sm:top-[22px]"} h-0.5 w-full ${done ? "bg-emerald-300" : "bg-border"}`} />}
          <span aria-hidden="true" className={`relative z-10 flex shrink-0 items-center justify-center border transition-colors ${compact ? "h-7 w-7 rounded-[10px]" : "h-8 w-8 rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"} ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : active ? "border-primary bg-primary text-white shadow-sm ring-4 ring-primary/10" : "border-border bg-white text-muted-foreground"}`}><StoreIcon name={step.icon} size={compact ? 14 : 16} /></span>
          <p className={`w-full ${compact ? "mt-[7px] px-0.5 text-xs leading-[21px]" : "mt-3 px-0.5 text-[10px] leading-5 sm:text-xs"} ${done ? "font-medium text-emerald-700" : active ? "font-semibold text-primary" : "text-muted-foreground"}`}>{step.title}<span className="sr-only">{done ? "، تکمیل شده" : active ? "، مرحله فعلی" : "، هنوز تکمیل نشده"}</span></p>
        </li>;
      })}
    </ol>
    {!compact && !exceptional && <div role="status" className={`mt-5 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-6 ${delivered ? "bg-emerald-50 text-emerald-800" : "bg-primary/5 text-primary"}`}>
      <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${delivered ? "bg-emerald-600" : "bg-primary"}`} />
      <p>{steps[current].hint}</p>
    </div>}
  </section>;
}
