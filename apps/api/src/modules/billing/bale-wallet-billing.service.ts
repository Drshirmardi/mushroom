import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { BillingIntent, PaymentProviderCredentialVersion } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PaymentCredentialCryptoService } from '../commerce/payments/payment-credential-crypto.service';
import { PaymentProviderOrderIdService } from '../commerce/payments/payment-provider-order-id.service';
import { BALE_TEST_WALLET_TOKEN, BaleWalletApi, parseBalePreCheckout, parseBaleSuccessfulPayment } from '../commerce/payments/bale-wallet-api';
import { BillingService } from './billing.service';
import { BillingTargetRegistry } from './billing-target.registry';
import { financialAudit, financialConflict, financialKey, lockFinancial, pendingAttempts, type Tx, type FinancialContext } from './billing.policy';

const unavailable = () => new ServiceUnavailableException({
  code: 'BALE_WALLET_UNAVAILABLE', message: 'Native Bale payment is not available.', details: {},
});
const invoicePayload = (id: string) => `bale:${id}`;
const payloadAttempt = (payload: string) => /^bale:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/iu.exec(payload)?.[1] ?? null;
const reconcilable = ['VERIFYING', 'REQUIRES_RECONCILIATION'];
const safeReference = (transactionId: string) => 'bale:' + createHash('sha256').update(transactionId).digest('hex');

