import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma, type BillingIntent } from '../../generated/prisma/client';
import { ANALYTICS_CONTEXT, ANALYTICS_DELIVERY, ANALYTICS_TTL_MS, analyticsDeadline, measurementPayload, parseAnalyticsContext, type AnalyticsContext, type AnalyticsDelivery, type AnalyticsEvent } from './analytics.protocol';
import { Ga4Transport } from './ga4.transport';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(private readonly db: PrismaService, private readonly transport: Ga4Transport) {}
  context(raw: unknown) { return this.transport.enabled ? parseAnalyticsContext(raw, this.transport.measurementId) : null; }
  async captureIntent(id: string, actorUserId: string, context: AnalyticsContext) {
    if (!this.transport.enabled) return;
    const expiresAt = analyticsDeadline(context, Date.now());
    if (expiresAt <= Date.now()) return;
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM billing_intents WHERE id = ${id}::uuid FOR UPDATE`;
      const intent = await tx.billingIntent.findFirst({ where: { id, actorUserId } });
      if (!intent || intent.purpose === 'TOPUP') return;
      await tx.outboxEvent.upsert({ where: { idempotencyKey: `analytics:context:${intent.orderId || id}` },
        create: { eventType: ANALYTICS_CONTEXT, aggregateType: 'BILLING_INTENT', aggregateId: id,
          idempotencyKey: `analytics:context:${intent.orderId || id}`, payload: context as unknown as Prisma.InputJsonValue, availableAt: new Date(expiresAt) }, update: {} });
      if (intent.status === 'PAID') await this.paid(tx, intent);
    });
  }
  async captureOrder(id: string, userId: string, context: AnalyticsContext) {
    if (!this.transport.enabled) return;
    const expiresAt = analyticsDeadline(context, Date.now());
    if (expiresAt <= Date.now()) return;
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM commerce_orders WHERE id = ${id}::uuid FOR UPDATE`;
      const order = await tx.commerceOrder.findFirst({ where: { id, patient: { userId } }, select: { id: true, totalAmountToman: true, payment: { select: { verifiedAt: true } } } });
      if (!order) return;
      await tx.outboxEvent.upsert({ where: { idempotencyKey: `analytics:context:${id}` }, create: {
        eventType: ANALYTICS_CONTEXT, aggregateType: 'COMMERCE_ORDER', aggregateId: id,
        idempotencyKey: `analytics:context:${id}`, payload: context as unknown as Prisma.InputJsonValue, availableAt: new Date(expiresAt) }, update: {} });
      if (order.payment?.verifiedAt) await this.orderPaid(tx, id, order.payment.verifiedAt, order.totalAmountToman * 10n);
    });
  }
  async orderPaid(tx: Prisma.TransactionClient, orderId: string, at: Date, amountRial: bigint) {
    if (!this.transport.enabled || amountRial <= 0n) return;
    const context = await this.intentContext(tx, orderId);
    if (!context) return;
    const lines = await tx.commerceOrderLine.findMany({ where: { orderId }, select: { skuId: true, quantity: true }, take: 100 });
    await this.enqueue(tx, 'purchase', orderId, at, context, { transactionId: orderId, amountRial: amountRial.toString(),
      items: lines.map(line => ({ item_id: line.skuId || 'retired_sku', quantity: line.quantity })) });
  }
  async paid(tx: Prisma.TransactionClient, intent: BillingIntent) {
    if (!this.transport.enabled || intent.status !== 'PAID' || intent.purpose === 'TOPUP' || !intent.paidAt) return;
    if (intent.orderId) { await this.orderPaid(tx, intent.orderId, intent.paidAt, intent.amountRial); return; }
    const context = await this.intentContext(tx, intent.id);
    if (!context) return;
    if (intent.amountRial > 0n) await this.enqueue(tx, 'service_paid', intent.id, intent.paidAt, context);
    if (intent.purpose === 'APPOINTMENT' && intent.appointmentId) await this.enqueue(tx, 'booking_confirmed', intent.appointmentId, intent.paidAt, context);
  }
  async refund(tx: Prisma.TransactionClient, intent: BillingIntent, refundId: string, amountRial: bigint) {
    if (!this.transport.enabled || intent.purpose === 'TOPUP') return;
    const context = await this.intentContext(tx, intent.orderId || intent.id);
    if (context) await this.enqueue(tx, 'refund', refundId, new Date(), context,
      { transactionId: intent.orderId || intent.id, amountRial: amountRial.toString() });
  }
  private async intentContext(tx: Prisma.TransactionClient, id: string) {
    const row = await tx.outboxEvent.findUnique({ where: { idempotencyKey: `analytics:context:${id}` } });
    if (!row || row.availableAt.getTime() <= Date.now()) return null;
    return parseAnalyticsContext(row.payload, this.transport.measurementId, Date.now(), ANALYTICS_TTL_MS);
  }
  async enqueue(tx: Prisma.TransactionClient, event: AnalyticsEvent, resourceId: string, at: Date, context: AnalyticsContext,
    financial: { transactionId?: string; amountRial?: string; items?: Array<{ item_id: string; quantity: number }> } = {}) {
    if (!this.transport.enabled) return;
    const occurredAt = at.getTime();
    const payload: AnalyticsDelivery = { context, event, occurredAt, expiresAt: analyticsDeadline(context, occurredAt), ...financial };
    if (!measurementPayload(payload, this.transport.measurementId)) return;
    const key = `analytics:ga4:${event}:${resourceId}`;
    await tx.outboxEvent.upsert({ where: { idempotencyKey: key }, create: { eventType: ANALYTICS_DELIVERY,
      aggregateType: 'ANALYTICS', aggregateId: resourceId, idempotencyKey: key, payload: payload as unknown as Prisma.InputJsonValue }, update: {} });
  }
  async bestEffort(action: () => Promise<unknown>) {
    try { await action(); } catch { this.logger.warn({ code: 'ANALYTICS_CAPTURE_FAILED' }); }
  }
}
