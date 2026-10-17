import { Injectable, OnModuleInit } from '@nestjs/common';
import type { BillingIntent, PatientProfile } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { BillingTargetRegistry, type BillingTarget, type PreparedTarget } from '../../billing/billing-target.registry';
import { financialConflict, financialMissing, lockFinancial, type FinancialContext, type Tx } from '../../billing/billing.policy';
import { CommerceInventoryService } from '../inventory/commerce-inventory.service';

@Injectable()
export class OrderBillingTarget implements BillingTarget, OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly registry: BillingTargetRegistry, private readonly inventory: CommerceInventoryService) {}
  onModuleInit() { this.registry.register('ORDER', this); }
  async prepare(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget> {
    const order = await this.prisma.commerceOrder.findFirst({ where: { id: input.orderId, patientId: patient.id, clinicId: patient.clinicId }, include: { payment: true } });
    if (!order) throw financialMissing();
    if (order.status !== 'PENDING_PAYMENT' || order.payment) throw financialConflict();
    return { amountRial: order.totalAmountToman * 10n, orderId: order.id, snapshot: { orderNumber: order.orderNumber.toString(), amountToman: order.totalAmountToman.toString() } };
  }
  async reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget) {
    if (!prepared.orderId) throw financialMissing();
    await this.lock(tx, { orderId: prepared.orderId } as BillingIntent);
    const order = await tx.commerceOrder.findFirst({ where: { id: prepared.orderId, patientId: patient.id, status: 'PENDING_PAYMENT', payment: null } });
    if (!order || order.totalAmountToman * 10n !== prepared.amountRial) throw financialConflict();
    return { kind: 'NONE' } as const;
  }
  async lock(tx: Tx, intent: BillingIntent) { await lockFinancial(tx, `billing-order:${intent.orderId}`); await tx.$queryRaw`SELECT id FROM commerce_orders WHERE id = ${intent.orderId}::uuid FOR UPDATE`; }
  async canSettle(tx: Tx, intent: BillingIntent) {
    if (!intent.orderId) return false;
    const order = await tx.commerceOrder.findUnique({ where: { id: intent.orderId }, include: { payment: true, reservations: true } });
    return Boolean(order && order.status === 'PENDING_PAYMENT' && !order.payment && order.totalAmountToman * 10n === intent.amountRial && order.reservations.length && order.reservations.every(r => r.status === 'ACTIVE' && (!r.expiresAt || r.expiresAt > new Date())));
  }
  async settle(tx: Tx, intent: BillingIntent, _context: FinancialContext, journalId?: string, gatewayAttemptId?: string) {
    if (!intent.orderId || !(await this.canSettle(tx, intent))) throw financialConflict();
    const attempt = intent.method === 'GATEWAY' ? await tx.billingGatewayAttempt.findFirstOrThrow({ where: { id: gatewayAttemptId, intentId: intent.id, status: 'VERIFYING' } }) : null;
    await tx.payment.create({ data: { orderId: intent.orderId, method: intent.method ?? 'FREE', walletJournalId: journalId, billingAttemptId: attempt?.id, commerceAmountToman: intent.amountRial / 10n, providerAmount: attempt?.amountRial, providerUnit: attempt ? 'RIAL' : null, providerReferenceId: attempt?.reference, providerTraceNumber: attempt?.traceNumber, verifiedAt: new Date() } });
    await this.inventory.consumeOrderReservations(tx, intent.orderId);
    await tx.commerceOrder.update({ where: { id: intent.orderId }, data: { status: 'PAID' } });
    return { kind: 'NONE' } as const;
  }
  async refund(tx: Tx, intent: BillingIntent, amountRial: bigint, refundId: string) {
    if (!intent.orderId || amountRial % 10n) throw financialConflict();
    const payment = await tx.payment.findUniqueOrThrow({ where: { orderId: intent.orderId } });
    await tx.refund.create({ data: { id: refundId, paymentId: payment.id, amountToman: amountRial / 10n, status: 'COMPLETED', idempotencyKey: `billing:${refundId}`, approvedAt: new Date(), completedAt: new Date(), evidenceReference: `billing-refund:${refundId}` } });
    const total = await tx.refund.aggregate({ where: { paymentId: payment.id, status: 'COMPLETED' }, _sum: { amountToman: true } });
    await tx.payment.update({ where: { id: payment.id }, data: { status: (total._sum.amountToman ?? 0n) >= payment.commerceAmountToman ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } });
  }
}