@Injectable()
export class BaleWalletBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly targets: BillingTargetRegistry,
    private readonly orderIds: PaymentProviderOrderIdService,
    private readonly crypto: PaymentCredentialCryptoService,
    private readonly config: ConfigService,
  ) {}

  private bot() {
    const token = this.config.get<string>('BALE_BOT_TOKEN');
    if (!token) throw unavailable();
    return new BaleWalletApi(token);
  }

  private async configFor(clinicId: string) {
    if (this.config.get('BALE_AUTH_ENABLED') !== 'true' || !this.config.get<string>('BALE_WEBHOOK_SECRET')) throw unavailable();
    const config = await this.prisma.paymentProviderConfig.findUnique({
      where: { clinicId_providerCode: { clinicId, providerCode: 'bale_wallet' } },
      include: { activeRevision: { include: { credentialVersion: true } } },
    });
    if (!config?.enabled || !config.goLiveReady || !config.activeRevision?.goLiveReady ||
        config.activeRevision.providerUnit !== 'RIAL' || !config.activeRevision.credentialVersion) throw unavailable();
    return config.activeRevision;
  }

  private walletToken(version: PaymentProviderCredentialVersion) {
    const values = this.crypto.decrypt({
      encryptedPayload: version.encryptedPayload ? Buffer.from(version.encryptedPayload) : null,
      encryptionNonce: version.encryptionNonce ? Buffer.from(version.encryptionNonce) : null,
      authenticationTag: version.authenticationTag ? Buffer.from(version.authenticationTag) : null,
      encryptionKeyVersion: version.encryptionKeyVersion,
    });
    if (!values.walletToken || Object.keys(values).length !== 1) throw unavailable();
    if (this.config.get('NODE_ENV') === 'production' && values.walletToken === BALE_TEST_WALLET_TOKEN) throw unavailable();
    return values.walletToken;
  }

  /** Bind the payment payer to signed Bale identity saved on the durable access/refresh session. */
  private async payer(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, baleProviderUserId: true, expiresAt: true, revokedAt: true },
    });
    if (session?.userId !== userId || session.revokedAt || session.expiresAt <= new Date() ||
        !session.baleProviderUserId) throw financialConflict('BALE_SESSION_REQUIRED');
    const identity = await this.prisma.externalAuthIdentity.findUnique({
      where: { provider_providerUserId: { provider: 'BALE', providerUserId: session.baleProviderUserId } },
      select: { userId: true },
    });
    if (identity?.userId !== userId) throw financialConflict('BALE_IDENTITY_MISMATCH');
    return session.baleProviderUserId;
  }

  async available(userId: string, sessionId: string, intent: BillingIntent) {
    if (intent.status !== 'PENDING' || intent.amountRial <= 0n ||
        (intent.expiresAt && intent.expiresAt <= new Date())) return false;
    try {
      await this.payer(userId, sessionId);
      const revision = await this.configFor(intent.clinicId);
      this.walletToken(revision.credentialVersion!);
      this.bot();
    } catch { return false; }
    const active = await this.prisma.billingGatewayAttempt.findFirst({
      where: { intentId: intent.id, status: { in: pendingAttempts } },
      select: { revision: { select: { config: { select: { providerCode: true } } } }, status: true },
    });
    if (active && (active.revision.config.providerCode !== 'bale_wallet' || active.status !== 'REDIRECT_READY')) return false;
    const legacy = intent.orderId ? await this.prisma.paymentAttempt.count({
      where: { orderId: intent.orderId, status: { in: ['CREATED', 'REDIRECT_READY', 'CALLBACK_RECEIVED', 'VERIFYING', 'REQUIRES_RECONCILIATION'] } },
    }) : 0;
    return legacy === 0;
  }

  async create(userId: string, sessionId: string, intentId: string, rawKey: string | undefined, context: FinancialContext) {
    const key = financialKey(rawKey);
    const owned = await this.billing.owned(userId, intentId);
    const providerUserId = await this.payer(userId, sessionId);
    const revision = await this.configFor(owned.clinicId);
    const walletToken = this.walletToken(revision.credentialVersion!);
    const bot = this.bot();
    if (owned.amountRial <= 0n || owned.amountRial > BigInt(Number.MAX_SAFE_INTEGER)) throw financialConflict('BALE_AMOUNT_UNSUPPORTED');

    const prepared = await this.prisma.$transaction(async tx => {
      const intent = await this.billing.lockIntent(tx, intentId);
      const existing = await tx.billingGatewayAttempt.findUnique({
        where: { intentId_idempotencyKey: { intentId, idempotencyKey: key } },
        include: { revision: { include: { config: true } } },
      });
      if (existing) {
        if (existing.revision.config.providerCode !== 'bale_wallet' || existing.baleProviderUserId !== providerUserId) throw financialConflict('IDEMPOTENCY_KEY_REUSED');
        return { attempt: existing, requested: false };
      }
      if (intent.status !== 'PENDING' || (intent.expiresAt && intent.expiresAt <= new Date())) throw financialConflict('BILLING_HOLD_EXPIRED');
      const open = await tx.billingGatewayAttempt.findFirst({
        where: { intentId, status: 'REDIRECT_READY' },
        include: { revision: { select: { config: { select: { providerCode: true } } } } },
      });
      if (open?.revision.config.providerCode === 'bale_wallet' && open.baleProviderUserId === providerUserId) {
        return { attempt: open, requested: false };
      }
      const target = intent.purpose === 'TOPUP' ? null : this.targets.get(intent.purpose);
      await target?.lock(tx, intent);
      await this.billing.assertNoPending(tx, intent);
      if (target) {
        if (target.preparePayment && !await target.preparePayment(tx, intent)) throw financialConflict('COMMERCE_INVENTORY_INSUFFICIENT');
        if (!await target.canSettle(tx, intent)) throw financialConflict('BILLING_STATE_CONFLICT');
      }
      const providerOrderId = await this.orderIds.next(tx);
      const attempt = await tx.billingGatewayAttempt.create({
        data: { intentId, revisionId: revision.id, providerOrderId, amountRial: intent.amountRial,
          idempotencyKey: key, baleProviderUserId: providerUserId },
      });
      await financialAudit(tx, context, 'BALE_WALLET_ATTEMPT_CREATED', intentId, { attemptId: attempt.id });
      return { attempt, requested: true };
    });
    if (!prepared.requested) return this.view(prepared.attempt);
    try {
      const invoiceParams = await bot.createInvoiceLink({
        providerToken: walletToken, amountRial: prepared.attempt.amountRial, payload: invoicePayload(prepared.attempt.id),
        title: 'پرداخت دکتر شیرمردی', description: 'پرداخت امن خدمات و محصولات دکتر شیرمردی',
      });
      if (invoiceParams.length > 512) throw unavailable();
      await this.prisma.billingGatewayAttempt.updateMany({
        where: { id: prepared.attempt.id, status: 'CREATED', providerToken: null },
        data: { providerToken: invoiceParams, status: 'REDIRECT_READY', resultCode: 'INVOICE_CREATED' },
      });
    } catch {
      // Unknown network outcomes must not create another invoice with the same idempotency key.
      await this.prisma.billingGatewayAttempt.updateMany({
        where: { id: prepared.attempt.id, status: 'CREATED' },
        data: { status: 'REQUIRES_RECONCILIATION', resultCode: 'INVOICE_AMBIGUOUS' },
      });
    }
    return this.view(await this.prisma.billingGatewayAttempt.findUniqueOrThrow({ where: { id: prepared.attempt.id } }));
  }

  private view(attempt: { id: string; intentId: string; status: string; providerToken: string | null }) {
    return {
      id: attempt.id, intentId: attempt.intentId, status: attempt.status,
      invoiceParams: attempt.status === 'REDIRECT_READY' ? attempt.providerToken : null,
    };
  }

  /** Approval is durably associated with the provider transaction before calling the Bot API. */
  async handlePreCheckout(input: unknown) {
    const query = parseBalePreCheckout(input);
    const fingerprint = createHash('sha256').update(JSON.stringify([
      query.payload, query.providerUserId, query.currency, query.amountRial.toString(),
    ])).digest('hex');
    const approved = await this.prisma.$transaction(async tx => {
      await lockFinancial(tx, `bale-precheckout:${query.transactionId}`);
      const decision = await tx.balePrecheckoutDecision.findUnique({ where: { transactionId: query.transactionId } });
      if (decision) return decision.fingerprint === fingerprint && decision.approved;
      const approved = await this.approvePreCheckout(tx, query);
      await tx.balePrecheckoutDecision.create({ data: { transactionId: query.transactionId, fingerprint, approved } });
      return approved;
    }, { maxWait: 1_000, timeout: 3_500 });
    await this.bot().answerPreCheckoutQuery(query.transactionId, approved, approved ? undefined : 'این پرداخت معتبر نیست یا زمان سفارش پایان یافته است.');
  }

  private async approvePreCheckout(tx: Tx, query: ReturnType<typeof parseBalePreCheckout>) {
    const attemptId = payloadAttempt(query.payload);
    if (!attemptId || query.currency !== 'IRR') return false;
    const pointer = await tx.billingGatewayAttempt.findUnique({ where: { id: attemptId }, select: { intentId: true } });
    if (!pointer) return false;

    const intent = await this.billing.lockIntent(tx, pointer.intentId);
    const current = await tx.billingGatewayAttempt.findUniqueOrThrow({
      where: { id: attemptId }, include: { revision: { include: { config: true } } },
    });
    if (current.revision.config.providerCode !== 'bale_wallet' ||
        current.baleProviderUserId !== query.providerUserId ||
        current.amountRial !== query.amountRial || intent.amountRial !== query.amountRial ||
        intent.currency !== 'IRR') return false;
    if (current.baleTransactionId) return current.baleTransactionId === query.transactionId && Boolean(current.balePrecheckoutApprovedAt);
    if (current.status !== 'REDIRECT_READY' || intent.status !== 'PENDING' ||
        current.createdAt <= new Date(Date.now() - 20 * 60_000) ||
        (intent.expiresAt && intent.expiresAt <= new Date())) return false;
    const bound = await tx.billingGatewayAttempt.findUnique({
      where: { baleTransactionId: query.transactionId }, select: { id: true },
    });
    if (bound) return false;
    const target = intent.purpose === 'TOPUP' ? null : this.targets.get(intent.purpose);
    await target?.lock(tx, intent);
    if (intent.orderId && await tx.paymentAttempt.count({
      where: { orderId: intent.orderId, status: { in: ['CREATED', 'REDIRECT_READY', 'CALLBACK_RECEIVED', 'VERIFYING', 'REQUIRES_RECONCILIATION'] } },
    })) return false;
    if (target && ((target.preparePayment && !await target.preparePayment(tx, intent)) || !await target.canSettle(tx, intent))) return false;
    const saved = await tx.billingGatewayAttempt.updateMany({
      where: { id: attemptId, status: 'REDIRECT_READY', baleTransactionId: null },
      data: { status: 'REQUIRES_RECONCILIATION', baleTransactionId: query.transactionId,
        balePrecheckoutApprovedAt: new Date(), resultCode: 'PRECHECKOUT_APPROVED' },
    });
    return saved.count === 1;
  }

  /** A successful-payment update triggers inquiry; only inquiry can settle money. */
  async handleSuccessfulPayment(input: unknown) {
    const successful = parseBaleSuccessfulPayment(input);
    const attemptId = payloadAttempt(successful.payload);
    if (!attemptId) return;
    const attempt = await this.prisma.billingGatewayAttempt.findUnique({
      where: { id: attemptId },
      select: { baleTransactionId: true, amountRial: true, status: true, revision: { select: { config: { select: { providerCode: true } } } } },
    });
    if (!attempt || attempt.revision.config.providerCode !== 'bale_wallet' ||
        attempt.baleTransactionId !== successful.transactionId || attempt.amountRial !== successful.amountRial) return;
    await this.reconcile(attemptId);
  }

  async reconcile(attemptId: string) {
    const attempt = await this.prisma.billingGatewayAttempt.findUnique({
      where: { id: attemptId },
      include: { revision: { include: { config: true } } },
    });
    if (!attempt || attempt.revision.config.providerCode !== 'bale_wallet' ||
        !attempt.baleTransactionId || !attempt.baleProviderUserId || !reconcilable.includes(attempt.status)) return;
    const proof = await this.bot().inquireTransaction(attempt.baleTransactionId);
    if (proof.id !== attempt.baleTransactionId || proof.providerUserId !== attempt.baleProviderUserId ||
        proof.amountRial !== attempt.amountRial) {
      await this.prisma.billingGatewayAttempt.updateMany({
        where: { id: attemptId, status: { in: reconcilable } },
        data: { status: 'REQUIRES_RECONCILIATION', resultCode: 'BALE_PROOF_MISMATCH' },
      });
      return;
    }
    if (proof.status === 'pending') return;
    if (proof.status !== 'paid') {
      await this.prisma.billingGatewayAttempt.updateMany({
        where: { id: attemptId, status: { in: reconcilable } },
        data: { status: 'FAILED', resultCode: `BALE_${proof.status.toUpperCase()}` },
      });
      return;
    }
    try {
      const intent = await this.prisma.billingIntent.findUniqueOrThrow({ where: { id: attempt.intentId } });
      const valid = intent.purpose === 'TOPUP' ? true : await this.targets.get(intent.purpose).validateSettlement?.(intent) ?? true;
      await this.prisma.$transaction(async tx => {
        await this.billing.lockIntent(tx, attempt.intentId);
        const changed = await tx.billingGatewayAttempt.updateMany({
          where: { id: attemptId, status: { in: reconcilable } },
          data: { status: 'VERIFYING' },
        });
        if (!changed.count) return;
        await this.billing.settleGateway(tx, attemptId, {
          resultCode: '0', providerOrderId: attempt.providerOrderId, amount: proof.amountRial,
          referenceId: safeReference(proof.id),
        }, valid);
      }, { timeout: 15_000 });
    } catch {
      await this.prisma.billingGatewayAttempt.updateMany({
        where: { id: attemptId, status: { in: reconcilable } },
        data: { status: 'REQUIRES_RECONCILIATION', resultCode: 'BALE_SETTLEMENT_RETRY' },
      });
    }
  }

  /** Failed or pending native invoices never flow through Sadad's verification routine. */
  async maintain(limit = 10) {
    const now = new Date();
    const before = new Date(now.getTime() - 30_000);
    await this.prisma.billingGatewayAttempt.updateMany({
      where: {
        baleProviderUserId: { not: null }, baleTransactionId: null,
        OR: [
          { status: { in: ['CREATED', 'REQUIRES_RECONCILIATION'] }, createdAt: { lte: new Date(now.getTime() - 120_000) } },
          { status: 'REDIRECT_READY', OR: [
            { createdAt: { lte: new Date(now.getTime() - 20 * 60_000) } },
            { intent: { OR: [{ expiresAt: { lte: now } }, { status: { not: 'PENDING' } }] } },
          ] },
        ],
      },
      data: { status: 'FAILED', resultCode: 'BALE_INVOICE_EXPIRED' },
    });
    const due = {
      baleTransactionId: { not: null }, status: { in: reconcilable },
      balePrecheckoutApprovedAt: { lt: before },
      OR: [{ baleLastInquiredAt: null }, { baleLastInquiredAt: { lt: before } }],
    };
    const rows = await this.prisma.billingGatewayAttempt.findMany({
      where: due, orderBy: [{ baleLastInquiredAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
      take: limit, select: { id: true },
    });
    for (const attempt of rows) {
      const claimed = await this.prisma.billingGatewayAttempt.updateMany({
        where: { id: attempt.id, ...due }, data: { baleLastInquiredAt: new Date() },
      });
      if (!claimed.count) continue;
      try { await this.reconcile(attempt.id); }
      catch { /* Retry after the current inquiry interval. */ }
    }
    return rows.length;
  }
}
