import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PaymentProviderPort, ProviderCallback, ProviderVerifyResult } from './payment-provider.port';
import { PaymentProviderOrderIdService } from './payment-provider-order-id.service';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { PaymentVerificationService } from './payment-verification.service';

const invalid = () => new ConflictException({ code: 'PAYMENT_ATTEMPT_INVALID', message: 'Payment attempt input is invalid.', details: {} });
const mismatch = () => new ConflictException({ code: 'PAYMENT_VERIFICATION_MISMATCH', message: 'Payment callback did not match the immutable attempt.', details: {} });

/**
 * Internal orchestration seam. Production routes remain fail-closed until a provider is go-live-ready;
 * integration tests inject a synthetic port here to prove the immutable attempt lifecycle without a network.
 */
@Injectable()
export class PaymentAttemptOrchestrationService {
  constructor(private readonly prisma: PrismaService, private readonly registry: PaymentProviderRegistry, private readonly orderIds: PaymentProviderOrderIdService, private readonly verification: PaymentVerificationService) {}

  async createAttempt(input: { patientId: string; orderId: string; providerConfigRevisionId: string; provider: PaymentProviderPort; idempotencyKey: string; providerAmount: bigint; providerUnit: string; credential: Record<string, string>; returnUrl?: string; redirectProfile?: string; requestTimeoutMs?: number }) {
    if (!input.idempotencyKey || input.idempotencyKey.length > 240 || input.providerAmount <= 0n || input.providerUnit === 'UNCONFIRMED') throw invalid();
    this.registry.require(input.provider, 'createPayment');
    const prepared = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`${input.patientId}:${input.idempotencyKey}`}))`);
      const existing = await tx.paymentAttempt.findUnique({ where: { patientId_idempotencyKey: { patientId: input.patientId, idempotencyKey: input.idempotencyKey } } });
      if (existing) {
        if (existing.orderId !== input.orderId || existing.providerConfigRevisionId !== input.providerConfigRevisionId) throw invalid();
        return { attempt: existing, shouldRequest: false };
      }
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`billing-order:${input.orderId}`}, 0))::text AS locked`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM commerce_orders WHERE id = ${input.orderId}::uuid FOR UPDATE`);
      const billingPending = await tx.billingGatewayAttempt.count({ where: { intent: { orderId: input.orderId }, status: { in: ['CREATED', 'REDIRECT_READY', 'VERIFYING', 'REQUIRES_RECONCILIATION'] } } });
      if (billingPending) throw invalid();
      const order = await tx.commerceOrder.findFirst({ where: { id: input.orderId, patientId: input.patientId, status: 'PENDING_PAYMENT' }, select: { clinicId: true, totalAmountToman: true } });
      const revision = await tx.paymentProviderConfigRevision.findUnique({ where: { id: input.providerConfigRevisionId }, include: { config: true } });
      if (!order || !revision || revision.config.clinicId !== order.clinicId || revision.config.providerCode !== input.provider.descriptor.code || revision.providerUnit !== input.providerUnit) throw invalid();
      const providerOrderId = await this.orderIds.next(tx);
      const created = await tx.paymentAttempt.create({ data: { clinicId: order.clinicId, patientId: input.patientId, orderId: input.orderId, providerConfigRevisionId: revision.id, providerOrderId, commerceAmountToman: order.totalAmountToman, providerAmount: input.providerAmount, providerUnit: input.providerUnit, idempotencyKey: input.idempotencyKey } });
      return { attempt: created, shouldRequest: true };
    });
    if (!prepared.shouldRequest) {
      if (prepared.attempt.status !== 'CREATED') return prepared.attempt;
      return this.waitForRequestResult(prepared.attempt.id, input.requestTimeoutMs ?? 30_000);
    }
    let result;
    try {
      result = await input.provider.createPayment({ providerOrderId: prepared.attempt.providerOrderId, commerceAmountToman: prepared.attempt.commerceAmountToman, providerAmount: input.providerAmount, providerUnit: input.providerUnit, credential: input.credential, returnUrl: input.returnUrl, redirectProfile: input.redirectProfile });
    } catch {
      // A request timeout is ambiguous: retain this immutable attempt for reconciliation, never issue another OrderId.
      return this.prisma.paymentAttempt.update({ where: { id: prepared.attempt.id }, data: { status: 'REQUIRES_RECONCILIATION', providerResultCode: 'TIMEOUT' } });
    }
    if (result.providerResultCode !== '0') return this.prisma.paymentAttempt.update({ where: { id: prepared.attempt.id }, data: { status: 'FAILED', providerResultCode: result.providerResultCode } });
    if (!result.token || result.token.length > 512 || !result.redirectUrl) return this.prisma.paymentAttempt.update({ where: { id: prepared.attempt.id }, data: { status: 'REQUIRES_RECONCILIATION', providerResultCode: 'MALFORMED_RESPONSE' } });
    return this.prisma.paymentAttempt.update({ where: { id: prepared.attempt.id }, data: { status: 'REDIRECT_READY', providerToken: result.token, providerResultCode: result.providerResultCode } });
  }

  private async waitForRequestResult(attemptId: string, requestTimeoutMs: number) {
    const deadline = Date.now() + requestTimeoutMs + 500;
    let attempt = await this.prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    while (attempt.status === 'CREATED' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      attempt = await this.prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    }
    return attempt;
  }

  async processCallback(input: ProviderCallback) {
    let callbackMismatch = false;
    await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.paymentAttempt.findUnique({ where: { providerOrderId: input.providerOrderId } });
      if (!attempt) throw mismatch();
      if (attempt.providerToken !== input.token) {
        await tx.paymentAttempt.updateMany({ where: { id: attempt.id, payment: null, status: { not: 'VERIFIED' } }, data: { status: 'REQUIRES_RECONCILIATION', providerResultCode: input.resultCode } });
        callbackMismatch = true;
        return;
      }
      if (attempt.status === 'VERIFIED' || attempt.status === 'FAILED' || attempt.status === 'EXPIRED' || attempt.status === 'REQUIRES_RECONCILIATION') return;
      if (input.resultCode === '-1' || input.resultCode === '101') { await this.verification.recordNonSuccess(tx, { attemptId: attempt.id, resultCode: input.resultCode, verifiedAt: new Date() }); return; }
      if (input.resultCode !== '0') throw invalid();
      await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { in: ['CREATED', 'REDIRECT_READY', 'CALLBACK_RECEIVED', 'VERIFYING'] } }, data: { status: 'VERIFYING', callbackReceivedAt: new Date(), providerResultCode: input.resultCode } });
    });
    if (callbackMismatch) throw mismatch();
    return this.prisma.paymentAttempt.findUniqueOrThrow({ where: { providerOrderId: input.providerOrderId } });
  }

  async verifyAttempt(input: { attemptId: string; provider: PaymentProviderPort; providerUnit: string; credential: Record<string, string>; now: Date }) {
    if (input.providerUnit === 'UNCONFIRMED') throw invalid();
    this.registry.require(input.provider, 'verifyPayment');
    const attempt = await this.prisma.paymentAttempt.findUnique({ where: { id: input.attemptId }, select: { providerToken: true, providerOrderId: true } });
    if (!attempt?.providerToken) throw invalid();
    let result: ProviderVerifyResult;
    try { result = await input.provider.verifyPayment({ token: attempt.providerToken, credential: input.credential, providerOrderId: attempt.providerOrderId }); }
    catch { return this.prisma.$transaction((tx) => this.verification.recordNonSuccess(tx, { attemptId: input.attemptId, resultCode: 'TIMEOUT', verifiedAt: input.now })); }
    return this.prisma.$transaction(async (tx) => {
      if (result.resultCode === '0' || result.resultCode === '100') {
        if (result.providerOrderId === undefined || result.amount === undefined) throw invalid();
        return this.verification.finalize(tx, { attemptId: input.attemptId, providerOrderId: result.providerOrderId, providerAmount: result.amount, providerUnit: input.providerUnit, resultCode: result.resultCode, referenceId: result.referenceId, traceNumber: result.traceNumber, verifiedAt: input.now });
      }
      if (result.resultCode === '-1' || result.resultCode === '101') return this.verification.recordNonSuccess(tx, { attemptId: input.attemptId, resultCode: result.resultCode, verifiedAt: input.now });
      return tx.paymentAttempt.updateMany({ where: { id: input.attemptId, payment: null, status: { not: 'VERIFIED' } }, data: { status: 'REQUIRES_RECONCILIATION', providerResultCode: result.resultCode } });
    });
  }

  /** Explicit, same-attempt retry for an ambiguous Verify timeout; scheduling/backoff ownership remains F12-T09. */
  async retryTimedOutVerify(input: { attemptId: string; provider: PaymentProviderPort; providerUnit: string; credential: Record<string, string>; now: Date }) {
    const attempt = await this.prisma.paymentAttempt.findUnique({ where: { id: input.attemptId }, select: { status: true, providerResultCode: true } });
    if (!attempt || attempt.status !== 'REQUIRES_RECONCILIATION' || attempt.providerResultCode !== 'TIMEOUT') throw invalid();
    await this.prisma.paymentAttempt.update({ where: { id: input.attemptId }, data: { status: 'VERIFYING' } });
    return this.verifyAttempt(input);
  }
}
