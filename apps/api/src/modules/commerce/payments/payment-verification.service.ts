import { AnalyticsService } from '../../analytics/analytics.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CommerceInventoryService } from '../inventory/commerce-inventory.service';
import { settleOrderCart } from '../checkout/settle-order-cart';

const mismatch = () => new ConflictException({ code: 'PAYMENT_VERIFICATION_MISMATCH', message: 'Payment verification did not match the immutable attempt.', details: {} });
const failed = () => new ConflictException({ code: 'PAYMENT_VERIFICATION_FAILED', message: 'Payment verification was not successful.', details: {} });

@Injectable()
export class PaymentVerificationService {
  constructor(private readonly inventory: CommerceInventoryService, private readonly analytics: AnalyticsService) {}
  /** Non-success outcomes are persisted without creating Payment or changing Order to PAID. */
  async recordNonSuccess(tx: Prisma.TransactionClient, input: { attemptId: string; resultCode: '-1' | '101' | 'TIMEOUT'; verifiedAt: Date }) {
    const status = input.resultCode === '-1' ? 'FAILED' : input.resultCode === '101' ? 'EXPIRED' : 'REQUIRES_RECONCILIATION';
    return tx.paymentAttempt.updateMany({ where: { id: input.attemptId, payment: null, status: { not: 'VERIFIED' } }, data: { status, providerResultCode: input.resultCode, ...(input.resultCode === 'TIMEOUT' ? {} : { verifiedAt: input.verifiedAt }) } });
  }
  /** Internal-only: callers must have verified provider output before entering this transaction. */
  async finalize(tx: Prisma.TransactionClient, input: { attemptId: string; providerOrderId: bigint; providerAmount: bigint; providerUnit: string; resultCode: string; referenceId?: string; traceNumber?: string; verifiedAt: Date }) {
    if (input.resultCode !== '0' && input.resultCode !== '100') throw failed();
    const attempt = await tx.paymentAttempt.findUnique({ where: { id: input.attemptId }, include: { payment: true } });
    if (!attempt || attempt.providerOrderId !== input.providerOrderId || attempt.providerAmount !== input.providerAmount || attempt.providerUnit !== input.providerUnit || attempt.providerUnit === 'UNCONFIRMED') throw mismatch();
    if (attempt.payment) return attempt.payment;
    if (attempt.status !== 'VERIFYING') throw mismatch();
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`billing-order:${attempt.orderId}`}, 0))::text AS locked`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM commerce_orders WHERE id = ${attempt.orderId}::uuid FOR UPDATE`);
    const alreadyPaid = await tx.payment.findUnique({ where: { orderId: attempt.orderId } });
    if (alreadyPaid && alreadyPaid.paymentAttemptId !== attempt.id) throw mismatch();
    const payment = await tx.payment.upsert({ where: { orderId: attempt.orderId }, create: { orderId: attempt.orderId, paymentAttemptId: attempt.id, commerceAmountToman: attempt.commerceAmountToman, providerAmount: input.providerAmount, providerUnit: input.providerUnit, providerReferenceId: input.referenceId, providerTraceNumber: input.traceNumber, verifiedAt: input.verifiedAt }, update: {} });
    const changed = await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: 'VERIFIED' } }, data: { status: 'VERIFIED', providerResultCode: input.resultCode, verifiedAt: input.verifiedAt } });
    if (!changed.count) return payment;
    await this.inventory.consumeOrderReservations(tx, attempt.orderId);
    const order = await tx.commerceOrder.updateMany({ where: { id: attempt.orderId, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' } });
    if (order.count !== 1) throw mismatch();
    await settleOrderCart(tx, attempt.orderId);
    await this.analytics.orderPaid(tx, attempt.orderId, input.verifiedAt, attempt.commerceAmountToman * 10n);
    return payment;
  }
}
