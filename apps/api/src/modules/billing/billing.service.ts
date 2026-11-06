import { AnalyticsService } from '../analytics/analytics.service';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { type BillingIntent, Prisma } from '../../generated/prisma/client';
import { BillingTargetRegistry, billingReservationFields, billingSettlementFields, type PreparedTarget } from './billing-target.registry';
import { WalletService } from './wallet.service';
import { FinancialContext, Tx, financialAudit, financialConflict, financialKey, financialMissing, fingerprint, lockFinancial, money, moneyRial, pendingAttempts, reasonText } from './billing.policy';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService, private readonly wallet: WalletService, private readonly targets: BillingTargetRegistry, private readonly analytics: AnalyticsService) {}

  async create(userId: string, purpose: 'TOPUP' | 'ORDER' | 'APPOINTMENT' | 'ASSESSMENT' | 'PROGRAM' | 'ENTRY_ASSESSMENT', input: Record<string, string>, rawKey: string | undefined, context: FinancialContext) {
    const patient = await this.wallet.patient(userId); const key = financialKey(rawKey); const hash = fingerprint({ patientId: patient.id, purpose, input });
    const actorUserId = context.actorUserId;
    if (['ASSESSMENT', 'PROGRAM', 'ENTRY_ASSESSMENT'].includes(purpose) && (actorUserId !== patient.userId || !context.actorSessionId)) throw financialConflict();
    const previous = await this.prisma.billingIntent.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId, idempotencyKey: key } } });
    if (previous) { if (previous.fingerprint !== hash || previous.patientId !== patient.id) throw financialConflict('IDEMPOTENCY_KEY_REUSED'); return this.view(previous); }
    const prepared: PreparedTarget = purpose === 'TOPUP' ? { amountRial: money(input.amountToman), snapshot: {} } : await this.targets.get(purpose).prepare(patient, input);
    return this.prisma.$transaction(async tx => {
      await lockFinancial(tx, `billing-create:${actorUserId}:${key}`);
      const existing = await tx.billingIntent.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId, idempotencyKey: key } } });
      if (existing) { if (existing.fingerprint !== hash) throw financialConflict('IDEMPOTENCY_KEY_REUSED'); return this.view(existing); }
      if ('orderId' in prepared && prepared.orderId) {
        await lockFinancial(tx, `billing-order:${prepared.orderId}`);
        const orderIntent = await tx.billingIntent.findUnique({ where: { orderId: prepared.orderId } });
        if (orderIntent) { if (orderIntent.patientId !== patient.id) throw financialMissing(); return this.view(orderIntent); }
      }
      const reservation = purpose === 'TOPUP' ? { kind: 'NONE' } as const : await this.targets.get(purpose).reserve(tx, patient, prepared);
      const intent = await tx.billingIntent.create({ data: { patientId: patient.id, clinicId: patient.clinicId, purpose,
        amountRial: prepared.amountRial, snapshot: prepared.snapshot, orderId: prepared.orderId, expiresAt: prepared.expiresAt,
        ...billingReservationFields(purpose, reservation), actorUserId, idempotencyKey: key, fingerprint: hash } });
      await financialAudit(tx, context, 'BILLING_INTENT_CREATED', intent.id, { purpose, amountRial: intent.amountRial.toString() });
      if (intent.amountRial === 0n && purpose !== 'TOPUP') {
        const settlement = await this.targets.get(purpose).settle(tx, intent, context);
        return this.view(await tx.billingIntent.update({ where: { id: intent.id }, data: { status: 'PAID', method: 'FREE', paidAt: new Date(), ...billingSettlementFields(purpose, settlement) } }));
      }
      return this.view(intent);
    }, { timeout: 15_000 });
  }

  async owned(userId: string, id: string) {
    const patient = await this.wallet.patient(userId);
    const intent = await this.prisma.billingIntent.findFirst({ where: { id, patientId: patient.id, clinicId: patient.clinicId } });
    if (!intent) throw financialMissing();
    return intent;
  }

  async get(userId: string, id: string) {
    const intent = await this.owned(userId, id);
    return this.detail(intent);
  }

  async adminGet(actor: string, id: string) {
    const intent = await this.prisma.billingIntent.findUnique({ where: { id } });
    if (!intent) throw financialMissing();
    await this.wallet.adminPatient(actor, intent.patientId);
    return { ...await this.detail(intent), patientId: intent.patientId };
  }

  private async detail(intent: BillingIntent) {
    const id = intent.id;
    const attempts = await this.prisma.billingGatewayAttempt.findMany({ where: { intentId: id }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, status: true, reference: true, traceNumber: true, verifiedAt: true } });
    const refunds = await this.prisma.billingRefund.findMany({ where: { intentId: id }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, status: true, amountRial: true, completedAt: true } });
    return { ...this.view(intent), attempts, refunds: refunds.map(row => ({ ...row, amountRial: row.amountRial.toString() })) };
  }

  async payWallet(userId: string, id: string, rawKey: string | undefined, context: FinancialContext) {
    const owned = await this.owned(userId, id); const key = financialKey(rawKey); const hash = fingerprint({ id, method: 'WALLET' });
    const validation = owned.purpose === 'TOPUP' ? false : await this.targets.get(owned.purpose).validateSettlement?.(owned) ?? true;
    return this.prisma.$transaction(async tx => {
      await lockFinancial(tx, `wallet-command:${userId}:${key}`);
      const command = await tx.walletCommand.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId: userId, idempotencyKey: key } } });
      if (command) { if (command.fingerprint !== hash) throw financialConflict('IDEMPOTENCY_KEY_REUSED'); return command.response; }
      if (!validation) throw financialConflict('BOOKING_INELIGIBLE');
      const intent = await this.lockIntent(tx, id);
      if (intent.purpose === 'TOPUP' || intent.status !== 'PENDING') throw financialConflict();
      await this.targets.get(intent.purpose).lock(tx, intent);
      await this.assertNoPending(tx, intent);
      const target = this.targets.get(intent.purpose);
      if (target.preparePayment && !await target.preparePayment(tx, intent)) throw financialConflict('COMMERCE_INVENTORY_INSUFFICIENT');
      if (!(await target.canSettle(tx, intent))) throw financialConflict('BILLING_HOLD_EXPIRED');
      const patient = await tx.patientProfile.findUniqueOrThrow({ where: { id: intent.patientId } });
      const journal = await this.wallet.post(tx, patient, -intent.amountRial, 'PAYMENT', `intent:${id}:debit`, context);
      const settlement = await this.targets.get(intent.purpose).settle(tx, { ...intent, method: 'WALLET' }, context, journal.id);
      const updated = await tx.billingIntent.update({ where: { id }, data: { status: 'PAID', method: 'WALLET', paidAt: new Date(), ...billingSettlementFields(intent.purpose, settlement) } });
      await this.analytics.paid(tx, updated);
      await financialAudit(tx, context, 'BILLING_WALLET_PAID', id, { amountRial: intent.amountRial.toString(), journalId: journal.id });
      const response = this.view(updated);
      await tx.walletCommand.create({ data: { actorUserId: userId, idempotencyKey: key, fingerprint: hash, response } });
      return response;
    }, { timeout: 15_000 });
  }

  async assertNoPending(tx: Tx, intent: BillingIntent) {
    const ownAttempts = await tx.billingGatewayAttempt.count({ where: { intentId: intent.id, status: { in: pendingAttempts } } });
    const legacy = intent.orderId ? await tx.paymentAttempt.count({ where: { orderId: intent.orderId, status: { in: ['CREATED', 'REDIRECT_READY', 'CALLBACK_RECEIVED', 'VERIFYING', 'REQUIRES_RECONCILIATION'] } } }) : 0;
    if (ownAttempts || legacy) throw financialConflict('BILLING_PAYMENT_PENDING');
  }

  async cancel(userId: string, id: string, rawKey: string | undefined, context: FinancialContext) {
    await this.owned(userId, id); const key = financialKey(rawKey); const hash = fingerprint({ id, action: 'CANCEL_INTENT' });
    return this.prisma.$transaction(async tx => {
      await lockFinancial(tx, `wallet-command:${userId}:${key}`);
      const previous = await tx.walletCommand.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId: userId, idempotencyKey: key } } });
      if (previous) { if (previous.fingerprint !== hash) throw financialConflict('IDEMPOTENCY_KEY_REUSED'); return previous.response; }
      const intent = await this.lockIntent(tx, id);
      if (intent.status !== 'PENDING') throw financialConflict();
      if (intent.purpose !== 'TOPUP') await this.targets.get(intent.purpose).lock(tx, intent);
      await this.assertNoPending(tx, intent);
      if (intent.holdId) await tx.appointmentHold.update({ where: { id: intent.holdId }, data: { releasedAt: new Date() } });
      if (intent.purpose !== 'TOPUP') await this.targets.get(intent.purpose).cancel?.(tx, intent);
      const updated = await tx.billingIntent.update({ where: { id }, data: { status: 'CANCELLED' } });
      await financialAudit(tx, context, 'BILLING_INTENT_CANCELLED', id, {});
      const response = this.view(updated);
      await tx.walletCommand.create({ data: { actorUserId: userId, idempotencyKey: key, fingerprint: hash, response } });
      return response;
    });
  }

  async lockIntent(tx: Tx, id: string) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM billing_intents WHERE id = ${id}::uuid FOR UPDATE`);
    const intent = await tx.billingIntent.findUnique({ where: { id } });
    if (!intent) throw financialMissing();
    return intent;
  }

  async settleGateway(tx: Tx, attemptId: string, proof: { providerOrderId: bigint; amount: bigint; resultCode: string; referenceId?: string; traceNumber?: string }, eligibilityValid = true) {
    const pointer = await tx.billingGatewayAttempt.findUniqueOrThrow({ where: { id: attemptId }, select: { intentId: true } });
    const intent = await this.lockIntent(tx, pointer.intentId);
    const attempt = await tx.billingGatewayAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    if (attempt.status === 'VERIFIED') return this.view(intent);
    if (!['0', '100'].includes(proof.resultCode) || proof.providerOrderId !== attempt.providerOrderId || proof.amount !== attempt.amountRial || proof.amount !== intent.amountRial) throw financialConflict('PAYMENT_VERIFICATION_MISMATCH');
    if (!['VERIFYING', 'REQUIRES_RECONCILIATION'].includes(attempt.status)) throw financialConflict();
    const context: FinancialContext = { actorUserId: intent.actorUserId, actorSessionId: null, requestId: `billing-verify:${attempt.id}`, ipAddress: null };
    const patient = await tx.patientProfile.findUniqueOrThrow({ where: { id: intent.patientId } });
    let canSettle = intent.status === 'PENDING' && eligibilityValid;
    if (intent.purpose !== 'TOPUP') { await this.targets.get(intent.purpose).lock(tx, intent); const target = this.targets.get(intent.purpose); canSettle = canSettle && (!target.preparePayment || await target.preparePayment(tx, intent)) && await target.canSettle(tx, intent); }
    await tx.billingGatewayAttempt.update({ where: { id: attempt.id }, data: { reference: proof.referenceId, traceNumber: proof.traceNumber, verifiedAt: new Date() } });
    let settlementFields: { appointmentId?: string } = {};
    if (intent.purpose === 'TOPUP' || !canSettle) {
      if (!canSettle && intent.status === 'PENDING' && intent.purpose === 'ORDER') await this.targets.get(intent.purpose).cancel?.(tx, intent);
      await this.wallet.post(tx, patient, intent.amountRial, canSettle ? 'TOPUP' : 'LATE_PAYMENT_CREDIT', `gateway:${attempt.id}:credit`, context);
    } else {
      const settlement = await this.targets.get(intent.purpose).settle(tx, { ...intent, method: 'GATEWAY' }, context, undefined, attempt.id);
      settlementFields = billingSettlementFields(intent.purpose, settlement);
    }
    await tx.billingGatewayAttempt.update({ where: { id: attempt.id }, data: { status: 'VERIFIED', resultCode: proof.resultCode, compensated: !canSettle } });
    const updated = intent.status === 'PAID' ? intent : await tx.billingIntent.update({ where: { id: intent.id }, data: { status: canSettle ? 'PAID' : 'COMPENSATED', method: 'GATEWAY', paidAt: new Date(), ...settlementFields } });
    await this.analytics.paid(tx, updated);
    await financialAudit(tx, context, 'BILLING_GATEWAY_SETTLED', intent.id, { amountRial: intent.amountRial.toString(), compensated: !canSettle });
    return this.view(updated);
  }

  async refund(context: FinancialContext, id: string, amountRial: string, reason: string, rawKey: string | undefined) {
    const original = await this.prisma.billingIntent.findUnique({ where: { id } });
    if (!original) throw financialMissing();
    await this.wallet.adminPatient(context.actorUserId, original.patientId);
    return this.prisma.$transaction(tx => this.refundInTransaction(tx, context, id, moneyRial(amountRial), reasonText(reason), financialKey(rawKey)), { timeout: 15_000 });
  }

  async refundInTransaction(tx: Tx, context: FinancialContext, id: string, amountRial: bigint, reason: string, key: string) {
    const intent = await this.lockIntent(tx, id); const hash = fingerprint({ amountRial: amountRial.toString(), reason });
    if (['ASSESSMENT','ENTRY_ASSESSMENT'].includes(intent.purpose)) throw financialConflict('ASSESSMENT_REFUND_NOT_ALLOWED');
    if (intent.purpose === 'PROGRAM') throw financialConflict('PROGRAM_REFUND_NOT_ALLOWED');
    const old = await tx.billingRefund.findUnique({ where: { intentId_idempotencyKey: { intentId: id, idempotencyKey: key } } });
    if (old) { if (old.fingerprint !== hash) throw financialConflict('IDEMPOTENCY_KEY_REUSED'); return this.refundView(old); }
    if (intent.status !== 'PAID' || intent.purpose === 'TOPUP' || amountRial <= 0n) throw financialConflict();
    const held = await tx.billingRefund.aggregate({ where: { intentId: id, status: { in: ['COMPLETED', 'MANUAL_REQUIRED'] } }, _sum: { amountRial: true } });
    if (amountRial + (held._sum.amountRial ?? 0n) > intent.amountRial) throw financialConflict('BILLING_REFUND_EXCEEDS_PAYMENT');
    const refundId = randomUUID();
    const patient = await tx.patientProfile.findUniqueOrThrow({ where: { id: intent.patientId } });
    const journal = intent.method === 'WALLET' ? await this.wallet.post(tx, patient, amountRial, 'REFUND', `refund:${refundId}`, context) : null;
    const refund = await tx.billingRefund.create({ data: { id: refundId, intentId: id, amountRial, reason, idempotencyKey: key, fingerprint: hash, status: journal ? 'COMPLETED' : 'MANUAL_REQUIRED', journalId: journal?.id, completedAt: journal ? new Date() : null } });
    if (journal) { await this.targets.get(intent.purpose).refund(tx, intent, amountRial, refund.id); await this.analytics.refund(tx, intent, refund.id, amountRial); }
    await financialAudit(tx, context, 'BILLING_REFUND_CREATED', refund.id, { amountRial: amountRial.toString(), status: refund.status });
    return this.refundView(refund);
  }

  async completeRefund(context: FinancialContext, refundId: string, evidence: string) {
    const row = await this.prisma.billingRefund.findUnique({ where: { id: refundId }, include: { intent: true } });
    if (!row) throw financialMissing();
    await this.wallet.adminPatient(context.actorUserId, row.intent.patientId); const reference = reasonText(evidence);
    return this.prisma.$transaction(async tx => {
      const intent = await this.lockIntent(tx, row.intentId);
      const current = await tx.billingRefund.findUniqueOrThrow({ where: { id: refundId } });
      if (current.status === 'COMPLETED') { if (current.evidenceReference !== reference) throw financialConflict('IDEMPOTENCY_KEY_REUSED'); return this.refundView(current); }
      if (current.status !== 'MANUAL_REQUIRED' || intent.method !== 'GATEWAY') throw financialConflict();
      const updated = await tx.billingRefund.update({ where: { id: refundId }, data: { status: 'COMPLETED', evidenceReference: reference, completedAt: new Date() } });
      await this.targets.get(intent.purpose).refund(tx, intent, current.amountRial, refundId);
      await this.analytics.refund(tx, intent, refundId, current.amountRial);
      await financialAudit(tx, context, 'BILLING_REFUND_COMPLETED', refundId, { hasEvidence: true });
      return this.refundView(updated);
    });
  }

  async cancelAppointment(tx: Tx, appointmentId: string, context: FinancialContext) {
    const intent = await tx.billingIntent.findUnique({ where: { appointmentId } });
    if (!intent || intent.status !== 'PAID' || intent.amountRial === 0n) return;
    const held = await tx.billingRefund.aggregate({ where: { intentId: intent.id }, _sum: { amountRial: true } });
    const remaining = intent.amountRial - (held._sum.amountRial ?? 0n);
    if (remaining > 0n) await this.refundInTransaction(tx, context, intent.id, remaining, 'Appointment cancelled before service', `cancel:${appointmentId}`);
  }

  async assertReschedulePrice(tx: Tx, appointmentId: string, priceAmount: number) {
    const intent = await tx.billingIntent.findUnique({ where: { appointmentId } });
    if (intent?.status === 'PAID' && intent.amountRial !== BigInt(priceAmount)) throw financialConflict('APPOINTMENT_REPRICE_REQUIRED');
  }

  async expire(limit = 25) {
    return this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<Array<{ id: string; hold_id: string | null }>>(Prisma.sql`SELECT id, hold_id FROM billing_intents WHERE status = 'PENDING' AND expires_at <= now() ORDER BY expires_at LIMIT ${limit} FOR UPDATE SKIP LOCKED`);
      for (const row of rows) { if (row.hold_id) await tx.appointmentHold.update({ where: { id: row.hold_id }, data: { releasedAt: new Date() } }); await tx.billingIntent.update({ where: { id: row.id }, data: { status: 'EXPIRED' } }); }
      return rows.length;
    });
  }

  view(intent: BillingIntent) { return { id: intent.id, purpose: intent.purpose, status: intent.status, method: intent.method, amountRial: intent.amountRial.toString(), currency: 'IRR', orderId: intent.orderId, appointmentId: intent.appointmentId, expiresAt: intent.expiresAt?.toISOString() ?? null, paidAt: intent.paidAt?.toISOString() ?? null, createdAt: intent.createdAt.toISOString(), ...(intent.purpose === 'ASSESSMENT' ? { assessmentPurchaseId: intent.assessmentPurchaseId } : {}), ...(intent.purpose === 'PROGRAM' ? { programPurchaseId: intent.programPurchaseId } : {}) }; }
  private refundView(row: { id: string; status: string; amountRial: bigint; completedAt: Date | null }) { return { id: row.id, status: row.status, amountRial: row.amountRial.toString(), completedAt: row.completedAt?.toISOString() ?? null }; }
}
