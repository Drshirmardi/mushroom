import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PaymentProviderRegistry } from '../commerce/payments/payment-provider.registry';
import { PaymentCredentialCryptoService } from '../commerce/payments/payment-credential-crypto.service';
import { PaymentProviderOrderIdService } from '../commerce/payments/payment-provider-order-id.service';
import { SadadRuntimeConfigService } from '../commerce/payments/sadad-runtime-config.service';
import { buildSadadRedirect } from '../commerce/payments/sadad-payment-provider.adapter';
import { BillingService } from './billing.service';
import { BillingTargetRegistry } from './billing-target.registry';
import { financialAudit, financialConflict, financialKey, financialMissing, fingerprint, lockFinancial, pendingAttempts, reasonText, type FinancialContext } from './billing.policy';
import type { PaymentProviderCredentialVersion } from '../../generated/prisma/client';
import { WalletService } from './wallet.service';

@Injectable()
export class BillingGatewayService {
  constructor(private readonly prisma: PrismaService, private readonly billing: BillingService, private readonly targets: BillingTargetRegistry, private readonly registry: PaymentProviderRegistry, private readonly crypto: PaymentCredentialCryptoService, private readonly orderIds: PaymentProviderOrderIdService, private readonly runtime: SadadRuntimeConfigService, private readonly wallet: WalletService) {}

  async methods(userId: string, id: string) {
    const intent = await this.billing.owned(userId, id);
    const patient = await this.wallet.patient(userId); const summary = await this.wallet.summary(patient);
    const pending = intent.status === 'PENDING' && (!intent.expiresAt || intent.expiresAt > new Date());
    const config = await this.prisma.paymentProviderConfig.findFirst({ where: { clinicId: intent.clinicId, enabled: true, isDefault: true, goLiveReady: true, activeRevision: { goLiveReady: true, providerUnit: 'RIAL', credentialVersion: { encryptedPayload: { not: null } } } }, select: { id: true } });
    let live = false; try { live = this.runtime.live && Boolean(this.runtime.settings()); } catch { live = false; }
    return [
      ...(intent.purpose === 'TOPUP' ? [] : [{ code: 'WALLET', available: pending && !summary.frozen && BigInt(summary.balanceRial) >= intent.amountRial, balanceRial: summary.balanceRial }]),
      { code: 'GATEWAY', available: pending && live && Boolean(config) && intent.amountRial > 0n, balanceRial: null },
    ];
  }

