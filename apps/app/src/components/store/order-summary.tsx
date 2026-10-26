import type { CommerceOrder } from "../../lib/commerce-catalog-api";
import { formatPrice, toP } from "../../lib/format";

/** Historical order snapshot, never recomputed from today's catalog prices. */
export function OrderSummary({ order }: { order: CommerceOrder }) {
  return <section className="store-checkout__section store-checkout__summary" aria-label="جزئیات مبلغ سفارش">
    <h2>کالاهای سفارش</h2>
    <ul className="store-order-lines">{order.lines.map((line, index) => <li key={`${line.skuCode}-${index}`}><div><strong>{line.productTitle}</strong><span>{toP(line.quantity)} عدد · {line.skuCode}</span></div><span className="font-iransans-fanum">{formatPrice(BigInt(line.lineTotalToman))} تومان</span></li>)}</ul>
    <dl><div><dt>جمع کالاها</dt><dd>{formatPrice(BigInt(order.subtotalAmountToman))} تومان</dd></div>
      {BigInt(order.taxAmountToman) > BigInt(0) && <div><dt>مالیات</dt><dd>{formatPrice(BigInt(order.taxAmountToman))} تومان</dd></div>}
      {BigInt(order.discountAmountToman) > BigInt(0) && <div><dt>تخفیف سفارش</dt><dd>{formatPrice(BigInt(order.discountAmountToman))} تومان</dd></div>}
      <div><dt>هزینهٔ دریافت</dt><dd>{BigInt(order.shippingAmountToman) === BigInt(0) ? "بدون هزینه" : `${formatPrice(BigInt(order.shippingAmountToman))} تومان`}</dd></div>
      <div className="store-checkout__total"><dt>مبلغ سفارش</dt><dd>{formatPrice(BigInt(order.totalAmountToman))} تومان</dd></div>
    </dl>
    {order.shippingAddress && order.shippingMethod === "COURIER" && <p className="store-help">تحویل به {order.shippingAddress.recipientName}؛ {order.shippingAddress.province}، {order.shippingAddress.city}، {order.shippingAddress.line1}</p>}
  </section>;
}