  async create(userId: string, intentId: string, rawKey: string | undefined, context: FinancialContext) {
    const owned = await this.billing.owned(userId, intentId); const key = financialKey(rawKey);
    const old = await this.prisma.billingGatewayAttempt.findUnique({ where: { intentId_idempotencyKey: { intentId, idempotencyKey: key } } });
    if (old) return this.view(old);
    const settings = this.runtime.settings();
    const config = await this.prisma.paymentProviderConfig.findFirst({ where: { clinicId: owned.clinicId, enabled: true, isDefault: true, goLiveReady: true }, include: { activeRevision: { include: { credentialVersion: true } } } });
    const revision = config?.activeRevision;
    if (!config || config.providerCode !== 'sadad' || !revision?.goLiveReady || revision.providerUnit !== 'RIAL' || !revision.credentialVersion) throw new ServiceUnavailableException({ code: 'SADAD_GO_LIVE_BLOCKED', message: 'No enabled, ready payment provider is available.', details: {} });
    const credential = this.credential(revision.credentialVersion);
    const prepared = await this.prisma.$transaction(async tx => {
      const intent = await this.billing.lockIntent(tx, intentId);
      const existing = await tx.billingGatewayAttempt.findUnique({ where: { intentId_idempotencyKey: { intentId, idempotencyKey: key } } });
      if (existing) return { attempt: existing, request: false };
      if (intent.status !== 'PENDING' || (intent.expiresAt && intent.expiresAt <= new Date())) throw financialConflict('BILLING_HOLD_EXPIRED');
      if (intent.purpose !== 'TOPUP') { await this.targets.get(intent.purpose).lock(tx, intent); if (!(await this.targets.get(intent.purpose).canSettle(tx, intent))) throw financialConflict(); }
      await this.billing.assertNoPending(tx, intent);
      const providerOrderId = await this.orderIds.next(tx);
      const attempt = await tx.billingGatewayAttempt.create({ data: { intentId, revisionId: revision.id, providerOrderId, amountRial: intent.amountRial, idempotencyKey: key } });
      await financialAudit(tx, context, 'BILLING_GATEWAY_ATTEMPT_CREATED', intentId, { attemptId: attempt.id });
      return { attempt, request: true };
    });
    if (!prepared.request) return this.view(prepared.attempt);
    let result;
    try { result = await this.registry.resolve(config.providerCode).createPayment({ providerOrderId: prepared.attempt.providerOrderId, amountRial: prepared.attempt.amountRial, providerAmount: prepared.attempt.amountRial, providerUnit: 'RIAL', credential, returnUrl: settings.returnUrl, redirectProfile: settings.redirectProfile }); }
    catch { await this.prisma.billingGatewayAttempt.updateMany({ where: { id: prepared.attempt.id, status: 'CREATED' }, data: { status: 'REQUIRES_RECONCILIATION', resultCode: 'REQUEST_AMBIGUOUS' } }); return this.view(await this.prisma.billingGatewayAttempt.findUniqueOrThrow({ where: { id: prepared.attempt.id } })); }
    const safeToken = result.token && result.token.length <= 512 ? result.token : null;
    const status = result.providerResultCode !== '0' ? 'FAILED' : safeToken ? 'REDIRECT_READY' : 'REQUIRES_RECONCILIATION';
    // A callback may already have verified this payment while the request response was in flight.
    await this.prisma.billingGatewayAttempt.updateMany({ where: { id: prepared.attempt.id, status: { in: ['CREATED', 'REQUIRES_RECONCILIATION'] }, providerToken: null }, data: { status, providerToken: safeToken, resultCode: result.providerResultCode } });
    return this.view(await this.prisma.billingGatewayAttempt.findUniqueOrThrow({ where: { id: prepared.attempt.id } }));
  }

  owns(providerOrderId: bigint) { return this.prisma.billingGatewayAttempt.findUnique({ where: { providerOrderId }, select: { id: true } }); }

  async callback(body: Record<string, unknown>) {
    const settings = this.runtime.settings();
    const callback = this.registry.resolve('sadad').parseCallback(body);
    const attempt = await this.prisma.billingGatewayAttempt.findUnique({ where: { providerOrderId: callback.providerOrderId } });
    if (!attempt) throw financialMissing();
    if (!attempt.providerToken && attempt.status !== 'VERIFIED') {
      await this.recoverCallbackToken(attempt.id, callback.token);
    } else if (attempt.providerToken !== callback.token) throw financialConflict('PAYMENT_VERIFICATION_MISMATCH');
    // Browser result codes are hints; only server-to-server Verify decides the outcome.
    if (attempt.providerToken && attempt.status !== 'VERIFIED') {
      if (attempt.status === 'FAILED' && attempt.resultCode === 'MANUAL_FAILED') await this.prisma.billingGatewayAttempt.updateMany({ where: { id: attempt.id, status: 'FAILED', resultCode: 'MANUAL_FAILED' }, data: { status: 'REQUIRES_RECONCILIATION' } });
      await this.verify(attempt.id);
    }
    const redirect = new URL('/profile/wallet/payment-result', settings.resultUrl);
    redirect.searchParams.set('intentId', attempt.intentId);
    return { redirectUrl: redirect.toString() };
  }

  async verify(attemptId: string) {
    const attempt = await this.prisma.billingGatewayAttempt.findUnique({ where: { id: attemptId }, include: { revision: { include: { credentialVersion: true, config: true } } } });
    if (!attempt) throw financialMissing();
    if (attempt.status === 'VERIFIED') return;
    if (!attempt.providerToken || !attempt.revision.credentialVersion) throw financialConflict('BILLING_PAYMENT_PENDING');
    const changed = await this.prisma.billingGatewayAttempt.updateMany({ where: { id: attemptId, status: { in: ['REDIRECT_READY', 'REQUIRES_RECONCILIATION', 'VERIFYING'] } }, data: { status: 'VERIFYING' } });
    if (!changed.count) return;
    let proof;
    try { proof = await this.registry.resolve(attempt.revision.config.providerCode).verifyPayment({ token: attempt.providerToken, credential: this.credential(attempt.revision.credentialVersion), providerOrderId: attempt.providerOrderId }); }
    catch { await this.ambiguous(attemptId, 'VERIFY_TIMEOUT'); return; }
    if ((proof.resultCode === '0' || proof.resultCode === '100') && proof.amount !== undefined && proof.providerOrderId !== undefined) {
      try {
        const intent = await this.prisma.billingIntent.findUniqueOrThrow({ where: { id: attempt.intentId } });
        const eligibilityValid = intent.purpose === 'TOPUP' ? true : await this.targets.get(intent.purpose).validateSettlement?.(intent) ?? true;
        return await this.prisma.$transaction(tx => this.billing.settleGateway(tx, attemptId, { ...proof, amount: proof.amount!, providerOrderId: proof.providerOrderId! }, eligibilityValid), { timeout: 15_000 });
      }
      catch { await this.ambiguous(attemptId, 'SETTLEMENT_RETRY'); return; }
    }
    const definitive = proof.resultCode === '-1' || proof.resultCode === '101';
    await this.prisma.billingGatewayAttempt.updateMany({ where: { id: attemptId, status: { not: 'VERIFIED' } }, data: { status: definitive ? 'FAILED' : 'REQUIRES_RECONCILIATION', resultCode: proof.resultCode } });
  }

  async retry(actorUserId: string, attemptId: string) {
    const attempt = await this.prisma.billingGatewayAttempt.findUnique({ where: { id: attemptId }, include: { intent: { select: { patientId: true } } } });
    if (!attempt) throw financialMissing();
    const allowed = await this.prisma.patientProfile.findFirst({ where: { id: attempt.intent.patientId, clinic: { clinicalClinicAccesses: { some: { userId: actorUserId } } } }, select: { id: true } });
    if (!allowed) throw financialMissing();
    await this.verify(attemptId);
    return this.view(await this.prisma.billingGatewayAttempt.findUniqueOrThrow({ where: { id: attemptId } }));
  }

  async resolveFailed(context: FinancialContext, attemptId: string, evidence: string, rawKey: string | undefined) {
    const pointer = await this.prisma.billingGatewayAttempt.findUnique({ where: { id: attemptId }, include: { intent: true } });
    if (!pointer) throw financialMissing();
    await this.wallet.adminPatient(context.actorUserId, pointer.intent.patientId);
    const key = financialKey(rawKey); const reference = reasonText(evidence); const hash = fingerprint({ attemptId, action: 'RESOLVE_FAILED', reference });
    return this.prisma.$transaction(async tx => {
      await lockFinancial(tx, `wallet-command:${context.actorUserId}:${key}`);
      const old = await tx.walletCommand.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId: context.actorUserId, idempotencyKey: key } } });
      if (old) { if (old.fingerprint !== hash) throw financialConflict('IDEMPOTENCY_KEY_REUSED'); return old.response; }
      await this.billing.lockIntent(tx, pointer.intentId);
      const attempt = await tx.billingGatewayAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      if (attempt.status !== 'REQUIRES_RECONCILIATION') throw financialConflict();
      const updated = await tx.billingGatewayAttempt.update({ where: { id: attemptId }, data: { status: 'FAILED', resultCode: 'MANUAL_FAILED' } });
      await financialAudit(tx, context, 'BILLING_ATTEMPT_RECONCILED_FAILED', attemptId, { evidenceReference: reference });
      const response = this.view(updated);
      await tx.walletCommand.create({ data: { actorUserId: context.actorUserId, idempotencyKey: key, fingerprint: hash, response } });
      return response;
    });
  }

  private async recoverCallbackToken(attemptId: string, token: string) {
    const attempt = await this.prisma.billingGatewayAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { revision: { include: { config: true, credentialVersion: true } } } });
    if (!attempt.revision.credentialVersion) throw financialConflict();
    let proof;
    try { proof = await this.registry.resolve(attempt.revision.config.providerCode).verifyPayment({ token, credential: this.credential(attempt.revision.credentialVersion), providerOrderId: attempt.providerOrderId }); }
    catch { await this.ambiguous(attemptId, 'VERIFY_TIMEOUT'); return; }
    if (!['0', '100'].includes(proof.resultCode) || proof.providerOrderId !== attempt.providerOrderId || proof.amount !== attempt.amountRial) throw financialConflict('PAYMENT_VERIFICATION_MISMATCH');
    const intent = await this.prisma.billingIntent.findUniqueOrThrow({ where: { id: attempt.intentId } });
    const eligible = intent.purpose === 'TOPUP' ? true : await this.targets.get(intent.purpose).validateSettlement?.(intent) ?? true;
    await this.prisma.$transaction(async tx => {
      await this.billing.lockIntent(tx, attempt.intentId);
      const current = await tx.billingGatewayAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      if (current.status === 'VERIFIED') return;
      if (current.providerToken && current.providerToken !== token) throw financialConflict('PAYMENT_VERIFICATION_MISMATCH');
      await tx.billingGatewayAttempt.update({ where: { id: attemptId }, data: { providerToken: token, status: 'VERIFYING' } });
      await this.billing.settleGateway(tx, attemptId, { ...proof, providerOrderId: proof.providerOrderId!, amount: proof.amount! }, eligible);
    }, { timeout: 15_000 });
  }

  async maintain(limit = 10) {
    const before = new Date(Date.now() - 60_000);
    await this.prisma.billingGatewayAttempt.updateMany({ where: { status: 'CREATED', updatedAt: { lt: before } }, data: { status: 'REQUIRES_RECONCILIATION', resultCode: 'REQUEST_AMBIGUOUS' } });
    const attempts = await this.prisma.billingGatewayAttempt.findMany({ where: { status: { in: pendingAttempts.filter(x => x !== 'CREATED' && x !== 'REDIRECT_READY') }, providerToken: { not: null }, updatedAt: { lt: before } }, orderBy: { updatedAt: 'asc' }, take: limit });
    for (const attempt of attempts) await this.verify(attempt.id);
    return attempts.length;
  }

  private ambiguous(id: string, code: string) { return this.prisma.billingGatewayAttempt.updateMany({ where: { id, status: { not: 'VERIFIED' } }, data: { status: 'REQUIRES_RECONCILIATION', resultCode: code } }); }
  private credential(version: PaymentProviderCredentialVersion) { return this.crypto.decrypt({ encryptedPayload: version.encryptedPayload ? Buffer.from(version.encryptedPayload) : null, encryptionNonce: version.encryptionNonce ? Buffer.from(version.encryptionNonce) : null, authenticationTag: version.authenticationTag ? Buffer.from(version.authenticationTag) : null, encryptionKeyVersion: version.encryptionKeyVersion }); }
  private view(attempt: { id: string; intentId: string; status: string; providerToken: string | null; amountRial: bigint }) {
    return { id: attempt.id, intentId: attempt.intentId, status: attempt.status, amountRial: attempt.amountRial.toString(), currency: 'IRR', redirectUrl: attempt.status === 'REDIRECT_READY' && attempt.providerToken && this.runtime.live ? buildSadadRedirect(this.runtime.settings().redirectProfile, attempt.providerToken) : null };
  }
}
